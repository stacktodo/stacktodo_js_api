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