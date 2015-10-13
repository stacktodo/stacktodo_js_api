(function(ns) {
	
	/**
	* AJAX Utility
	* Wraps up all the ajax stuff into a simple wrapper
	*/
	var AJAX = function() {
		var self = this;

		/********************************************************************************/
		// GET
		/********************************************************************************/

		/**
		* Performs a get on the given endpoint
		* @param url=/: the url to post to
		* @param success=undefined: executed on http success with the response
		* @param failure=undefined: executed on http failure
		* @param complete=undefined: executed after http success or failure
		* Returns the xhr object
		*/
		self.get = function(options) {
			options = {
				url 		: options.url || window.location.href,
				success 	: options.success || function() {},
				failure 	: options.failure || function() {},
				complete 	: options.complete || function() {}
			};

			var xhr;
			if (typeof XDomainRequest != 'undefined') {
				xhr = new XDomainRequest();
				xhr.open('GET', options.url);
			} else {
				xhr = new XMLHttpRequest();
				xhr.open('GET', options.url, true);
			}

			xhr.onload = function() {
				if (xhr.status >= 200 && xhr.status <= 299) {
					options.success(xhr.responseText, xhr.status, xhr);
				} else {
					options.failure(xhr.status, xhr.responseText, xhr);
				}
				options.complete();
		  	};

		  	xhr.onerror = function() {
		  		options.failure(xhr.status, undefined, xhr);
		  		options.complete();
		  	};

			xhr.send();
			return xhr;
		};
	};
	
	ns.stacktodo = ns.stacktodo || {};
	ns.stacktodo.core = ns.stacktodo.core || {};
	ns.stacktodo.core.ajax = new AJAX();
})(window);