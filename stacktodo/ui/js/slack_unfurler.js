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