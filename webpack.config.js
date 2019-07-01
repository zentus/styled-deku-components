const HtmlWebPackPlugin = require('html-webpack-plugin')

module.exports = {
	entry: {
    lib: './src/lib/index.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      }, {
        test: /\.html$/,
        use: [
          {
            loader: "html-loader"
          }
        ]
      }
    ]
  },
	plugins: [

  ]
}
