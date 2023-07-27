export const meta = {
  docs: {
    description: "Forbid throw statements"
  },
  schema: []
};

export function create(context: any) {
  return {
    ThrowStatement(node: any) {
      context.report({
        node: node,
        message: "The use of throw is not allowed"
      });
    }
  };
}
