const path = require("path");
const commonConfig = require("./webpack.config.common");

// FIXME: Remove Ace, JS-Interpreter and its dependency acorn from the window object
module.exports = {
  ...commonConfig,
  mode: "development",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "build")
  },
  cache: {
    type: "filesystem"
  },
  devtool: "inline-source-map",
  optimization: {
    // Avoid minimization because TerserPlugin (uglifier) is slow
    // https://github.com/webpack-contrib/terser-webpack-plugin/issues/217
    minimize: false
  }
};
