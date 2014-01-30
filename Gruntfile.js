module.exports = function(grunt) {

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		watch: {
			files: ['**/*.html', '**/*.js', '!**/node_modules/**'],
			options: {
				livereload: true
			}
		},
		connect: {
			server: {
				options: {
					port: 8000,
					base: "."
				}
			}
		},
		mocha_phantomjs: {
			all: {
				options: {
					urls: [
						'http://localhost:8000/test/index.html'
					]
				}
			}
		},
		uglify: {
			options: {
				sourceMap: true
			},
			args_js: {
				files: {
					'dist/Args.min.js': ['dist/Args.js']
				}
			}
		},
		copy: {
			main: {
				files: [
					{src: ['Args.js'], dest: 'dist/'}
				]
			}
		},
		bumper: {
			options: {
				files: ["package.json", "bower.json"],
				runTasks: true,
				tasks: ["release"],
				add: true,
				addFiles: ["."],
				commit: true,
				commitMessage: "Release %VERSION%",
				commitFiles: ["-a"],
				createTag: true,
				tagName: "%VERSION%",
				tagMessage: "Version %VERSION%",
				push: false,
				npm: true,
				npmTag: "Release %VERSION%",
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-connect');
	grunt.loadNpmTasks('grunt-mocha-phantomjs');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-bumper');

	grunt.registerTask('dev', ['connect', 'watch']);
	grunt.registerTask('test', ['connect', 'mocha_phantomjs']);
	grunt.registerTask('release', ['copy', 'uglify']);
};
