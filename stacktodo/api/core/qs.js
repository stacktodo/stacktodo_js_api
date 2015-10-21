(function(ns) {
	
	var QS = function() {
		var self = this;

		/**
		* Fetches arguments from a url string
		* @param key: the name of the argument
		* @param url=window.location.href: the url to get from
		* @return the value or undefined if it does not exist
		*/
		self.urlArg = function(key, url) {
			url = url || window.location.href;
			key = key.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
			var regexS = "[\\?&]" + key + "=([^&#]*)";
			var regex = new RegExp(regexS);
			var results = regex.exec(url);
			if(results == null) {
				return undefined;
			} else {
				return decodeURIComponent(results[1]);
			}
		};

		return self;
	};
	
	ns.stacktodo = ns.stacktodo || {};
	ns.stacktodo.core = ns.stacktodo.core || {};
	ns.stacktodo.core.qs = new QS();
})(window);