var webpack = require('webpack')
var path = require('path')

module.exports = {
  entry: {
    main: './main.js'
  },
  output: {
    // Use relative path (to the module)
    // path: path.join(__dirname,'public')
    // Use relative path (to the current working directory)
    path: '.'
  , filename: '[name].bundle.js'
  , library: '[name]'
  , libraryTarget: 'umd'
  },
  module: {
    loaders: [
      {
        test: /\.json$/,
        exclude: /node_modules/,
        loader: "json-loader"
      }
    ]
  }
}
