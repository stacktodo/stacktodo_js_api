/**
* Stacktodo JavaScript API. Version 0.0.3.
* https://github.com/stacktodo/stacktodo_js_api
* MIT License
*/
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

		return self;
	};
	
	ns.stacktodo = ns.stacktodo || {};
	ns.stacktodo.core = ns.stacktodo.core || {};
	ns.stacktodo.core.ajax = new AJAX();
})(window);
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
(function(ns) {
	
	/**
	* DOM Utility
	* Wraps up some common DOM tasks so that we don't need to keep writing them in code
	*/
	var DOM = function() {
		var self = this;

		/**
		* Parses a html string and returns a dom element
		* @param html: the html to parse
		* @return a dom element from the html
		*/
		self.parse = function(html) {
			if (typeof(html) === 'object' && html.length !== undefined) {
				html = html.join('\n');
			}

			var parser = document.createElement('div');
			parser.innerHTML = html;
			if (parser.children.length !== 1) {
				throw "ParserOnlyAcceptsSingleChild : Please supply only one dom node to the parser"
			}
			return parser.children[0];
		};

		/**
		* Removes a set of elements from the dom
		* @param elems: the element to remove
		* @return elems;
		*/
		self.remove = function(elems) {
			if (!elems) { return elems; }
			for (var i = 0; i < elems.length; i++) {
				elems[i].parentElement.removeChild(elems[i]);
			}
			return elems;
		};

		/**
		* Sets an attribute on a set of elements
		* @param elems: the elements to add the attribue to
		* @param key: the key of the attribute to add
		* @param value: the value of the attribute
		* @return elems;
		*/
		self.setAttr = function(elems, key, value) {
			if (!elems) { return elems; }
			for (var i = 0; i < elems.length; i++) {
				elems[i].setAttribute(key, value);
			}
			return elems;
		};

		/**
		* Removes an attribute from a set of elements
		* @param elems: the element to remove the attribue from
		* @param key: the key of the attribute to remove
		* @return elems;
		*/
		self.removeAttr = function(elems, key) {
			if (!elems) { return elems; }
			for (var i = 0; i < elems.length; i++) {
				elems[i].removeAttribute(key);
			}
			return elems;
		};

		/**
		* Empties all the contents from an element
		* @param elem: the element to empty
		* @return elem
		*/
		self.empty = function(elem) {
			elem.innerHTML = '';
			return elem;
		};

		/**
		* Removes scripts from a html string or dom struct
		* @param htmlOrDom: the html or dom to remove the scripts from
		* @return the html string or dom without the script tags
		*/
		self.removeScripts = function(htmlOrDom) {
			if (typeof(htmlOrDom) === 'string') {
				return htmlOrDom.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
			} else {
				return self.remove(htmlOrDom.querySelectorAll('script'));
			}
		};

		/**
		*  @return the calculated height of the document
		*/
		self.documentHeight = function() {
			var body = document.body;
			var html = document.body.parentElement;
			return Math.max(
				body.scrollHeight,
				body.offsetHeight, 
				html.clientHeight,
				html.scrollHeight,
				html.offsetHeight);
		};

		/**
		* Iterates a set of dom elements
		* @param elems: the elements to iterate
		* @param fn: the function to be called on each. Given {item, index}
		* @return elems
		*/
		self.iter = function(elems, fn) {
			if (!elems) { return elems; }
			for (var i = 0; i < elems.length; i++) {
				fn(elems[i], i);
			}
			return elems;
		};

		/**
		* Removes a value from elements
		* @param elems: the elements to remove the value from
		* @return elems
		*/
		self.removeValue = function(elems) {
			if (!elems) { return elems; }
			for (var i = 0; i < elems.length; i++) {
				if (elems[i].tagName === 'select') {
					self.removeAttr(elems[i].querySelectorAll('option'), 'selected');
				} else if (elems[i].tagName === 'textarea') {
					elems[i].value = '';
				} else if (elems[i].tagName === 'input') {
					switch(elems[i].type) {
						case 'radio':
						case 'checkbox':
							elems[i].removeAttribute('checked');
							break;
						default:
							elems[i].value = '';
							break;
					}
				}
			}
			return elems;
		};

		/**
		* Prepends a node to a parent
		* @param newNode: the new node to prepend
		* @param parent: the parent to prepend to
		* @return newNode
		*/
		self.prepend = function(newNode, parent) {
			parent.insertBefore(newNode, parent.firstChild);
			return newNode;
		}

		/**
		* Sets a map of styles onto a set of elems
		* @param elems: the elements to set the styles onto
		* @param styles: a map of the style names and their styles
		* @return elems
		*/
		self.mapStyles = function(elems, styles) {
			if (!elems) { return elems; }
			for (var i = 0; i < elems.length; i++) {
				for (var k in styles) {
					elems[i].style[k] = styles[k];
				}
			}
			return elems;
		};

		return self;
	};
	
	ns.stacktodo = ns.stacktodo || {};
	ns.stacktodo.uicore = ns.stacktodo.uicore || {};
	ns.stacktodo.uicore.dom = new DOM();
})(window);
(function(ns) {

	var Emoji = function() {
		var self = this;

		var finder = new RegExp(/:[a-zA-Z1-9\-_\+]*:/g);
		var emojiset = {
			"100":"100.png",
			"1234":"1234.png",
			"+1":"%2B1.png",
			"-1":"-1.png",
			"8ball":"8ball.png",
			"a":"a.png",
			"ab":"ab.png",
			"abc":"abc.png",
			"abcd":"abcd.png",
			"accept":"accept.png",
			"aerial_tramway":"aerial_tramway.png",
			"airplane":"airplane.png",
			"alarm_clock":"alarm_clock.png",
			"alien":"alien.png",
			"ambulance":"ambulance.png",
			"anchor":"anchor.png",
			"angel":"angel.png",
			"anger":"anger.png",
			"angry":"angry.png",
			"anguished":"anguished.png",
			"ant":"ant.png",
			"apple":"apple.png",
			"aquarius":"aquarius.png",
			"aries":"aries.png",
			"arrow_backward":"arrow_backward.png",
			"arrow_double_down":"arrow_double_down.png",
			"arrow_double_up":"arrow_double_up.png",
			"arrow_down":"arrow_down.png",
			"arrow_down_small":"arrow_down_small.png",
			"arrow_forward":"arrow_forward.png",
			"arrow_heading_down":"arrow_heading_down.png",
			"arrow_heading_up":"arrow_heading_up.png",
			"arrow_left":"arrow_left.png",
			"arrow_lower_left":"arrow_lower_left.png",
			"arrow_lower_right":"arrow_lower_right.png",
			"arrow_right":"arrow_right.png",
			"arrow_right_hook":"arrow_right_hook.png",
			"arrow_up":"arrow_up.png",
			"arrow_up_down":"arrow_up_down.png",
			"arrow_up_small":"arrow_up_small.png",
			"arrow_upper_left":"arrow_upper_left.png",
			"arrow_upper_right":"arrow_upper_right.png",
			"arrows_clockwise":"arrows_clockwise.png",
			"arrows_counterclockwise":"arrows_counterclockwise.png",
			"art":"art.png",
			"articulated_lorry":"articulated_lorry.png",
			"astonished":"astonished.png",
			"atm":"atm.png",
			"b":"b.png",
			"baby":"baby.png",
			"baby_bottle":"baby_bottle.png",
			"baby_chick":"baby_chick.png",
			"baby_symbol":"baby_symbol.png",
			"back":"back.png",
			"baggage_claim":"baggage_claim.png",
			"balloon":"balloon.png",
			"ballot_box_with_check":"ballot_box_with_check.png",
			"bamboo":"bamboo.png",
			"banana":"banana.png",
			"bangbang":"bangbang.png",
			"bank":"bank.png",
			"bar_chart":"bar_chart.png",
			"barber":"barber.png",
			"baseball":"baseball.png",
			"basketball":"basketball.png",
			"bath":"bath.png",
			"bathtub":"bathtub.png",
			"battery":"battery.png",
			"bear":"bear.png",
			"bee":"bee.png",
			"beer":"beer.png",
			"beers":"beers.png",
			"beetle":"beetle.png",
			"beginner":"beginner.png",
			"bell":"bell.png",
			"bento":"bento.png",
			"bicyclist":"bicyclist.png",
			"bike":"bike.png",
			"bikini":"bikini.png",
			"bird":"bird.png",
			"birthday":"birthday.png",
			"black_circle":"black_circle.png",
			"black_joker":"black_joker.png",
			"black_medium_small_square":"black_medium_small_square.png",
			"black_medium_square":"black_medium_square.png",
			"black_nib":"black_nib.png",
			"black_small_square":"black_small_square.png",
			"black_square":"black_square.png",
			"black_square_button":"black_square_button.png",
			"blossom":"blossom.png",
			"blowfish":"blowfish.png",
			"blue_book":"blue_book.png",
			"blue_car":"blue_car.png",
			"blue_heart":"blue_heart.png",
			"blush":"blush.png",
			"boar":"boar.png",
			"boat":"boat.png",
			"bomb":"bomb.png",
			"book":"book.png",
			"bookmark":"bookmark.png",
			"bookmark_tabs":"bookmark_tabs.png",
			"books":"books.png",
			"boom":"boom.png",
			"boot":"boot.png",
			"bouquet":"bouquet.png",
			"bow":"bow.png",
			"bowling":"bowling.png",
			"bowtie":"bowtie.png",
			"boy":"boy.png",
			"bread":"bread.png",
			"bride_with_veil":"bride_with_veil.png",
			"bridge_at_night":"bridge_at_night.png",
			"briefcase":"briefcase.png",
			"broken_heart":"broken_heart.png",
			"bug":"bug.png",
			"bulb":"bulb.png",
			"bullettrain_front":"bullettrain_front.png",
			"bullettrain_side":"bullettrain_side.png",
			"bus":"bus.png",
			"busstop":"busstop.png",
			"bust_in_silhouette":"bust_in_silhouette.png",
			"busts_in_silhouette":"busts_in_silhouette.png",
			"cactus":"cactus.png",
			"cake":"cake.png",
			"calendar":"calendar.png",
			"calling":"calling.png",
			"camel":"camel.png",
			"camera":"camera.png",
			"cancer":"cancer.png",
			"candy":"candy.png",
			"capital_abcd":"capital_abcd.png",
			"capricorn":"capricorn.png",
			"car":"car.png",
			"card_index":"card_index.png",
			"carousel_horse":"carousel_horse.png",
			"cat":"cat.png",
			"cat2":"cat2.png",
			"cd":"cd.png",
			"chart":"chart.png",
			"chart_with_downwards_trend":"chart_with_downwards_trend.png",
			"chart_with_upwards_trend":"chart_with_upwards_trend.png",
			"checkered_flag":"checkered_flag.png",
			"cherries":"cherries.png",
			"cherry_blossom":"cherry_blossom.png",
			"chestnut":"chestnut.png",
			"chicken":"chicken.png",
			"children_crossing":"children_crossing.png",
			"chocolate_bar":"chocolate_bar.png",
			"christmas_tree":"christmas_tree.png",
			"church":"church.png",
			"cinema":"cinema.png",
			"circus_tent":"circus_tent.png",
			"city_sunrise":"city_sunrise.png",
			"city_sunset":"city_sunset.png",
			"cl":"cl.png",
			"clap":"clap.png",
			"clapper":"clapper.png",
			"clipboard":"clipboard.png",
			"clock1":"clock1.png",
			"clock10":"clock10.png",
			"clock1030":"clock1030.png",
			"clock11":"clock11.png",
			"clock1130":"clock1130.png",
			"clock12":"clock12.png",
			"clock1230":"clock1230.png",
			"clock130":"clock130.png",
			"clock2":"clock2.png",
			"clock230":"clock230.png",
			"clock3":"clock3.png",
			"clock330":"clock330.png",
			"clock4":"clock4.png",
			"clock430":"clock430.png",
			"clock5":"clock5.png",
			"clock530":"clock530.png",
			"clock6":"clock6.png",
			"clock630":"clock630.png",
			"clock7":"clock7.png",
			"clock730":"clock730.png",
			"clock8":"clock8.png",
			"clock830":"clock830.png",
			"clock9":"clock9.png",
			"clock930":"clock930.png",
			"closed_book":"closed_book.png",
			"closed_lock_with_key":"closed_lock_with_key.png",
			"closed_umbrella":"closed_umbrella.png",
			"cloud":"cloud.png",
			"clubs":"clubs.png",
			"cn":"cn.png",
			"cocktail":"cocktail.png",
			"coffee":"coffee.png",
			"cold_sweat":"cold_sweat.png",
			"collision":"collision.png",
			"computer":"computer.png",
			"confetti_ball":"confetti_ball.png",
			"confounded":"confounded.png",
			"confused":"confused.png",
			"congratulations":"congratulations.png",
			"construction":"construction.png",
			"construction_worker":"construction_worker.png",
			"convenience_store":"convenience_store.png",
			"cookie":"cookie.png",
			"cool":"cool.png",
			"cop":"cop.png",
			"copyright":"copyright.png",
			"corn":"corn.png",
			"couple":"couple.png",
			"couple_with_heart":"couple_with_heart.png",
			"couplekiss":"couplekiss.png",
			"cow":"cow.png",
			"cow2":"cow2.png",
			"credit_card":"credit_card.png",
			"crescent_moon":"crescent_moon.png",
			"crocodile":"crocodile.png",
			"crossed_flags":"crossed_flags.png",
			"crown":"crown.png",
			"cry":"cry.png",
			"crying_cat_face":"crying_cat_face.png",
			"crystal_ball":"crystal_ball.png",
			"cupid":"cupid.png",
			"curly_loop":"curly_loop.png",
			"currency_exchange":"currency_exchange.png",
			"curry":"curry.png",
			"custard":"custard.png",
			"customs":"customs.png",
			"cyclone":"cyclone.png",
			"dancer":"dancer.png",
			"dancers":"dancers.png",
			"dango":"dango.png",
			"dart":"dart.png",
			"dash":"dash.png",
			"date":"date.png",
			"de":"de.png",
			"deciduous_tree":"deciduous_tree.png",
			"department_store":"department_store.png",
			"diamond_shape_with_a_dot_inside":"diamond_shape_with_a_dot_inside.png",
			"diamonds":"diamonds.png",
			"disappointed":"disappointed.png",
			"disappointed_relieved":"disappointed_relieved.png",
			"dizzy":"dizzy.png",
			"dizzy_face":"dizzy_face.png",
			"do_not_litter":"do_not_litter.png",
			"dog":"dog.png",
			"dog2":"dog2.png",
			"dollar":"dollar.png",
			"dolls":"dolls.png",
			"dolphin":"dolphin.png",
			"donut":"donut.png",
			"door":"door.png",
			"doughnut":"doughnut.png",
			"dragon":"dragon.png",
			"dragon_face":"dragon_face.png",
			"dress":"dress.png",
			"dromedary_camel":"dromedary_camel.png",
			"droplet":"droplet.png",
			"dvd":"dvd.png",
			"e-mail":"e-mail.png",
			"ear":"ear.png",
			"ear_of_rice":"ear_of_rice.png",
			"earth_africa":"earth_africa.png",
			"earth_americas":"earth_americas.png",
			"earth_asia":"earth_asia.png",
			"egg":"egg.png",
			"eggplant":"eggplant.png",
			"eight":"eight.png",
			"eight_pointed_black_star":"eight_pointed_black_star.png",
			"eight_spoked_asterisk":"eight_spoked_asterisk.png",
			"electric_plug":"electric_plug.png",
			"elephant":"elephant.png",
			"email":"email.png",
			"end":"end.png",
			"envelope":"envelope.png",
			"es":"es.png",
			"euro":"euro.png",
			"european_castle":"european_castle.png",
			"european_post_office":"european_post_office.png",
			"evergreen_tree":"evergreen_tree.png",
			"exclamation":"exclamation.png",
			"expressionless":"expressionless.png",
			"eyeglasses":"eyeglasses.png",
			"eyes":"eyes.png",
			"facepunch":"facepunch.png",
			"factory":"factory.png",
			"fallen_leaf":"fallen_leaf.png",
			"family":"family.png",
			"fast_forward":"fast_forward.png",
			"fax":"fax.png",
			"fearful":"fearful.png",
			"feelsgood":"feelsgood.png",
			"feet":"feet.png",
			"ferris_wheel":"ferris_wheel.png",
			"file_folder":"file_folder.png",
			"finnadie":"finnadie.png",
			"fire":"fire.png",
			"fire_engine":"fire_engine.png",
			"fireworks":"fireworks.png",
			"first_quarter_moon":"first_quarter_moon.png",
			"first_quarter_moon_with_face":"first_quarter_moon_with_face.png",
			"fish":"fish.png",
			"fish_cake":"fish_cake.png",
			"fishing_pole_and_fish":"fishing_pole_and_fish.png",
			"fist":"fist.png",
			"five":"five.png",
			"flags":"flags.png",
			"flashlight":"flashlight.png",
			"floppy_disk":"floppy_disk.png",
			"flower_playing_cards":"flower_playing_cards.png",
			"flushed":"flushed.png",
			"foggy":"foggy.png",
			"football":"football.png",
			"fork_and_knife":"fork_and_knife.png",
			"fountain":"fountain.png",
			"four":"four.png",
			"four_leaf_clover":"four_leaf_clover.png",
			"fr":"fr.png",
			"free":"free.png",
			"fried_shrimp":"fried_shrimp.png",
			"fries":"fries.png",
			"frog":"frog.png",
			"frowning":"frowning.png",
			"fu":"fu.png",
			"fuelpump":"fuelpump.png",
			"full_moon":"full_moon.png",
			"full_moon_with_face":"full_moon_with_face.png",
			"game_die":"game_die.png",
			"gb":"gb.png",
			"gem":"gem.png",
			"gemini":"gemini.png",
			"ghost":"ghost.png",
			"gift":"gift.png",
			"gift_heart":"gift_heart.png",
			"girl":"girl.png",
			"globe_with_meridians":"globe_with_meridians.png",
			"goat":"goat.png",
			"goberserk":"goberserk.png",
			"godmode":"godmode.png",
			"golf":"golf.png",
			"grapes":"grapes.png",
			"green_apple":"green_apple.png",
			"green_book":"green_book.png",
			"green_heart":"green_heart.png",
			"grey_exclamation":"grey_exclamation.png",
			"grey_question":"grey_question.png",
			"grimacing":"grimacing.png",
			"grin":"grin.png",
			"grinning":"grinning.png",
			"guardsman":"guardsman.png",
			"guitar":"guitar.png",
			"gun":"gun.png",
			"haircut":"haircut.png",
			"hamburger":"hamburger.png",
			"hammer":"hammer.png",
			"hamster":"hamster.png",
			"hand":"hand.png",
			"handbag":"handbag.png",
			"hankey":"hankey.png",
			"hash":"hash.png",
			"hatched_chick":"hatched_chick.png",
			"hatching_chick":"hatching_chick.png",
			"headphones":"headphones.png",
			"hear_no_evil":"hear_no_evil.png",
			"heart":"heart.png",
			"heart_decoration":"heart_decoration.png",
			"heart_eyes":"heart_eyes.png",
			"heart_eyes_cat":"heart_eyes_cat.png",
			"heartbeat":"heartbeat.png",
			"heartpulse":"heartpulse.png",
			"hearts":"hearts.png",
			"heavy_check_mark":"heavy_check_mark.png",
			"heavy_division_sign":"heavy_division_sign.png",
			"heavy_dollar_sign":"heavy_dollar_sign.png",
			"heavy_exclamation_mark":"heavy_exclamation_mark.png",
			"heavy_minus_sign":"heavy_minus_sign.png",
			"heavy_multiplication_x":"heavy_multiplication_x.png",
			"heavy_plus_sign":"heavy_plus_sign.png",
			"helicopter":"helicopter.png",
			"herb":"herb.png",
			"hibiscus":"hibiscus.png",
			"high_brightness":"high_brightness.png",
			"high_heel":"high_heel.png",
			"hocho":"hocho.png",
			"honey_pot":"honey_pot.png",
			"honeybee":"honeybee.png",
			"horse":"horse.png",
			"horse_racing":"horse_racing.png",
			"hospital":"hospital.png",
			"hotel":"hotel.png",
			"hotsprings":"hotsprings.png",
			"hourglass":"hourglass.png",
			"hourglass_flowing_sand":"hourglass_flowing_sand.png",
			"house":"house.png",
			"house_with_garden":"house_with_garden.png",
			"hurtrealbad":"hurtrealbad.png",
			"hushed":"hushed.png",
			"ice_cream":"ice_cream.png",
			"icecream":"icecream.png",
			"id":"id.png",
			"ideograph_advantage":"ideograph_advantage.png",
			"imp":"imp.png",
			"inbox_tray":"inbox_tray.png",
			"incoming_envelope":"incoming_envelope.png",
			"information_desk_person":"information_desk_person.png",
			"information_source":"information_source.png",
			"innocent":"innocent.png",
			"interrobang":"interrobang.png",
			"iphone":"iphone.png",
			"it":"it.png",
			"izakaya_lantern":"izakaya_lantern.png",
			"jack_o_lantern":"jack_o_lantern.png",
			"japan":"japan.png",
			"japanese_castle":"japanese_castle.png",
			"japanese_goblin":"japanese_goblin.png",
			"japanese_ogre":"japanese_ogre.png",
			"jeans":"jeans.png",
			"joy":"joy.png",
			"joy_cat":"joy_cat.png",
			"jp":"jp.png",
			"key":"key.png",
			"keycap_ten":"keycap_ten.png",
			"kimono":"kimono.png",
			"kiss":"kiss.png",
			"kissing":"kissing.png",
			"kissing_cat":"kissing_cat.png",
			"kissing_closed_eyes":"kissing_closed_eyes.png",
			"kissing_face":"kissing_face.png",
			"kissing_heart":"kissing_heart.png",
			"kissing_smiling_eyes":"kissing_smiling_eyes.png",
			"koala":"koala.png",
			"koko":"koko.png",
			"kr":"kr.png",
			"large_blue_circle":"large_blue_circle.png",
			"large_blue_diamond":"large_blue_diamond.png",
			"large_orange_diamond":"large_orange_diamond.png",
			"last_quarter_moon":"last_quarter_moon.png",
			"last_quarter_moon_with_face":"last_quarter_moon_with_face.png",
			"laughing":"laughing.png",
			"leaves":"leaves.png",
			"ledger":"ledger.png",
			"left_luggage":"left_luggage.png",
			"left_right_arrow":"left_right_arrow.png",
			"leftwards_arrow_with_hook":"leftwards_arrow_with_hook.png",
			"lemon":"lemon.png",
			"leo":"leo.png",
			"leopard":"leopard.png",
			"libra":"libra.png",
			"light_rail":"light_rail.png",
			"link":"link.png",
			"lips":"lips.png",
			"lipstick":"lipstick.png",
			"lock":"lock.png",
			"lock_with_ink_pen":"lock_with_ink_pen.png",
			"lollipop":"lollipop.png",
			"loop":"loop.png",
			"loudspeaker":"loudspeaker.png",
			"love_hotel":"love_hotel.png",
			"love_letter":"love_letter.png",
			"low_brightness":"low_brightness.png",
			"m":"m.png",
			"mag":"mag.png",
			"mag_right":"mag_right.png",
			"mahjong":"mahjong.png",
			"mailbox":"mailbox.png",
			"mailbox_closed":"mailbox_closed.png",
			"mailbox_with_mail":"mailbox_with_mail.png",
			"mailbox_with_no_mail":"mailbox_with_no_mail.png",
			"man":"man.png",
			"man_with_gua_pi_mao":"man_with_gua_pi_mao.png",
			"man_with_turban":"man_with_turban.png",
			"mans_shoe":"mans_shoe.png",
			"maple_leaf":"maple_leaf.png",
			"mask":"mask.png",
			"massage":"massage.png",
			"meat_on_bone":"meat_on_bone.png",
			"mega":"mega.png",
			"melon":"melon.png",
			"memo":"memo.png",
			"mens":"mens.png",
			"metal":"metal.png",
			"metro":"metro.png",
			"microphone":"microphone.png",
			"microscope":"microscope.png",
			"milky_way":"milky_way.png",
			"minibus":"minibus.png",
			"minidisc":"minidisc.png",
			"mobile_phone_off":"mobile_phone_off.png",
			"money_with_wings":"money_with_wings.png",
			"moneybag":"moneybag.png",
			"monkey":"monkey.png",
			"monkey_face":"monkey_face.png",
			"monorail":"monorail.png",
			"mortar_board":"mortar_board.png",
			"mount_fuji":"mount_fuji.png",
			"mountain_bicyclist":"mountain_bicyclist.png",
			"mountain_cableway":"mountain_cableway.png",
			"mountain_railway":"mountain_railway.png",
			"mouse":"mouse.png",
			"mouse2":"mouse2.png",
			"movie_camera":"movie_camera.png",
			"moyai":"moyai.png",
			"muscle":"muscle.png",
			"mushroom":"mushroom.png",
			"musical_keyboard":"musical_keyboard.png",
			"musical_note":"musical_note.png",
			"musical_score":"musical_score.png",
			"mute":"mute.png",
			"nail_care":"nail_care.png",
			"name_badge":"name_badge.png",
			"neckbeard":"neckbeard.png",
			"necktie":"necktie.png",
			"negative_squared_cross_mark":"negative_squared_cross_mark.png",
			"neutral_face":"neutral_face.png",
			"new":"new.png",
			"new_moon":"new_moon.png",
			"new_moon_with_face":"new_moon_with_face.png",
			"newspaper":"newspaper.png",
			"ng":"ng.png",
			"nine":"nine.png",
			"no_bell":"no_bell.png",
			"no_bicycles":"no_bicycles.png",
			"no_entry":"no_entry.png",
			"no_entry_sign":"no_entry_sign.png",
			"no_good":"no_good.png",
			"no_mobile_phones":"no_mobile_phones.png",
			"no_mouth":"no_mouth.png",
			"no_pedestrians":"no_pedestrians.png",
			"no_smoking":"no_smoking.png",
			"non-potable_water":"non-potable_water.png",
			"nose":"nose.png",
			"notebook":"notebook.png",
			"notebook_with_decorative_cover":"notebook_with_decorative_cover.png",
			"notes":"notes.png",
			"nut_and_bolt":"nut_and_bolt.png",
			"o":"o.png",
			"o2":"o2.png",
			"ocean":"ocean.png",
			"octocat":"octocat.png",
			"octopus":"octopus.png",
			"oden":"oden.png",
			"office":"office.png",
			"ok":"ok.png",
			"ok_hand":"ok_hand.png",
			"ok_woman":"ok_woman.png",
			"older_man":"older_man.png",
			"older_woman":"older_woman.png",
			"on":"on.png",
			"oncoming_automobile":"oncoming_automobile.png",
			"oncoming_bus":"oncoming_bus.png",
			"oncoming_police_car":"oncoming_police_car.png",
			"oncoming_taxi":"oncoming_taxi.png",
			"one":"one.png",
			"open_file_folder":"open_file_folder.png",
			"open_hands":"open_hands.png",
			"open_mouth":"open_mouth.png",
			"ophiuchus":"ophiuchus.png",
			"orange_book":"orange_book.png",
			"outbox_tray":"outbox_tray.png",
			"ox":"ox.png",
			"package":"package.png",
			"page_facing_up":"page_facing_up.png",
			"page_with_curl":"page_with_curl.png",
			"pager":"pager.png",
			"palm_tree":"palm_tree.png",
			"panda_face":"panda_face.png",
			"paperclip":"paperclip.png",
			"parking":"parking.png",
			"part_alternation_mark":"part_alternation_mark.png",
			"partly_sunny":"partly_sunny.png",
			"passport_control":"passport_control.png",
			"paw_prints":"paw_prints.png",
			"peach":"peach.png",
			"pear":"pear.png",
			"pencil":"pencil.png",
			"pencil2":"pencil2.png",
			"penguin":"penguin.png",
			"pensive":"pensive.png",
			"performing_arts":"performing_arts.png",
			"persevere":"persevere.png",
			"person_frowning":"person_frowning.png",
			"person_with_blond_hair":"person_with_blond_hair.png",
			"person_with_pouting_face":"person_with_pouting_face.png",
			"phone":"phone.png",
			"pig":"pig.png",
			"pig2":"pig2.png",
			"pig_nose":"pig_nose.png",
			"pill":"pill.png",
			"pineapple":"pineapple.png",
			"pisces":"pisces.png",
			"pizza":"pizza.png",
			"plus1":"plus1.png",
			"point_down":"point_down.png",
			"point_left":"point_left.png",
			"point_right":"point_right.png",
			"point_up":"point_up.png",
			"point_up_2":"point_up_2.png",
			"police_car":"police_car.png",
			"poodle":"poodle.png",
			"poop":"poop.png",
			"post_office":"post_office.png",
			"postal_horn":"postal_horn.png",
			"postbox":"postbox.png",
			"potable_water":"potable_water.png",
			"pouch":"pouch.png",
			"poultry_leg":"poultry_leg.png",
			"pound":"pound.png",
			"pouting_cat":"pouting_cat.png",
			"pray":"pray.png",
			"princess":"princess.png",
			"punch":"punch.png",
			"purple_heart":"purple_heart.png",
			"purse":"purse.png",
			"pushpin":"pushpin.png",
			"put_litter_in_its_place":"put_litter_in_its_place.png",
			"question":"question.png",
			"rabbit":"rabbit.png",
			"rabbit2":"rabbit2.png",
			"racehorse":"racehorse.png",
			"radio":"radio.png",
			"radio_button":"radio_button.png",
			"rage":"rage.png",
			"rage1":"rage1.png",
			"rage2":"rage2.png",
			"rage3":"rage3.png",
			"rage4":"rage4.png",
			"railway_car":"railway_car.png",
			"rainbow":"rainbow.png",
			"raised_hand":"raised_hand.png",
			"raised_hands":"raised_hands.png",
			"raising_hand":"raising_hand.png",
			"ram":"ram.png",
			"ramen":"ramen.png",
			"rat":"rat.png",
			"recycle":"recycle.png",
			"red_car":"red_car.png",
			"red_circle":"red_circle.png",
			"registered":"registered.png",
			"relaxed":"relaxed.png",
			"relieved":"relieved.png",
			"repeat":"repeat.png",
			"repeat_one":"repeat_one.png",
			"restroom":"restroom.png",
			"revolving_hearts":"revolving_hearts.png",
			"rewind":"rewind.png",
			"ribbon":"ribbon.png",
			"rice":"rice.png",
			"rice_ball":"rice_ball.png",
			"rice_cracker":"rice_cracker.png",
			"rice_scene":"rice_scene.png",
			"ring":"ring.png",
			"rocket":"rocket.png",
			"roller_coaster":"roller_coaster.png",
			"rooster":"rooster.png",
			"rose":"rose.png",
			"rotating_light":"rotating_light.png",
			"round_pushpin":"round_pushpin.png",
			"rowboat":"rowboat.png",
			"ru":"ru.png",
			"rugby_football":"rugby_football.png",
			"runner":"runner.png",
			"running":"running.png",
			"running_shirt_with_sash":"running_shirt_with_sash.png",
			"sa":"sa.png",
			"sagittarius":"sagittarius.png",
			"sailboat":"sailboat.png",
			"sake":"sake.png",
			"sandal":"sandal.png",
			"santa":"santa.png",
			"satellite":"satellite.png",
			"satisfied":"satisfied.png",
			"saxophone":"saxophone.png",
			"school":"school.png",
			"school_satchel":"school_satchel.png",
			"scissors":"scissors.png",
			"scorpius":"scorpius.png",
			"scream":"scream.png",
			"scream_cat":"scream_cat.png",
			"scroll":"scroll.png",
			"seat":"seat.png",
			"secret":"secret.png",
			"see_no_evil":"see_no_evil.png",
			"seedling":"seedling.png",
			"seven":"seven.png",
			"shaved_ice":"shaved_ice.png",
			"sheep":"sheep.png",
			"shell":"shell.png",
			"ship":"ship.png",
			"shipit":"shipit.png",
			"shirt":"shirt.png",
			"shit":"shit.png",
			"shoe":"shoe.png",
			"shower":"shower.png",
			"signal_strength":"signal_strength.png",
			"six":"six.png",
			"six_pointed_star":"six_pointed_star.png",
			"ski":"ski.png",
			"skull":"skull.png",
			"sleeping":"sleeping.png",
			"sleepy":"sleepy.png",
			"slot_machine":"slot_machine.png",
			"small_blue_diamond":"small_blue_diamond.png",
			"small_orange_diamond":"small_orange_diamond.png",
			"small_red_triangle":"small_red_triangle.png",
			"small_red_triangle_down":"small_red_triangle_down.png",
			"smile":"smile.png",
			"smile_cat":"smile_cat.png",
			"smiley":"smiley.png",
			"smiley_cat":"smiley_cat.png",
			"smiling_imp":"smiling_imp.png",
			"smirk":"smirk.png",
			"smirk_cat":"smirk_cat.png",
			"smoking":"smoking.png",
			"snail":"snail.png",
			"snake":"snake.png",
			"snowboarder":"snowboarder.png",
			"snowflake":"snowflake.png",
			"snowman":"snowman.png",
			"sob":"sob.png",
			"soccer":"soccer.png",
			"soon":"soon.png",
			"sos":"sos.png",
			"sound":"sound.png",
			"space_invader":"space_invader.png",
			"spades":"spades.png",
			"spaghetti":"spaghetti.png",
			"sparkle":"sparkle.png",
			"sparkler":"sparkler.png",
			"sparkles":"sparkles.png",
			"sparkling_heart":"sparkling_heart.png",
			"speak_no_evil":"speak_no_evil.png",
			"speaker":"speaker.png",
			"speech_balloon":"speech_balloon.png",
			"speedboat":"speedboat.png",
			"squirrel":"squirrel.png",
			"star":"star.png",
			"star2":"star2.png",
			"stars":"stars.png",
			"station":"station.png",
			"statue_of_liberty":"statue_of_liberty.png",
			"steam_locomotive":"steam_locomotive.png",
			"stew":"stew.png",
			"straight_ruler":"straight_ruler.png",
			"strawberry":"strawberry.png",
			"stuck_out_tongue":"stuck_out_tongue.png",
			"stuck_out_tongue_closed_eyes":"stuck_out_tongue_closed_eyes.png",
			"stuck_out_tongue_winking_eye":"stuck_out_tongue_winking_eye.png",
			"sun_with_face":"sun_with_face.png",
			"sunflower":"sunflower.png",
			"sunglasses":"sunglasses.png",
			"sunny":"sunny.png",
			"sunrise":"sunrise.png",
			"sunrise_over_mountains":"sunrise_over_mountains.png",
			"surfer":"surfer.png",
			"sushi":"sushi.png",
			"suspect":"suspect.png",
			"suspension_railway":"suspension_railway.png",
			"sweat":"sweat.png",
			"sweat_drops":"sweat_drops.png",
			"sweat_smile":"sweat_smile.png",
			"sweet_potato":"sweet_potato.png",
			"swimmer":"swimmer.png",
			"symbols":"symbols.png",
			"syringe":"syringe.png",
			"tada":"tada.png",
			"tanabata_tree":"tanabata_tree.png",
			"tangerine":"tangerine.png",
			"taurus":"taurus.png",
			"taxi":"taxi.png",
			"tea":"tea.png",
			"telephone":"telephone.png",
			"telephone_receiver":"telephone_receiver.png",
			"telescope":"telescope.png",
			"tennis":"tennis.png",
			"tent":"tent.png",
			"thought_balloon":"thought_balloon.png",
			"three":"three.png",
			"thumbsdown":"thumbsdown.png",
			"thumbsup":"thumbsup.png",
			"ticket":"ticket.png",
			"tiger":"tiger.png",
			"tiger2":"tiger2.png",
			"tired_face":"tired_face.png",
			"tm":"tm.png",
			"toilet":"toilet.png",
			"tokyo_tower":"tokyo_tower.png",
			"tomato":"tomato.png",
			"tongue":"tongue.png",
			"top":"top.png",
			"tophat":"tophat.png",
			"tractor":"tractor.png",
			"traffic_light":"traffic_light.png",
			"train":"train.png",
			"train2":"train2.png",
			"tram":"tram.png",
			"triangular_flag_on_post":"triangular_flag_on_post.png",
			"triangular_ruler":"triangular_ruler.png",
			"trident":"trident.png",
			"triumph":"triumph.png",
			"trolleybus":"trolleybus.png",
			"trollface":"trollface.png",
			"trophy":"trophy.png",
			"tropical_drink":"tropical_drink.png",
			"tropical_fish":"tropical_fish.png",
			"truck":"truck.png",
			"trumpet":"trumpet.png",
			"tshirt":"tshirt.png",
			"tulip":"tulip.png",
			"turtle":"turtle.png",
			"tv":"tv.png",
			"twisted_rightwards_arrows":"twisted_rightwards_arrows.png",
			"two":"two.png",
			"two_hearts":"two_hearts.png",
			"two_men_holding_hands":"two_men_holding_hands.png",
			"two_women_holding_hands":"two_women_holding_hands.png",
			"u5272":"u5272.png",
			"u5408":"u5408.png",
			"u55b6":"u55b6.png",
			"u6307":"u6307.png",
			"u6708":"u6708.png",
			"u6709":"u6709.png",
			"u6e80":"u6e80.png",
			"u7121":"u7121.png",
			"u7533":"u7533.png",
			"u7981":"u7981.png",
			"u7a7a":"u7a7a.png",
			"uk":"uk.png",
			"umbrella":"umbrella.png",
			"unamused":"unamused.png",
			"underage":"underage.png",
			"unlock":"unlock.png",
			"up":"up.png",
			"us":"us.png",
			"v":"v.png",
			"vertical_traffic_light":"vertical_traffic_light.png",
			"vhs":"vhs.png",
			"vibration_mode":"vibration_mode.png",
			"video_camera":"video_camera.png",
			"video_game":"video_game.png",
			"violin":"violin.png",
			"virgo":"virgo.png",
			"volcano":"volcano.png",
			"vs":"vs.png",
			"walking":"walking.png",
			"waning_crescent_moon":"waning_crescent_moon.png",
			"waning_gibbous_moon":"waning_gibbous_moon.png",
			"warning":"warning.png",
			"watch":"watch.png",
			"water_buffalo":"water_buffalo.png",
			"watermelon":"watermelon.png",
			"wave":"wave.png",
			"wavy_dash":"wavy_dash.png",
			"waxing_crescent_moon":"waxing_crescent_moon.png",
			"waxing_gibbous_moon":"waxing_gibbous_moon.png",
			"wc":"wc.png",
			"weary":"weary.png",
			"wedding":"wedding.png",
			"whale":"whale.png",
			"whale2":"whale2.png",
			"wheelchair":"wheelchair.png",
			"white_check_mark":"white_check_mark.png",
			"white_circle":"white_circle.png",
			"white_flower":"white_flower.png",
			"white_large_square":"white_large_square.png",
			"white_medium_small_square":"white_medium_small_square.png",
			"white_medium_square":"white_medium_square.png",
			"white_small_square":"white_small_square.png",
			"white_square_button":"white_square_button.png",
			"wind_chime":"wind_chime.png",
			"wine_glass":"wine_glass.png",
			"wink":"wink.png",
			"wolf":"wolf.png",
			"woman":"woman.png",
			"womans_clothes":"womans_clothes.png",
			"womans_hat":"womans_hat.png",
			"womens":"womens.png",
			"worried":"worried.png",
			"wrench":"wrench.png",
			"x":"x.png",
			"yellow_heart":"yellow_heart.png",
			"yen":"yen.png",
			"yum":"yum.png",
			"zap":"zap.png",
			"zero":"zero.png",
			"zzz":"zzz.png"
		};

		/**
		* Salts the given html with the markup to display emojis
		* @param html: the html to replace the emojis in
		* @return the updated html
		*/
		self.saltHtmlIntoString = function(html) {
			var matches = html.match(finder) || [];
			for (var i = 0; i < matches.length; i++) {
				var taggedEmoji = matches[i];
				var emoji = taggedEmoji.substr(1, taggedEmoji.length - 2);
				if (emojiset[emoji]) {
					var url = 'https://emojipng.s3.amazonaws.com/' + emojiset[emoji];
					var tag = '<img data-item="emoji" class="emoji" src="' + url + '" alt="&__co;' + emoji + '&__co;" title ="&__co;' + emoji + '&__co;" />';
					html = html.replace(taggedEmoji, tag); // Don't do a global match here, it's wasteful. matches will have the correct number of each type
				}
			}
			html = html.replace(/&__co;/g, ':');
			return html
		};

		return self;
	};

	ns.stacktodo = ns.stacktodo || {};
	ns.stacktodo.ui = ns.stacktodo.ui || {};
	ns.stacktodo.ui.emoji = new Emoji();
})(window);
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
		* @param error: the error that occured to supply
		* @param message: the message to supply
		* @return the dom element
		*/
		self.error = function(error, message) {
			return D.parse('<div class="s2do-ui-error-flash" data-item="flash">' + message + '</div>');
		};

		/**
		* Renders the success element
		* @param status: the status that was returned from the server
		* @param message: the message to supply
		* @return the dom element
		*/
		self.success = function(status, message) {
			return D.parse('<div class="s2do-ui-success-flash" data-item="flash">' + message + '</div>');
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
	* 		@param form: the id of the form
	* 		@param templates=undefined: a map with any template handlers you want to overwrite
	*/
	var SlackFormUI = function(elem, options) {
		var self = this;

		// Setup our variables
		var Q = {
			container : function() { return elem; },
			inputs : function() { return elem.querySelectorAll('input, textarea, button, select'); },
			flashes : function() { return elem.querySelectorAll('[data-item="flash"]'); }
		};
		var D = ns.stacktodo.uicore.dom;
		var slackForm = new ns.stacktodo.SlackForm(options.form);
		var templates = new Templates(options.templates);

		/**
		* @returns the slack form instance that's being used
		*/
		self.form = function() { return slackForm; };

		// Initialize
		(function() {
			// Bind to the element
			Q.container().classList.add('s2do-ui-form');
			Q.container().addEventListener('submit', function(evt) {
				evt.preventDefault();

				// Remove any old stuff and prep for the submission
				D.remove(Q.flashes());
				D.setAttr(Q.inputs(), 'disabled', 'disabled');

				var flash;
				slackForm.submit(Q.container(), function() {
					flash = templates.success(nil, 'Awesome your feedback has been sent!');
					D.iter(Q.inputs(), function(e) {
						if (e.getAttribute('data-autoblank') !== 'false') {
							D.removeValue([e]);
						}
					});
				}, function(error) {
					flash = templates.error(error, slackForm.humanizeError(error));
				}, function() {
					D.prepend(flash, Q.container());
					D.removeAttr(Q.inputs(), 'disabled');
				});
			}, false);
		})();

		return self;
	};

	ns.stacktodo = ns.stacktodo || {};
	ns.stacktodo.ui = ns.stacktodo.ui || {};
	ns.stacktodo.ui.SlackForm = SlackFormUI;
	ns.stacktodo.ui.SlackFormTemplates = Templates;
})(window);
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
		* @param error: the error that occured to supply
		* @param message: the message to supply
		* @return the dom element
		*/
		self.error = function(error, message) {
			return D.parse('<div class="s2do-ui-error-flash" data-item="flash">' + message + '</div>');
		};

		/**
		* Renders the success element
		* @param status: the status that was returned from the server
		* @param message: the message to supply
		* @return the dom element
		*/
		self.success = function(status, message) {
			return D.parse('<div class="s2do-ui-success-flash" data-item="flash">' + message + '</div>');
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
	* 		@param team: the domain of the team
	* 		@param templates=undefined: a map with any template handlers you want to overwrite
	* 		@param hideFormOnSubmission=false: set to true to hide the form after submission
	*/
	var SlackInviteUI = function(elem, options) {
		var self = this;

		// Setup our variables
		var Q = {
			container : function() { return elem; },
			inputs : function() { return elem.querySelectorAll('input, textarea, button, select'); },
			flashes : function() { return elem.querySelectorAll('[data-item="flash"]'); }
		};
		var D = ns.stacktodo.uicore.dom;
		var slackInvite = new ns.stacktodo.SlackInvite(options.team);
		var templates = new Templates(options.templates);

		/**
		* @returns the slack invite instance that's being used
		*/
		self.invite = function() { return slackInvite; };

		// Bind to the form and start listening
		(function() {
			Q.container().classList.add('s2do-ui-invite');
			Q.container().addEventListener('submit', function(evt) {
				evt.preventDefault();

				// Remove any old stuff and prep for the submission
				D.remove(Q.flashes());
				D.setAttr(Q.inputs(), 'disabled', 'disabled');

				var flash;
				slackInvite.join(Q.container().querySelector('input[name="email"]').value, window.stacktodo.core.form.serialize(Q.container()), function(status) {
					flash = templates.success(status, slackInvite.humanizeStatus(status));
					D.removeValue(Q.inputs());

					if (options.hideFormOnSubmission) {
						D.mapStyles(Q.inputs(), { display: 'none' });
					}
				}, function(error) {
					flash = templates.error(error, slackInvite.humanizeError(error));
				}, function() {
					D.prepend(flash, Q.container());
					D.removeAttr(Q.inputs(), 'disabled');
				});
			});
		})();

		return self;
	};

	ns.stacktodo = ns.stacktodo || {};
	ns.stacktodo.ui = ns.stacktodo.ui || {};
	ns.stacktodo.ui.SlackInvite = SlackInviteUI;
	ns.stacktodo.ui.SlackInviteTemplates = Templates;
})(window);
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
(function(ns) {

	var Unfurler = function() {
		var self = this;

		var D = ns.stacktodo.uicore.dom;
		var slackFiles = ns.stacktodo.slackFiles;
		var re = {
			image_ext : new RegExp('(\.jpg|\.jpeg|\.png|\.gif|\.tiff)$'),
			youtube : new RegExp('^http(s?):\/\/(www\.)?youtube\.([a-z\.]{2,5})\/watch\\?'),
			youtube_s : new RegExp('^http(s?):\/\/(www\.)?youtu\.be\/')
		};

		/**
		* Renders an unfurled image
		* @param originalUrl: the original image url
		* @param url: the new url
		* @return the dom element
		*/
		var unfurlImage = function(originalUrl, url) {
			var container = D.parse([
				'<a href="' + originalUrl + '" target="_blank">',
					'<img data-item="image" src="' + url + '" />',
				'</a>'
			]);
			var img = container.querySelector('img');
			img.addEventListener('error', function(evt) {
				container.parentElement.replaceChild(D.parse('<a href="' + originalUrl + '" target="_blank">' + originalUrl + '</a>'), container);
				img.removeEventListener('error', arguments.callee);
			}, false);
			return container;
		};

		var youtube = {
			/**
			* Renders an unfurled Youtube video
			* @param url: the url to unfurl
			* @return the dom element
			*/
			unfurl : function(url) {
				var videoId = ns.stacktodo.core.qs.urlArg('v', url);
				return youtube.unfurlEmbed('https://www.youtube.com/embed/' + videoId);
			},
			/**
			* Renders an unfurled Youtube video when the url is the youtu.be version
			* @param url: the url to unfurl
			* @return the dom element
			*/
			unfurlShort : function(url) {
				url = url.split(/[?]|[#]/)[0];
				url = url.split('/');
				var videoId = url[url.length - 1];
				return youtube.unfurlEmbed('https://www.youtube.com/embed/' + videoId);
			},
			/**
			* Renders an unfurled Youtube video when the url is the embed version
			* @param url: the url to unfurl
			* @return the dom element
			*/
			unfurlEmbed : function(url) {
				return D.parse([
					'<div data-item="youtube">',
						'<iframe width="640" height="480" src="' + url + '" frameborder="0" allowfullscreen></iframe>',
					'</div>'
				])
			}
		};

		/**
		* Unfurls the items in a post
		* @param dom: the post that has been rendered so far
		* @return the updated dom
		*/
		self.unfurl = function(dom) {
			// Unfurl any elements
			var unfurlElems = dom.querySelectorAll('.unfurl-render-pending');
			for (var i = 0; i < unfurlElems.length; i++) {
				var container = unfurlElems[i];
				var placeholder = container.querySelector('.unfurl-placeholder');
				var url = placeholder.href;
				var uri = url.split(/[?]|[#]/)[0];

				if (re.image_ext.test(uri)) {
					container.parentElement.replaceChild(unfurlImage(url, url), container);
				} else if (slackFiles.isSlackFileUrl(url)) {
					var slackUrl = unfurlUrl = slackFiles.generateUnfurlUrl(url, slackFiles.UNFURL_TYPES.IMAGE);
					container.parentElement.replaceChild(unfurlImage(url, slackUrl), container);
				} else if (re.youtube.test(url)) {
					container.parentElement.replaceChild(youtube.unfurl(url), container);
				} else if (re.youtube_s.test(url)) {
					container.parentElement.replaceChild(youtube.unfurlShort(url), container);
				} else {
					container.classList.remove('unfurl-render-pending');
				}
			};

			return dom;
		};

		return self;
	};

	ns.stacktodo = ns.stacktodo || {};
	ns.stacktodo.ui = ns.stacktodo.ui || {};
	ns.stacktodo.ui.slackUnfurler = new Unfurler();
})(window);

//# sourceMappingURL=stacktodo_full.js.map