import { Interpreter as FraserInterpreter } from "JS-Interpreter";

let patched = false;

export function patchFraserInterpreterIfNotPatched() {
  if (patched) {
    return;
  }

  patched = true;

  // disable regexps
  FraserInterpreter.prototype.REGEXP_MODE = 0;

  // Modify the object constructor to keep track of object IDs
  let object_id = 0;
  const originalObjectConstructor = FraserInterpreter.Object;
  // @ts-expect-error
  //   ```
  //   Type '(this: FraserInterpreter.Object) => void'
  //   is not assignable to type 'typeof Object'.
  //   ```
  // This happens because the implementation of Object
  // is based on a constructor function, we just wrap
  // this function.
  FraserInterpreter.Object = function (
    this: FraserInterpreter.Object,
    proto: unknown
  ) {
    originalObjectConstructor.apply(this, [proto]);
    this.__custom_id_property__ = object_id++;
  };

  // Modify the Scope constructor to make all scopes
  // automatically be in strict mode
  const originalScopeConstructor = FraserInterpreter.Scope;
  // @ts-expect-error
  //   ```
  //   Type '(this: FraserInterpreter.Scope) => void'
  //   is not assignable to type 'typeof Scope'.
  //   ```
  // This happens because the implementation of Object
  // is based on a constructor function, we just wrap
  // this function.
  FraserInterpreter.Scope = function (
    this: FraserInterpreter.Scope,
    parentScope: FraserInterpreter.Scope,
    strict: boolean,
    object: FraserInterpreter.Object
  ) {
    originalScopeConstructor.call(this, parentScope, true, object);
  };
}
