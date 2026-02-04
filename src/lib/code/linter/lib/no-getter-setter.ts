export const meta = {
  docs: {
    description: "Forbid getters and setters"
  },
  schema: []
};

export function create(context: any) {
  return {
    Property(node: any) {
      if (node.kind === "get" || node.kind === "set") {
        context.report({
          node: node,
          message: "The use of getters/setters is not allowed"
        });
      }
    }
  };
}
