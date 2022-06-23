import {Config, ConfigOptions} from 'karma';
import {join} from 'path';

import * as webpackConfig from './webpack.config';

type KarmaWebpack = {
	webpack: Record<string, any>;
	webpackMiddleware: Record<string, any>;
};

interface WholeConfig extends Config {
	set: (config: ConfigOptions) => void;
}

export default function (config: WholeConfig) {
	config.set({
		// enable / disable watching file and executing tests whenever any file changes
		autoWatch: true,

		// base path that will be used to resolve all patterns (eg. files, exclude)
		basePath: '',

		// start these browsers
		// available browser launchers: https://www.npmjs.com/search?q=keywords:karma-launcher
		browsers: [/*'Chrome', */ 'ChromeHeadless'],

		// enable / disable colors in the output (reporters and logs)
		colors: true,

		coverageIstanbulReporter: {
			combineBrowserReports: true,
			dir: join(__dirname, 'coverage'),
			fixWebpackSourcePaths: true,
			reports: ['text-summary', 'cobertura', 'html'],
			skipFilesWithNoCoverage: false,
		},

		// Concurrency level
		// how many browser instances should be started simultaneously
		concurrency: Infinity,
		// concurrency: 1,

		// list of files / patterns to exclude
		exclude: [],

		// list of files / patterns to load in the browser
		files: [
			'test/@global.ts',
			'packages/**/*(!.d).ts',
			'test/**/*.test.tsx',
			'test/**/*.test.ts',
		],

		// frameworks to use
		// available frameworks: https://www.npmjs.com/search?q=keywords:karma-adapter
		frameworks: ['mocha', 'chai'],

		// level of logging
		// possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
		logLevel: config.LOG_INFO,

		plugins: [
			'karma-chai',
			'karma-chrome-launcher',
			'karma-coverage-istanbul-reporter',
			'karma-mocha',
			'karma-mocha-reporter',
			'karma-webpack',
		],

		// web server port
		port: 9876,

		// preprocess matching files before serving them to the browser
		// available preprocessors: https://www.npmjs.com/search?q=keywords:karma-preprocessor
		preprocessors: {
			'test/**/*.ts': ['webpack'],
			'test/**/*.tsx': ['webpack'],
			'src/**/*.ts': ['webpack'],
		},

		// test results reporter to use
		// possible values: 'dots', 'progress'
		// available reporters: https://www.npmjs.com/search?q=keywords:karma-reporter
		// reporters: ['progress', 'mocha', 'dots', 'coverage-istanbul'],
		reporters: ['mocha', 'coverage-istanbul'],

		// Continuous Integration mode
		// if true, Karma captures browsers, runs the tests and exits
		singleRun: false,

		webpack: webpackConfig.default,
		webpackMiddleware: {},
	} as ConfigOptions & KarmaWebpack);
}
