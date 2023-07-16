const path = require("path");
const webpack = require("webpack");

const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");

// FIXME: Remove Ace, JS-Interpreter and its dependency acorn from the window object
module.exports = {
  entry: "./src/index.ts",
  mode: "development",
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      },
      // fix: codicons in Monaco dot not appear.
      // In webpack 5, assets are no longer loaded with "file-loader".
      // https://stackoverflow.com/questions/71674567/monaco-editor-doesnt-load-codicons-in-case-of-using-webpack
      {
        test: /\.ttf$/,
        type: "asset/resource"
      },
      // reference for bundling Fraser's js interpreter:
      // https://github.com/aminmarashi/JS-Interpreter/blob/master/webpack.config.js
      {
        test: path.resolve(__dirname, "vendor/JS-Interpreter/interpreter.js"),
        use: [
          {
            loader: "exports-loader",
            options: {
              exports: "Interpreter"
            }
          },
          // FIXME: acorn is put on the `globalThis` because that's where JS-interpreter
          // looks for it
          {
            loader: "imports-loader",
            options: {
              additionalCode: `globalThis.acorn = require("JS-Interpreter-acorn");`
            }
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: [".ts", ".js"],
    alias: {
      "JS-Interpreter": path.resolve(
        __dirname,
        "vendor/JS-Interpreter/interpreter.js"
      ),
      "JS-Interpreter-acorn": path.resolve(
        __dirname,
        "vendor/JS-Interpreter/acorn.js"
      )
    }
  },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "build")
  },
  plugins: [
    new MonacoWebpackPlugin({
      languages: ["javascript"]
    })
  ],
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
