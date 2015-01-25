var fs = require('fs');
var path = require('path');
var webpack = require('webpack');

function isDirectory(dir) {
  return fs.lstatSync(dir).isDirectory();
}

module.exports = {

  devtool: 'inline-source-map',

  entry: fs.readdirSync(__dirname).reduce(function (entries, dir) {
    var isDraft = dir.charAt(0) === '_';

    if (!isDraft && isDirectory(path.join(__dirname, dir)))
      entries[dir] = path.join(__dirname, dir, 'app.cjsx');

    return entries;
  }, {}),

  output: {
    path: 'examples/__build__',
    filename: '[name].js',
    chunkFilename: '[id].chunk.js',
    publicPath: '/__build__/'
  },

  module: {
    loaders: [
      { test: /\.js$/, loader: 'jsx-loader?harmony' },
      { test: /\.cjsx$/, loaders: ['coffee', 'cjsx'] },
      { test: /\.coffee$/, loader: 'coffee'}
    ]
  },

  resolve: {
    extensions: ['', '.cjsx', '.coffee', '.js'],
    alias: {
      'react-router': '../../modules'
    }
  },

  plugins: [
    new webpack.optimize.CommonsChunkPlugin('shared.js'),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    })
  ]

};
