const path = require('path');

module.exports = {
	module: {
		noParse: [/\/sinon\.js/],
		rules: [
			{
				exclude: /node_modules/,
				test: /\.tsx?$/,
				use: [
					{
						loader: 'babel-loader',
						options: {
							plugins: [
								'istanbul',
								// '@babel/plugin-transform-runtime',
								['@babel/plugin-proposal-decorators', {legacy: true}],
								// '@babel/plugin-proposal-function-bind',
							],
							presets: ['@babel/preset-react'],
						},
					},
					'ts-loader',
				],
			},
			{
				exclude: /node_modules/,
				test: /\.m?js$/,
				use: {
					loader: 'babel-loader',
					options: {
						plugins: [
							'istanbul',
							['@babel/plugin-proposal-decorators', {legacy: true}],
						],
						presets: ['@babel/preset-env', '@babel/preset-react'],
					},
				},
			},
		],
	},
	output: {
		filename: 'main.js',
		path: path.resolve(__dirname, 'dist'),
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js', '.jsx'],
		modules: ['./node_modules'],
		alias: {
			sinon: 'sinon/pkg/sinon',
			'@storng/common': `${path.join(__dirname, '/packages/common')}`,
			'@storng/store': `${path.join(__dirname, '/packages/store')}`,
		},
	},
};
