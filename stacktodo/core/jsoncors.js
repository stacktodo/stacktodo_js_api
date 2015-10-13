(function(ns) {
	
	/**
	* JSON CORS utility
	* Wraps up all the cors stuff into a simple post or get. Falls back to jsonp
	*/
	var JSONCORS = function() {
		var self = this;
		var supportsCORS = ('withCredentials' in new XMLHttpRequest()) || (typeof XDomainRequest != 'undefined');

		/********************************************************************************/
		// Utils
		/********************************************************************************/

		/**
		* Serializes a dictionary into a url query
		* @param m: the map to serialize
		* @return the url query (no preceeding ?)
		*/
		var serializeURLQuery = function(m) {
			var args = [];
			for (var k in m) {
				args.push(encodeURIComponent(k) + '=' + encodeURIComponent(m[k]))
			}
			return args.join('&');
		};

		/********************************************************************************/
		// CORS
		/********************************************************************************/

		/**
		* Performs a CORS request which wraps the response through our marshalled API
		* @param url: the url to visit
		* @param method: GET|POST the http method
		* @param payload: the payload to send (undefined for GET)
		* @param success: executed on success. Given response then http status then xhr
		* @param failure: executed on failure. Given http status then error then xhr
		* @return the XHR object
		*/
		self.requestCORS = function(url, method, payload, success, failure) {
			method = method.toUpperCase();
			var xhr;
			if (typeof XDomainRequest != 'undefined') {
				xhr = new XDomainRequest();
				xhr.open(method, url);
			} else {
				xhr = new XMLHttpRequest();
				xhr.open(method, url, true);
			}

			xhr.onload = function() {
				var json;
				try { json = JSON.parse(xhr.responseText); } catch(e) { /* noop */ }
				var status = (json && json.http_status !== undefined) ? json.http_status : xhr.status;

				if (status >= 200 && status <= 299) {
					success(json, status, xhr);
				} else {
					failure(xhr.status, json ? json.error : undefined, xhr);
				}
		  	};

		  	xhr.onerror = function() {
		  		failure(xhr.status, undefined, xhr);
		  	};

			if (method === 'POST') {
				xhr.setRequestHeader("Content-type","application/json");
				xhr.send(JSON.stringify(payload));
			} else {
				xhr.send();
			}
			
			return xhr;
		};

		/********************************************************************************/
		// JSONP
		/********************************************************************************/

		/**
		* Performs a JSONP request which wraps the response through our marshalled API
		* @param url: the url to visit
		* @param method: GET|POST the http method
		* @param payload: the payload to send (undefined for GET)
		* @param success: executed on success. Given response then http status then xhr
		* @param failure: executed on failure. Given http status then error then xhr
		* @return the XHR object
		*/
		self.requestJSONP = function(url, method, payload, success, failure) {
			method = method.toUpperCase();

			var jsonp = document.createElement('script');
			jsonp.type = 'text/javascript';

			// Success callback
			var id = '__jsonp_' + Math.ceil(Math.random() * 10000);
			var dxhr = { jsonp:true, id:id, response:undefined };
			window[id] = function(r) {
				jsonp.parentElement.removeChild(jsonp);
				delete window[id];
				dxhr.response = r;

				if (r === undefined || r === null) {
					success(undefined, 200, dxhr);
				} else {
					if (r.http_status >= 200 && r.http_status <= 299) {
						success(r, r.http_status, dxhr);
					} else {
						failure(r.http_status, r.error, dxhr);
					}
				}
			};

			// Error callback
			jsonp.onerror = function() {
				jsonp.parentElement.removeChild(jsonp);
				dxhr.jsonp_transport_error = 'ScriptErrorFailure';
				failure(0, undefined, dxhr);
			};

			var urlQuery;
			if (method === 'POST') {
				urlQuery = '?' + serializeURLQuery(payload) + '&callback=' + id + '&_=' + new Date().getTime();
			} else {
				urlQuery = '?' + 'callback=' + id + '&_=' + new Date().getTime();
			}

			jsonp.src = url + urlQuery;
			document.head.appendChild(jsonp);

			return dxhr;
		};

		/********************************************************************************/
		// GET
		/********************************************************************************/

		/**
		* Makes a get request
		* @param url=/: the url to post to
		* @param success=undefined: executed on http success with the response
		* @param failure=undefined: executed on http failure
		* @param complete=undefined: executed after http success or failure
		* Returns either the xhr request or a jsonp holding object
		*/
		self.get = function(options) {
			var method = supportsCORS ? 'requestCORS' : 'requestJSONP';
			return self[method](options.url || window.location.href, 'GET', undefined, function(response, status, xhr) {
				if (options.success) { options.success(response, status, xhr); }
				if (options.complete) { options.complete(); }
			}, function(status, error, xhr) {
				if (options.failure) { options.failure(status, error, xhr); }
				if (options.complete) { options.complete(); }
			});
		};

		/********************************************************************************/
		// POST
		/********************************************************************************/

		/**
		* Makes a post request
		* @param url=/: the url to post to
		* @param payload={}: the payload to send
		* @param success=undefined: executed on http success with the response
		* @param failure=undefined: executed on http failure
		* @param complete=undefined: executed after http success or failure
		* Returns either the xhr request or a jsonp holding object
		*/
		self.post = function(options) {
			var method = supportsCORS ? 'requestCORS' : 'requestJSONP';
			return self[method](options.url || window.location.href, 'POST', options.payload || {}, function(response, status, xhr) {
				if (options.success) { options.success(response, status, xhr); }
				if (options.complete) { options.complete(); }
			}, function(status, error, xhr) {
				if (options.failure) { options.failure(status, error, xhr); }
				if (options.complete) { options.complete(); }
			});
		};

		return self;
	};
	
	ns.stacktodo = ns.stacktodo || {};
	ns.stacktodo.core = ns.stacktodo.core || {};
	ns.stacktodo.core.jsoncors = new JSONCORS();
})(window);