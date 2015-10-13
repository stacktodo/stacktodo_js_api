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
		var index = null;
		var posts = {};

		self.loaded = function() { return index !== null; };
		self.count = function() { return index === null ? undefined : index.length; };
		self.urlAt = function(i) { return index === null ? undefined : index[i]; };

		/**
		* Loads the blog index from stacktodo
		* @param success=undefined: executed on success
		* @param failure=undefined: executed on failure, given the http status and error
		*/
		self.load = function(success, failure) {
			ns.stacktodo.core.jsoncors.get({
				url 			: 'https://stacktodo.com/api/tool/publish/posts' + indexUrlQuery,
				success			: function(response, status, xhr) {
					index = response.posts;
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
		* @param index: the index of the post to load
		* @param success=undefined: executed on load success. Provided with the html
		* @param failure=undefined: executed on load failure
		*/
		self.post = function(index, success, failure) {
			success = success || function() {};
			failure = failure || function() {};

			if (posts[index]) {
				setTimeout(function() { success(posts[index]); }, 1);
			} else {
				var url = self.urlAt(index);
				if (url === undefined) {
					setTimeout(function() { failure(-1, 'IndexNotLoadedError'); });
				} else {
					ns.stacktodo.core.ajax.get({
						url 		: url + '?ts=' + new Date().getTime(),
						success 	: function(response, status, xhr) {
							// Parse and sanitize the response
							try {
								response = JSON.parse(response);
							} catch(ex) {
								failure(-1, 'JSONParseError');
								return;
							}
							response.html = response.html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

							// Save and respond
							posts[index] = response;
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
		* @param startIndex: the index of the first post to load
		* @param endIndex: the index of the last post to load
		* @param success=undefined: executed on load success. Provided with a list of html strings
		* @param failure=undefined: executed on load failure
		*/
		self.postset = function(startIndex, endIndex, success, failure) {
			success = success || function() {};
			failure = failure || function() {};
			startIndex = Math.min(Math.max(0, startIndex), self.count());
			endIndex = Math.min(Math.max(0, endIndex), self.count());

			// Check we have something to do
			if (startIndex === 0 && endIndex === 0) {
				success({}); return;
			}
			if (startIndex === self.count() && endIndex === self.count()) {
				success({}); return;
			}

			// Setup our return map
			var hasError = false;
			var requests = {};
			for (var i = startIndex; i < endIndex; i++) {
				requests[i] = null;
			}

			// Fire all the requests off (the browser will limit the quantity we are able to make here)
			for (var i = startIndex; i < endIndex; i++) {
				(function(i) {
					self.post(i, function(html) {
						if (hasError) { return; }
						requests[i] = html;
						var hasWaiting = false;
						for (var k in requests) {
							if (requests[k] === null) {
								hasWaiting = true;
								break;
							}
						}
						if (!hasWaiting) {
							success(requests);
						}
					}, function(status, error) {
						if (hasError) { return; }
						hasError = true;
						failure(status, error);
					});
				})(i);
			}			
		};

		return self;
	};

	ns.stacktodo = ns.stacktodo || {};
	ns.stacktodo.SlackPublish = SlackPublish;
})(window);