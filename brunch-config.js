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
  },
  onCompile: function(files) {
    var package_json = require('./package.json');
    var fs = require('fs');
    for (var i = 0, f; f = files[i]; i++) {
      var data = [
        '/**',
        '* Stacktodo JavaScript API. Version ' + package_json.version + '.',
        '* ' + package_json.repository.url,
        '* MIT License',
        '*/',
        fs.readFileSync(f.path, 'utf8')
      ].join('\n');
      fs.writeFileSync(f.path, data);
    }
  }
};
