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
		}
	});

	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-connect');
	grunt.loadNpmTasks('grunt-mocha-phantomjs');

	grunt.registerTask('dev', ['connect', 'watch']);
	grunt.registerTask('test', ['connect', 'mocha_phantomjs']);
};
