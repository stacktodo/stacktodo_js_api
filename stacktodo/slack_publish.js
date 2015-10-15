(function(ns) {
	/**
	* An instance that can be used to access a blog from stacktodo
	* @argumentset 1
	* 	@param taskId: the id of the task to connect to
	* @argumentset 2
	*	@param team: the name of the team
	* 	@param reference: the reference of the blog
	*/
	var SlackPublish = function() {
		var self = this;
		var indexUrlQuery = (function(args) {
			switch(args.length) {
				case 1: return '?id=' + encodeURIComponent(args[0]);
				case 2: return '?team=' + encodeURIComponent(args[0]) + '&reference=' + encodeURIComponent(args[1]);
				default: throw('InitializationError : Incorrect params');
			}
		})(Array.prototype.slice.call(arguments));
		var postsIndex = null;
		var posts = {};

		/**
		* @GETTER
		* @return true if the posts index has been loaded
		*/
		self.loaded = function() { return postsIndex !== null; };

		/**
		* @GETTER
		* @return the amount of posts in the index
		*/
		self.count = function() { return postsIndex === null ? undefined : postsIndex.length; };

		/**
		* @GETTER
		* @param postId: the id of the post to get
		* @return the post head or undefined if not found
		*/
		self.postHeadForId = function(postId) {
			for (var i = 0; i < (postsIndex || []).length; i++) {
				if (postsIndex[i].id === postId) { return postsIndex[i]; }
			}
			return undefined;
		};

		/**
		* @GETTER
		* @param index: the index for the post
		* @return the post head or undefined if not found
		*/
		self.postHeadForIndex = function(index) { return postsIndex === null ? undefined : postsIndex[i]; };

		/**
		* @GETTER
		* @param postId: the id of the post
		* @return true or false if this id is the last post
		*/
		self.isPostIdLast = function(postId) {
			if (postsIndex === null) { return false; }
			if (postsIndex.length === 0) { return false; }
			return postsIndex[postsIndex.length - 1].id === postId;
		};

		/**
		* @GETTER
		* @param lastPostId=null: the id of the previous post that you want to start from
		* @param count: the number of items to get
		* @return a list of posts to fetch or undefiend if the posts index is not loaded
		*/
		self.nextPostHeadsForRange = function(lastPostId, count) {
			if (postsIndex === null) { return undefined; }

			// Get the start
			var start = 0;
			if (lastPostId) {
				for (var i = 0; i < postsIndex.length; i++) {
					if (postsIndex[i].id === lastPostId) {
						start = i + 1;
						break;
					}
				}
			}
			start = Math.min(Math.max(0, start), self.count());

			// Get the end
			var end = Math.min(Math.max(0, start + count), self.count());

			// Get the list of posts
			var items = [];
			for (var i = start; i < end; i++) {
				items.push(postsIndex[i]);
			}

			return items;
		};



		

		/**
		* Loads the blog index from stacktodo
		* @param success=undefined: executed on success
		* @param failure=undefined: executed on failure, given the http status and error
		* @return self
		*/
		self.load = function(success, failure) {
			ns.stacktodo.core.jsoncors.get({
				url 			: 'https://stacktodo.com/api/tool/publish/posts' + indexUrlQuery,
				success			: function(response, status, xhr) {
					postsIndex = response.posts;
					// Enhance the posts slightly
					for (var i = 0; i < postsIndex.length; i++) {
						postsIndex[i].index = i;
					}
					if (success) { success(); }
				},
				failure 		: function(status, error, xhr) {
					if (failure) { failure(status, error); }
				}
			});
			return self;
		};

		/**
		* Loads a post at the given index
		* @param postId: the id of the post to load
		* @param success=undefined: executed on load success. Provided with the html
		* @param failure=undefined: executed on load failure
		* @return self
		*/
		self.postForIndex = function(index, success, failure) {
			var head = self.postHeadForIndex(index);
			return self.postForId((head || {}).id, success, failure);
		};

		/**
		* Loads a post at the given index
		* @param postId: the id of the post to load
		* @param success=undefined: executed on load success. Provided with the html
		* @param failure=undefined: executed on load failure
		* @return self
		*/
		self.postForId = function(postId, success, failure) {
			success = success || function() {};
			failure = failure || function() {};

			if (posts[postId]) {
				setTimeout(function() { success(posts[postId]); }, 1);
			} else {
				var head = self.postHeadForId(postId);
				if (head === undefined) {
					setTimeout(function() { failure(-1, 'IndexNotLoadedError'); });
				} else {
					ns.stacktodo.core.ajax.get({
						url 		: head.url + '?ts=' + new Date().getTime(),
						success 	: function(response, status, xhr) {
							try {
								response = JSON.parse(response);
							} catch(ex) {
								failure(-1, 'JSONParseError');
								return;
							}
							// Enhance the post
							response.html = response.html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
							response.id = head.id;
							response.url = head.url;
							response.index = head.index;

							// Save and respond
							posts[postId] = response;
							success(response);
						},
						failure 	: function(status, error, xhr) {
							failure(status, error);
						}
					})
				}
			}
			return self;
		};

		/**
		* Loads a set of posts. Silently validates if the start or end falls outside the bounds of posts
		* @param lastId=null: the id of the last post. This will load the next one
		* @param count: the number of posts to load
		* @param success=undefined: executed on load success. Provided with a list of html strings
		* @param failure=undefined: executed on load failure
		* @return self
		*/
		self.postset = function(lastId, count, success, failure) {
			success = success || function() {};
			failure = failure || function() {};

			var heads = self.nextPostHeadsForRange(lastId, count);
			if (heads === undefined) {
				setTimeout(function() { failure(-1, 'IndexNotLoadedError'); });
			} else if (heads.length === 0) {
				setTimeout(function() { success({}); });
			} else {
				// Setup our return map
				var hasError = false;
				var requests = {};
				for (var i = 0; i < heads.length; i++) {
					requests[heads[i].id] = null;
				}

				// Fire all the requests off (the browser will limit the quantity we are able to make here)
				for (var i = 0; i < heads.length; i++) {
					(function(id, url) {
						self.postForId(id, function(post) {
							if (hasError) { return; }
							requests[id] = post;

							for (var k in requests) {
								if (requests[k] === null) { return; }
							}

							// Catch the final one here
							success(requests);
						}, function(status, error) {
							if (hasError) { return; }
							hasError = true;
							failure(status, error);
						});
					})(heads[i].id, heads[i].url);
				}
			}

			return self;
		};

		/**
		* Invalidates a post so it will be refetched from the server next time it's called
		* @param postId: the id of the post to invalidate
		* @return self
		*/
		self.invalidatePost = function(postId) { delete posts[postId]; return self; };

		/**
		* Invalidates all the posts so they must be refetched from the server
		* @return self
		*/
		self.invalidatePosts = function() { posts = {}; return self; }

		/**
		* Invalidates the index so it must be refetched from the server
		* @return self
		*/
		self.invalidateIndex = function() { postsIndex = null; return self; };

		return self;
	};

	ns.stacktodo = ns.stacktodo || {};
	ns.stacktodo.SlackPublish = SlackPublish;
})(window);