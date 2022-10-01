const path = require('path');
const webpack = require("webpack");

const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');


module.exports = {
  entry: './src/index.ts',
  mode: "development",
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      // fix: codicons in Monaco dot not appear.
      // In webpack 5, assets are no longer loaded with "file-loader".
      // https://stackoverflow.com/questions/71674567/monaco-editor-doesnt-load-codicons-in-case-of-using-webpack
      {
        test: /\.ttf$/,
        type: 'asset/resource'
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'build'),
  },
  plugins: [
    // https://www.npmjs.com/package/monaco-editor-webpack-plugin
    new MonacoWebpackPlugin()
  ],
  cache: {
    type: 'filesystem'
  },
  devtool: 'inline-source-map',
  optimization: {
    // Avoid minimization because TerserPlugin (uglifier) is slow
    // https://github.com/webpack-contrib/terser-webpack-plugin/issues/217
    minimize: false
  },
};