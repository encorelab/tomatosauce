module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    // uglify: {
    //   options: {
    //     banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
    //   },
    //   build: {
    //     src: 'src/<%= pkg.name %>.js',
    //     dest: 'build/<%= pkg.name %>.min.js'
    //   }
    // }
    jshint: {
      all: ['Gruntfile.js', '*.js']
    },
    jsonlint: {
      dev: {
        src: ['./*.json' ]
      }
    },
    coffeelint: {
      dev: {
        files: {
          src: ['models/coffee/*.coffee']
        },
        options: {
          'no_trailing_whitespace': {
            'level': 'warn'
          },
          'max_line_length': {
            'value': 120,
            'level': 'ignore'
          },
          'indentation': {
            'value': 4,
            'level': 'ignore'
          },
          'no_throwing_strings': {
            'level': 'ignore'
          }
        }
      },
      linting: {
        files: {
          src: ['models/coffee/*.coffee']
        },
        options: {
          'no_trailing_whitespace': {
            'level': 'warn'
          },
          'max_line_length': {
            'value': 120,
            'level': 'warn'
          },
          'indentation': {
            'value': 4,
            'level': 'warn'
          },
          'no_throwing_strings': {
            'level': 'warn'
          }
        }
      }
    },
    coffee: {
      compile: {
        options: {
          sourceMap: true
        },
        files: {
          'models/js/tangible.model.js': 'models/coffee/tangible.model.coffee'
        }
      }
    }
  });

  // Load the plugin that provides the "uglify" task.
  // grunt.loadNpmTasks('grunt-contrib-uglify');
  // grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib');
  grunt.loadNpmTasks('grunt-jsonlint');
  grunt.loadNpmTasks('grunt-coffeelint');

  // Default task(s).
  // grunt.registerTask('default', ['uglify']);
  grunt.registerTask('default', ['jshint', 'jsonlint', 'coffeelint:dev', 'coffee']);
  grunt.registerTask('lint', ['jshint', 'jsonlint', 'coffeelint:linting']);
  grunt.registerTask('compile', ['coffee']);
};