(function(ns) {
	/**
	* A function that can be used for accessing and identifying slack files
	*/
	var SlackFiles = function() {
		var self = this;

		/**
		* The unfurl types that the stacktodo server will respond to
		*/
		self.UNFURL_TYPES = {
			IMAGE : 'image',
			ANY : undefined
		};

		/**
		* @param url: the url to test
		* @return true if the url is a slack url
		*/
		self.isSlackFileUrl = function(url) {
			if (url.indexOf('https://files.slack.com/') === 0) {
				return true;
			} else if (url.indexOf('https://slack-files.com/') === 0) {
				return true;
			} else if (url.indexOf('https://') === 0 && url.indexOf('slack.com/files/') !== -1) {
				return true;
			} else {
				return false;
			}
		};

		/**
		* Generates an unfurl url for the given url
		* @param url: the url to generate the unfurl url for
		* @param allowedType=undefined: the restriction on type of url to respond for
		* @return a url that can be used in the dom for fetching the file
		*/
		self.generateUnfurlUrl = function(url, allowedType) {
			var query = 'url=' + encodeURIComponent(url);
			query += allowedType === undefined ? '' : '&allowed=' + encodeURIComponent(allowedType)
			return 'https://stacktodo.com/api/slack/resource/unfurl/file?' + query
		};

		return self;
	};

	ns.stacktodo = ns.stacktodo || {};
	ns.stacktodo.slackFiles = new SlackFiles();
})(window);