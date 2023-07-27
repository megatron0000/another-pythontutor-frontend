const TerserPlugin = require("terser-webpack-plugin");

const commonConfig = require("./webpack.config.common");

// FIXME: Remove Ace, JS-Interpreter and its dependency acorn from the window object
module.exports = {
  ...commonConfig,
  mode: "production",
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()]
  },
  cache: false,
  devtool: "source-map"
};
