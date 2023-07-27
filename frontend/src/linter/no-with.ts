export const meta = {
  docs: {
    description: "Forbid with statements"
  },
  schema: []
};

export function create(context: any) {
  return {
    WithStatement(node: any) {
      context.report({
        node: node,
        message: "The use of with statement is not allowed"
      });
    }
  };
}
