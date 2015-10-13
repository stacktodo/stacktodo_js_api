exports.config = {
  files: {
    javascripts: {
      joinTo: {
        'stacktodo.js': /^stacktodo/
      },
      order: {
        before: [
          'src/core/form.js',
          'src/core/jsoncors.js'
        ]
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
