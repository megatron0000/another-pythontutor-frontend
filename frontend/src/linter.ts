import { Linter as ESLint } from "eslint-linter-browserify";

import * as eslintES5Plugin from "eslint-plugin-es5";

const linter = new ESLint();

linter.defineRules(eslintES5Plugin.rules);

export function lint(code: string) {
  return linter.verify(code, {
    parserOptions: {
      ecmaVersion: 6,
      ecmaFeatures: {
        experimentalObjectRestSpread: false,
        globalReturn: false,
        impliedStrict: true,
        jsx: false
      }
    },
    // https://eslint.org/docs/latest/rules/#possible-problems
    rules: {
      "no-undef": "error",
      "no-use-before-define": "error",
      "block-scoped-var": "error",
      eqeqeq: ["error", "always"],
      "no-extra-semi": "error",
      "no-global-assign": "error",
      "no-multi-assign": "error",
      "no-redeclare": "error",
      "vars-on-top": "error",
      "operator-assignment": ["error", "never"],
      "no-sequences": "error",
      "no-sparse-arrays": "error",
      // es6
      "no-arrow-functions": "error",
      "no-binary-and-octal-literals": "error",
      "no-block-scoping": "error",
      "no-classes": "error",
      "no-computed-properties": "error",
      "no-default-parameters": "error",
      "no-destructuring": "error",
      "no-es6-methods": "error",
      "no-es6-static-methods": "error",
      "no-for-of": "error",
      "no-generators": "error",
      "no-modules": "error",
      "no-object-super": "error",
      "no-rest-parameters": "error",
      "no-shorthand-properties": "error",
      "no-spread": "error",
      "no-template-literals": "error",
      "no-typeof-symbol": "error",
      "no-unicode-code-point-escape": "error",
      "no-unicode-regex": "error"
    },
    globals: {
      input: "readonly",
      output: "readonly"
    }
  });
}
