import { Linter as ESLint } from "eslint-linter-browserify";

import * as eslintES5Plugin from "eslint-plugin-es5";

import * as noRegexpRule from "./no-regexp";
import * as noTryCatchRule from "./no-try-catch";
import * as noWithRule from "./no-with";
import * as noGetterSetterRule from "./no-getter-setter";
import * as noThrowRule from "./no-throw";

const linter = new ESLint();

linter.defineRules({
  ...eslintES5Plugin.rules,
  "no-regexp": noRegexpRule,
  "no-try-catch": noTryCatchRule,
  "no-with": noWithRule,
  "no-getter-setter": noGetterSetterRule,
  "no-throw": noThrowRule
});

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

    rules: {
      // from: https://eslint.org/docs/latest/rules/
      // semi: ["error", "always"], // not good, too noisy (complains as the user is typing every line)
      "no-undef": "error", // Disallow the use of undeclared variables
      "no-use-before-define": "error", // Forbid e.g. `output(x); var x = 10;`
      "block-scoped-var": "error", // Enforce the use of variables within the scope they are defined
      eqeqeq: ["error", "always"], // Force === and !== instead of == and !=
      "no-extra-semi": "error", // Disallow unnecessary semicolons
      "no-global-assign": "error", // Disallow assignments to native objects or read-only global variables
      "no-multi-assign": "error", // disallows using multiple assignments within a single statement.
      "no-redeclare": "error", // forbid e.g. `var x; var x;`
      "vars-on-top": "error", // Require var declarations be placed at the top of their containing scope
      "no-sequences": ["error", { allowInParentheses: false }], // forbid comma operator, e.g. `var a = (3, 5); // a = 5`
      "no-sparse-arrays": "error", // forbid e.g. `var colors = [ "red", , "blue" ];`
      "no-eval": "error",
      "no-labels": "error", // Disallow labeled statements,
      "no-cond-assign": ["error", "always"], // disallow e.g. `if(x = 10)`
      "no-restricted-globals": [
        // properties of the global object in Fraser's interpreter
        "error",
        // "NaN",
        // "Infinity",
        // "undefined",
        "window",
        // "this",
        "self",
        "Function",
        "Object",
        "constructor",
        "Array",
        "String",
        "Boolean",
        "Number",
        "Date",
        "RegExp",
        "Error",
        "EvalError",
        "RangeError",
        "ReferenceError",
        "SyntaxError",
        "TypeError",
        "URIError",
        "Math",
        "JSON",
        "eval",
        "parseInt",
        "parseFloat",
        "isNaN",
        "isFinite",
        "escape",
        "unescape",
        "decodeURI",
        "decodeURIComponent",
        "encodeURI",
        "encodeURIComponent"
      ],

      // custom: forbid some javascript syntaxes
      "no-regexp": "error",
      "no-try-catch": "error",
      "no-with": "error",
      "no-getter-setter": "error",
      "no-throw": "error",

      // forbid es6 constructs
      "no-arrow-functions": "error",
      "no-binary-and-octal-literals": "error",
      "no-block-scoping": "error",
      "no-classes": "error",
      "no-computed-properties": "error",
      "no-default-parameters": "error",
      "no-destructuring": "error",
      "no-es6-methods": "error",
      "no-es6-static-methods": "error",
      "no-exponentiation-operator": "error",
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
