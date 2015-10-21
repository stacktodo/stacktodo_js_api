exports.config = {
  files: {
    javascripts: {
      joinTo: {
        'stacktodo_api.js': /^stacktodo\/api/,
        'stacktodo_full.js': /^stacktodo/
      },
      order: {
        before: [
          'stacktodo/api/core/form.js',
          'stacktodo/api/core/jsoncors.js',
          'stacktodo/ui/core/dom.js',
        ]
      }
    },
    stylesheets: {
      joinTo: {
        'stacktodo_full.css' : /^stacktodo\/ui\/css/,
      }
    }
  },
  paths: {
    watched: ['stacktodo'],
    public: 'bin'
  },
  modules: {
    wrapper: false,
    definition: false
  }
};
