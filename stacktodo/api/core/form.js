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