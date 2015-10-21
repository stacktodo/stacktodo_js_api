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