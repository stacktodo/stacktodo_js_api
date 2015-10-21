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