/**
* Stacktodo JavaScript API. Version 0.0.1.
* https://github.com/stacktodo/stacktodo_js_api
* MIT License
*/
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
(function(ns) {
	
	/**
	* Form utility
	* Wraps up some form utilities
	*/
	var Form = function() {
		var self = this;

		/**
		* Serializes a form
		* @param formElement: the form element to serialize
		* @return a map of key to value
		*/
		self.serialize = function(formElement) {
			var values = { };
			var elems = {
				input  		: formElement.getElementsByTagName('input'),
				textarea 	: formElement.getElementsByTagName('textarea'),
				select 		: formElement.getElementsByTagName('select')
			};

			// Serialize inputs
			for (var i = 0; i < elems.input.length; i++) {
				var name = elems.input[i].name;
				if (name === undefined || name.length === 0) { continue; }
				var type = elems.input[i].type;

				if (type === 'checkbox') {
					if (elems.input[i].checked) {
						values[name] = values[name] || [];
						values[name].push(elems.input[i].value);
					}
				} else if (type === 'radio') {
					if (elems.input[i].checked) {
						values[name] = values[elems.input[i].value];
					}
				} else {
					values[name] = values[name] || [];
					values[name].push(elems.input[i].value);
				}
			}

			// Serialize textareas
			for (var t = 0; t < elems.textarea.length; t++) {
				var name = elems.textarea[t].name;
				if (name === undefined || name.length === 0) { continue; }
				values[name] = values[name] || [];
				values[name].push(elems.textarea[t].value);
			}

			// Serialize selects
			for (var s = 0; i < elems.select.length; s++) {
				var name = elems.select[s].name;
				if (name === undefined || name.length === 0) { continue; }

				var options = elems.select[s].getElementsByTagName('option');
				for (var o = 0; o < options.length; o++) {
					if (options[o].selected) {
						values[name] = values[name] || [];
						values[name].push(options[o].value)
						break;
					}
				}
			}

			// Reduce the values with a single value to be straight values
			for (var k in values) {
				if (values[k].length === 1) {
					values[k] = values[k][0];
				}
			}

			return values
		};

		return self;
	};
	
	ns.stacktodo = ns.stacktodo || {};
	ns.stacktodo.core = ns.stacktodo.core || {};
	ns.stacktodo.core.form = new Form();
})(window);
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
(function(ns) {
	/**
	* An instance that can be called up to submit a form into slack
	* @param formId: the id of the form record on stacktodo
	*/
	var SlackForm = function(formId) {
		var self = this;

		/**
		* Error mapping
		*/
		self.ERRORS = {
			EmptyFormError 			: 'EmptyFormError',
			UnknownFormError 		: 'UnknownFormError',
			UnknownError 			: 'UnknownError'
		};

		/**
		* Humanzed versions of the errors
		*/
		self.HUMANIZED_ERRORS = {
			EmptyFormError 			: 'Looks like you forgot to complete the form. Can you check it and try again?',
			UnknownFormError 		: 'We couldn\'t find the form channel you\'re trying to send to :-(',
			UnknownError 			: 'Something went wrong and we\'re not quite sure what. We\'ll look into it as soon as possible!'
		};

		/**
		* Humanizes the errror into a suggested error message
		*/
		self.humanizeError = function(error) {
			return self.HUMANIZED_ERRORS[error] || self.HUMANIZED_ERRORS.UNKNOWN_ERROR;
		};

		/**
		* Prevalidates the form
		* @param values: the email to validate
		* @return self.ERRROS. or null if no errors are found
		*/
		self.preValidate = function(values) {
			var count = 0;
			for (var k in values) { return null; }
			return self.ERRORS.EmptyFormError;
		};

		/**
		* Send the form to slack
		* @param form: the form to submit
		* @param success: [optional] executed on join success
		* @param failure: [optional] executed on join failure. Provided with `error` from self.ERRORS
		* @param complete: [optional] executed on completion after success or failure
		*/
		self.submit = function(form, success, failure, complete) {
			success = success || function() { };
			failure = failure || function() { };
			complete = complete || function() { };

			var formData = ns.stacktodo.core.form.serialize(form);

			var validationError = self.preValidate(form);
			if (validationError === null) {
				ns.stacktodo.core.jsoncors.post({
					url 		: 'https://stacktodo.com/api/tool/form/submit',
					payload 	: { id:formId, form:formData },
					success 	: function(response, status, xhr) {
						success();
						complete();
					},
					failure 	: function(status, error, xhr) {
						if (!error) {
							switch(status) {
								case 404: error = self.ERRORS.UnknownFormError; break;
								default: error = self.ERRORS.UnknownError; break;
							}
						}
						failure(error);
						complete();
					}
				})
			} else {
				failure(validationError)
				complete();
			}
		};

		return this;
	};

	ns.stacktodo = ns.stacktodo || {};
	ns.stacktodo.SlackForm = SlackForm;
})(window);
(function(ns) {
	/**
	* An instance that can be called up to invite a user to join slack
	* @dependency: stacktodo.core.jsoncors
	* @param slackTeam: the name of the slackTeam e.g. `slacktodo`
	*/
	var SlackInvite = function(slackTeam) {
		var self = this;

		/**
		* Error mapping
		*/
		self.ERRORS = {
			MissingEmailError 	: 'MissingEmailError',
			InvalidEmailError 	: 'InvalidEmailError',
			UnknownTeamError 	: 'UnknownTeamError',
			UnknownError 		: 'UnknownError'
		};

		/**
		* Status mapping
		*/
		self.STATUSES = {
			RequestedAuthState 	: 'RequestedAuthState',
			InvitedUserState 	: 'InvitedUserState'
		};

		/**
		* Humanzed versions of the errors
		*/
		self.HUMANIZED_ERRORS = {
			MissingEmailError 	: 'Your email is looking awfully blank, if you fill it in we can get you started',
			InvalidEmailError 	: 'Your email doesn\'t quite look right. Can you check it and try again?',
			UnknownTeamError 	: 'We couldn\'t find the team you\'re trying to join :-(',
			UnknownError 		: 'Something went wrong and we\'re not quite sure what. We\'ll look into it as soon as possible!'
		};

		/**
		* Humanized versions of the statuses
		*/
		self.HUMANIZED_STATUSES = {
			RequestedAuthState 	: 'Awesome your email address has been sent for approval. You should receive an invitation email from slack once you\'ve been approved',
			InvitedUserState 	: 'Awesome you\'ve been invited into the team. Check your inbox for the invitation email from slack!'
		};

		/**
		* Humanizes the errror into a suggested error message
		*/
		self.humanizeError = function(error) {
			return self.HUMANIZED_ERRORS[error] || self.HUMANIZED_ERRORS.UNKNOWN_ERROR;
		};

		/**
		* Humanizes the state into a suggested status message
		*/
		self.humanizeStatus = function(status) {
			return self.HUMANIZED_STATUSES[status] || self.HUMANIZED_ERRORS.UNKNOWN_ERROR;
		};

		/**
		* Prevalidates the email
		* @param email: the email to validate
		* @return self.ERRROS. or null if no errors are found
		*/
		self.preValidate = function(email) {
			if (!email || email.length === 0) {
				return self.ERRORS.MissingEmailError;
			} else if (email.indexOf('@') === -1 || email.length < 7) {
				return self.ERRORS.InvalidEmailError;
			} else {
				return null;
			}
		};

		/**
		* Extends one map into another
		* @param a: the map to extend into
		* @param b: the map to extend from
		* @return a
		*/
		var extendMap = function(a, b) {
			for (var k in b) { a[k] = b[k]; }
			return a;
		};

		/**
		* Join the provided user to the slack team
		* @param email: the email address to join
		* @Param other_values: a dictionary of other values to submit
		* @param success: [optional] executed on join success
		* @param failure: [optional] executed on join failure. Provided with `error` from self.ERRORS
		* @param complete: [optional] executed on completion after success or failure
		*/
		self.join = function(email, other_values, success, failure, complete) {
			success = success || function() { };
			failure = failure || function() { };
			complete = complete || function() { };

			var validationError = self.preValidate(email);
			if (validationError === null) {
				ns.stacktodo.core.jsoncors.post({
					url 		: 'https://stacktodo.com/api/tool/invite/join',
					payload 	: extendMap(other_values, { email:email, team:slackTeam }),
					success 	: function(response, status, xhr) {
						success(response.state);
						complete();
					},
					failure 	: function(status, error, xhr) {
						if (!error) {
							switch(status) {
								case 404: error = self.ERRORS.UnknownTeamError; break;
								default: error = self.ERRORS.UnknownError; break;
							}
						}
						failure(error);
						complete();
					}
				})
			} else {
				failure(validationError)
				complete();
			}
		};

		return self;
	};

	ns.stacktodo = ns.stacktodo || {};
	ns.stacktodo.SlackInvite = SlackInvite;
})(window);
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

//# sourceMappingURL=stacktodo.js.map