/**
 * Modified from:
 * https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/estree/index.d.ts
 */

declare module "JS-Interpreter-ast" {
  // Type definitions for non-npm package estree 1.0
  // Project: https://github.com/estree/estree
  // Definitions by: RReverser <https://github.com/RReverser>
  // Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

  // This definition file follows a somewhat unusual format. ESTree allows
  // runtime type checks based on the `type` parameter. In order to explain this
  // to typescript we want to use discriminated union types:
  // https://github.com/Microsoft/TypeScript/pull/9163
  //
  // For ESTree this is a bit tricky because the high level interfaces like
  // Node or Function are pulling double duty. We want to pass common fields down
  // to the interfaces that extend them (like Identifier or
  // ArrowFunctionExpression), but you can't extend a type union or enforce
  // common fields on them. So we've split the high level interfaces into two
  // types, a base type which passes down inherited fields, and a type union of
  // all types which extend the base type. Only the type union is exported, and
  // the union is how other types refer to the collection of inheriting types.
  //
  // This makes the definitions file here somewhat more difficult to maintain,
  // but it has the notable advantage of making ESTree much easier to use as
  // an end user.

  export interface BaseNode {
    // Every leaf interface that extends BaseNode must specify a type property.
    // The type property should be a string literal. For example, Identifier
    // has: `type: "Identifier"`
    type: string;
    loc: SourceLocation;
    start: number;
    end: number;
  }

  export interface NodeMap {
    CatchClause: CatchClause;
    Expression: Expression;
    Function: Function;
    Identifier: Identifier;
    Literal: Literal;
    Program: Program;
    Property: Property;
    Statement: Statement;
    SwitchCase: SwitchCase;
    VariableDeclarator: VariableDeclarator;
  }

  export type Node = NodeMap[keyof NodeMap];

  export interface SourceLocation {
    source?: string | null | undefined;
    start: Position;
    end: Position;
  }

  export interface Position {
    /** >= 1 */
    line: number;
    /** >= 0 */
    column: number;
  }

  export interface Program extends BaseNode {
    type: "Program";
    body: Statement[];
  }

  export interface BaseFunction extends BaseNode {
    params: Identifier[];
    body: BlockStatement;
  }

  export type Function = FunctionDeclaration | FunctionExpression;

  export type Statement =
    | EmptyStatement
    | BlockStatement
    | ExpressionStatement
    | IfStatement
    | LabeledStatement
    | BreakStatement
    | ContinueStatement
    | WithStatement
    | SwitchStatement
    | ReturnStatement
    | ThrowStatement
    | TryStatement
    | WhileStatement
    | DoWhileStatement
    | ForStatement
    | ForInStatement
    | DebuggerStatement
    | Declaration;

  export interface BaseStatement extends BaseNode {}

  export interface EmptyStatement extends BaseStatement {
    type: "EmptyStatement";
  }

  export interface BlockStatement extends BaseStatement {
    type: "BlockStatement";
    body: Statement[];
  }

  export interface ExpressionStatement extends BaseStatement {
    type: "ExpressionStatement";
    expression: Expression;
  }

  export interface IfStatement extends BaseStatement {
    type: "IfStatement";
    test: Expression;
    consequent: Statement;
    alternate?: Statement | null | undefined;
  }

  export interface LabeledStatement extends BaseStatement {
    type: "LabeledStatement";
    label: Identifier;
    body: Statement;
  }

  export interface BreakStatement extends BaseStatement {
    type: "BreakStatement";
    label?: Identifier | null | undefined;
  }

  export interface ContinueStatement extends BaseStatement {
    type: "ContinueStatement";
    label?: Identifier | null | undefined;
  }

  export interface WithStatement extends BaseStatement {
    type: "WithStatement";
    object: Expression;
    body: Statement;
  }

  export interface SwitchStatement extends BaseStatement {
    type: "SwitchStatement";
    discriminant: Expression;
    cases: SwitchCase[];
  }

  export interface ReturnStatement extends BaseStatement {
    type: "ReturnStatement";
    argument?: Expression | null | undefined;
  }

  export interface ThrowStatement extends BaseStatement {
    type: "ThrowStatement";
    argument: Expression;
  }

  export interface TryStatement extends BaseStatement {
    type: "TryStatement";
    block: BlockStatement;
    handler?: CatchClause | null | undefined;
    finalizer?: BlockStatement | null | undefined;
  }

  export interface WhileStatement extends BaseStatement {
    type: "WhileStatement";
    test: Expression;
    body: Statement;
  }

  export interface DoWhileStatement extends BaseStatement {
    type: "DoWhileStatement";
    body: Statement;
    test: Expression;
  }

  export interface ForStatement extends BaseStatement {
    type: "ForStatement";
    init?: VariableDeclaration | Expression | null | undefined;
    test?: Expression | null | undefined;
    update?: Expression | null | undefined;
    body: Statement;
  }

  export interface ForInStatement extends BaseStatement {
    type: "ForInStatement";
    left: VariableDeclaration | Identifier;
    right: Expression;
    body: Statement;
  }

  export interface DebuggerStatement extends BaseStatement {
    type: "DebuggerStatement";
  }

  export type Declaration = FunctionDeclaration | VariableDeclaration;

  export interface BaseDeclaration extends BaseStatement {}

  export interface FunctionDeclaration extends BaseFunction, BaseDeclaration {
    type: "FunctionDeclaration";
    id: Identifier;
  }

  export interface VariableDeclaration extends BaseDeclaration {
    type: "VariableDeclaration";
    declarations: VariableDeclarator[];
    kind: "var" | "let" | "const";
  }

  export interface VariableDeclarator extends BaseNode {
    type: "VariableDeclarator";
    id: Identifier;
    init?: Expression | null | undefined;
  }

  export interface ExpressionMap {
    ThisExpression: ThisExpression;
    ArrayExpression: ArrayExpression;
    ObjectExpression: ObjectExpression;
    FunctionExpression: FunctionExpression;
    SequenceExpression: SequenceExpression;
    UnaryExpression: UnaryExpression;
    BinaryExpression: BinaryExpression;
    AssignmentExpression: AssignmentExpression;
    UpdateExpression: UpdateExpression;
    LogicalExpression: LogicalExpression;
    ConditionalExpression: ConditionalExpression;
    NewExpression: NewExpression;
    CallExpression: CallExpression;
    MemberExpression: MemberExpression;
    Identifier: Identifier;
    Literal: Literal;
  }

  export type Expression = ExpressionMap[keyof ExpressionMap];

  export interface BaseExpression extends BaseNode {}

  export interface ThisExpression extends BaseExpression {
    type: "ThisExpression";
  }

  export interface ArrayExpression extends BaseExpression {
    type: "ArrayExpression";
    elements: (Expression | null)[];
  }

  export interface ObjectExpression extends BaseExpression {
    type: "ObjectExpression";
    properties: Property[];
  }

  export interface Property extends BaseNode {
    type: "Property";
    key: Literal | Identifier;
    value: Expression;
    kind: "init" | "get" | "set";
  }

  export interface FunctionExpression extends BaseFunction, BaseExpression {
    id?: Identifier | null | undefined;
    type: "FunctionExpression";
  }

  export interface SequenceExpression extends BaseExpression {
    type: "SequenceExpression";
    expressions: Expression[];
  }

  export interface UnaryExpression extends BaseExpression {
    type: "UnaryExpression";
    operator: UnaryOperator;
    prefix: true;
    argument: Expression;
  }

  export interface BinaryExpression extends BaseExpression {
    type: "BinaryExpression";
    operator: BinaryOperator;
    left: Expression;
    right: Expression;
  }

  export interface AssignmentExpression extends BaseExpression {
    type: "AssignmentExpression";
    operator: AssignmentOperator;
    left: Identifier | MemberExpression;
    right: Expression;
  }

  export interface UpdateExpression extends BaseExpression {
    type: "UpdateExpression";
    operator: UpdateOperator;
    argument: Expression;
    prefix: boolean;
  }

  export interface LogicalExpression extends BaseExpression {
    type: "LogicalExpression";
    operator: LogicalOperator;
    left: Expression;
    right: Expression;
  }

  export interface ConditionalExpression extends BaseExpression {
    type: "ConditionalExpression";
    test: Expression;
    alternate: Expression;
    consequent: Expression;
  }

  export interface BaseCallExpression extends BaseExpression {
    callee: Expression;
    arguments: Expression[];
  }

  export interface CallExpression extends BaseCallExpression {
    type: "CallExpression";
  }

  export interface NewExpression extends BaseCallExpression {
    type: "NewExpression";
  }

  export interface MemberExpression extends BaseExpression {
    type: "MemberExpression";
    object: Expression;
    property: Identifier | Expression;
    computed: boolean;
  }

  export interface SwitchCase extends BaseNode {
    type: "SwitchCase";
    test?: Expression | null | undefined;
    consequent: Statement[];
  }

  export interface CatchClause extends BaseNode {
    type: "CatchClause";
    param: Identifier;
    body: BlockStatement;
  }

  export interface Identifier extends BaseNode, BaseExpression {
    type: "Identifier";
    name: string;
  }

  export interface Literal extends BaseNode, BaseExpression {
    type: "Literal";
    value: string | boolean | null | number | RegExp;
  }

  export type UnaryOperator =
    | "-"
    | "+"
    | "!"
    | "~"
    | "typeof"
    | "void"
    | "delete";

  export type BinaryOperator =
    | "=="
    | "!="
    | "==="
    | "!=="
    | "<"
    | "<="
    | ">"
    | ">="
    | "<<"
    | ">>"
    | ">>>"
    | "+"
    | "-"
    | "*"
    | "/"
    | "%"
    | "**"
    | "|"
    | "^"
    | "&"
    | "in"
    | "instanceof";

  export type LogicalOperator = "||" | "&&";

  export type AssignmentOperator =
    | "="
    | "+="
    | "-="
    | "*="
    | "/="
    | "%="
    | "<<="
    | ">>="
    | ">>>="
    | "|="
    | "^="
    | "&=";

  export type UpdateOperator = "++" | "--";
}
