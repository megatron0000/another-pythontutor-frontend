export const meta = {
  docs: {
    description: "Forbid try-catch statements"
  },
  schema: []
};

export function create(context: any) {
  return {
    TryStatement(node: any) {
      context.report({
        node: node,
        message: "The use of try-catch is not allowed"
      });
    }
  };
}
