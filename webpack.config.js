const path = require('path')
const webpack = require('webpack')

module.exports = {
	entry: './src/lib/index.js',
	output: {
   path: path.join(__dirname, 'dist'),
   filename: 'index.js',
   library: 'styled',
	 libraryTarget: 'umd'
	},
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      }
    ]
  },
	plugins: [
		new webpack.ProvidePlugin({
		  dom: 'magic-virtual-element'
		})
	]
}
