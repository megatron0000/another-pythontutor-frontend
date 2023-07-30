export const meta = {
  docs: {
    description: "Forbid regular expressions"
  },
  schema: []
};

export function create(context: any) {
  return {
    NewExpression(node: any) {
      if (node.callee.name === "RegExp") {
        context.report({
          node: node,
          message: "The use of regular expression is not allowed"
        });
      }
    },
    Literal(node: any) {
      const regexPattern = /^\/.+\/(?:[gimuy]+)?$/;
      if (regexPattern.test(node.raw)) {
        context.report({
          node: node,
          message: "The use of regular expression is not allowed"
        });
      }
    }
  };
}
