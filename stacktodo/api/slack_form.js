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