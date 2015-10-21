(function(ns) {
	/**
	* The templates used in the publisher
	* @param overwrites: a map of functions that can overwrite the defaults
	*/
	var Templates = function(overwrites) {
		var self = this;

		var D = ns.stacktodo.uicore.dom;

		/**
		* Renders the error element
		* @return the dom element
		*/
		self.error = function() {
			return D.parse([
				'<div data-item="error" class="s2do-error">',
					'<strong>Oh no!</strong> Something\'s gone wrong',
				'</div>'
			]);
		};

		/**
		* Renders the no posts element
		* @return the dom element
		*/
		self.noPosts = function() {
			return D.parse('<div data-item="no-posts" class="s2do-no-posts">No posts here :-(</div>');
		};

		/**
		* Renders the loading element
		* @return the dom element
		*/
		self.loading = function() {
			return D.parse('<div data-item="loader" class="s2do-loading">Loading...</div>');
		};

		/**
		* Renders a post
		* @param post: the post to render
		* @return the dom element
		*/
		self.post = function(post) {
			var postBody = D.removeScripts(post.html);
			postBody = ns.stacktodo.ui.emoji.saltHtmlIntoString(postBody);
			var dom = D.parse([
				'<div class="s2do-post" data-item="post" data-post-index="' + post.index + '" data-post-id="' + post.id + '">',
					'<div class="s2do-post-heading">',
						'<h1>' + post.title + '</h1>',
						'<div class="s2do-post-time">' + self.humanizeTimestamp(post.ts) + '</div>',
						'<div class="s2do-post-author">',
							'<img class="s2do-post-author-avatar" src="' + post.author.icon + '" alt="' + post.author.username + '" />',
							'by ' + post.author.username + ', Posted from Slack',
						'</div>',
					'</div>',
					'<div class="s2do-post-body">',
						postBody,
					'</div>',
				'</div>'
			]);

			return ns.stacktodo.ui.slackUnfurler.unfurl(dom);
		};

		/**
		* Converts a slack timestamp to a humain readable string
		* @param timestamp: the timestamp from slack (epoch / 1000)
		* @return the humanized version of the string
		*/
		self.humanizeTimestamp = function(timestamp) {
			var date = new Date(timestamp * 1000);
			var day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
			var month = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][date.getMonth()];
			var dateSuffix = ({'1':'st', '2':'nd', '3':'rd'})[String(date.getDate())[date.getDate() < 10 ? 0 : 1 ]];
			dateSuffix = dateSuffix === undefined ? 'th' : dateSuffix;
			return [
				day,
				date.getDate() + dateSuffix,
				month,
				date.getFullYear()
			].join(' ');
		};

		// Load in the overwrites
		for (var k in overwrites || {}) {
			self[k] = overwrites[k];
		}

		return self;
	};


	/**
	* An instance that can be used to access a blog from stacktodo
	* @param elem: the element to run within
	* @param options: a map with the following
	* 		@param blog: the id of the task or [team, reference] which indicates who to connect to
	* 		@param templates=undefined: a map with any template handlers you want to overwrite
	*/
	var SlackPublishUI = function(elem, options) {
		var self = this;

		// Setup all our variables
		var D = ns.stacktodo.uicore.dom;
		var Q = {
			container : function() { return elem; },
			posts : function() { return elem.querySelectorAll('[data-item="post"]'); },
			isLoading : function() { return Q.loading().length !== 0; },
			loading : function() { return elem.querySelectorAll('[data-item="loader"]') },
			postWithId : function(postId) { return elem.querySelector('[data-item="post"][data-post-id="' + postId + '"]'); }
		};
		var publish = (function(blog) {
			if (typeof(blog) === 'string') {
				return new ns.stacktodo.SlackPublish(blog);
			} else {
				return new ns.stacktodo.SlackPublish(blog[0], blog[1]);
			}
		})(options.blog);
		var templates = new Templates(options.templates);

		/**
		* @returns the slack publish instance that's being used
		*/
		self.publish = function() { return publish; };

		/**
		* Sorts a set of incoming posts into order then renders them into the container
		* @param posts: the posts to render
		*/
		var sortAndRenderNewPosts = function(posts) {
			// Sort them
			var postList = [];
			for (var k in posts) { postList.push(posts[k]); }
			postList = postList.sort(function(a, b) { return parseInt(a.index) > parseInt(b.index); })

			// Render them
			for (var i = 0; i < postList.length; i++) {
				Q.container().appendChild(templates.post(postList[i]));
			}
		}

		/**
		* Loads the initial post set into the dom
		* @param complete=undefined: executed on complete
		* @return self
		*/
		var loadInitialPostSet = function(complete) {
			complete = complete || function() { };

			D.empty(Q.container());
			Q.container().appendChild(templates.loading());

			publish.load(function() {
				if (publish.count() === 0) {
					D.remove(Q.loading());
					Q.container().appendChild(templates.noposts());
				} else {
					publish.postset(null, 5, function(posts) {
						D.remove(Q.loading());
						sortAndRenderNewPosts(posts);
						complete(true);
					}, function() {
						D.remove(Q.loading());
						Q.container().appendChild(templates.error());
						complete(false);
					});
				}
			}, function() {
				D.remove(Q.loading());
				Q.container().appendChild(templates.error());
				complete(false);
			});

			return self;
		};

		/**
		* Binds the change listeners
		*/
		var bindDOMChangeListeners = function() {
			// Bind to scroll events to fetch more
			window.addEventListener('scroll', function(evt) {
				// Check to see if we should load
				if (Q.isLoading()) { return; }
				if ((window.innerHeight + window.scrollY) < D.documentHeight() - 50) { return; }
				//if (window.scrollY > document.body.offsetHeight - 50) { return; }
				if (!publish.count()) { return; }

				// Check to see if we already have the last element
				var posts = Q.posts();
				var lastPost = posts[posts.length - 1];
				if (lastPost && publish.isPostIdLast(lastPost.getAttribute('data-post-id'))) { return; }

				// We've established that we should now load so lets get to it
				Q.container().appendChild(templates.loading());
				setTimeout(function() {
					publish.postset(lastPost.getAttribute('data-post-id'), 5, function(posts) {
						D.remove(Q.loading());
						sortAndRenderNewPosts(posts);
					}, function() {
						D.remove(Q.loading());
						Q.container().appendChild(templates.error());
					});
				}, 500);
			}, false);
		};

		/**
		* Reloads all the posts from the server
		* @param complete=undefined: executed on completion
		* @return self
		*/
		self.reloadAllPosts = function(complete) {
			publish.invalidateIndex().invalidatePosts();
			loadInitialPostSet(complete);
			return self;
		};

		/**
		* Reloads an individual post with the given id
		* @param postId: the id of the post to reload
		* @param complete=undefined: executed on completion
		* @return self
		*/
		self.reloadPostWithId = function(postId, complete) {
			var elem = Q.postWithId(postId);
			if (elem) {
				publish.invalidatePost(postId).postForId(postId, function(post) {
					elem.parentElement.replaceChild(templates.post(post), elem);
				}, function() {
					elem.parentElement.replaceChild(templates.error(), elem);
				});
			}
			return self;
		};

		// Set ourselves up!
		Q.container().classList.add('s2do-ui-publish');
		loadInitialPostSet(bindDOMChangeListeners);

		return self;
	};

	ns.stacktodo = ns.stacktodo || {};
	ns.stacktodo.ui = ns.stacktodo.ui || {};
	ns.stacktodo.ui.SlackPublish = SlackPublishUI;
	ns.stacktodo.ui.SlackPublishTemplates = Templates;
})(window);