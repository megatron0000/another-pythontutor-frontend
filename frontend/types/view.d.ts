/**
 * View is any element inside the visualization (except the console window)
 */

import { HeapArray, HeapElement, HeapObject, StackFrame } from "./trace";

interface ViewKinds {
  anchor: AnchorView;
  "heap element": HeapElementView;
  "stack frame": StackFrameView;
  "code area": CodeAreaView;
}

export interface View {
  node(): HTMLElement;
  readonly width: number;
  readonly height: number;
  is<T extends keyof ViewKinds>(kind: T): this is ViewKinds[T];
}

export interface AnchorView extends View {
  readonly offsetLeft: number;
  readonly offsetTop: number;
  parent(): View;
}

export interface StackFrameView extends View {
  getAnchorOut(key: string | number): AnchorView;
  setActive(active: boolean): void;
  rerender(newData: StackFrame): void;
}

export interface HeapElementView extends View {
  x(newX: number): void;
  y(newY: number): void;
  x(): number;
  y(): number;
  getAnchorOut(key: string | number): AnchorView;
  getAnchorIn(): AnchorView;
  rerender(newData: HeapElement): void;

  /**
   * Called before the View is dragged. Can change the coordinates where it
   * will be dragged to.
   *
   * @param callback changing the `dx` or `dy` props changes how much
   * the view will be moved
   */
  onWillDrag(callback: (delta: { dx: number; dy: number }) => void): void;

  /**
   * Called after the View is dragged to a new position
   */
  onDragged(callback: (newPosition: { x: number; y: number }) => void): void;

  // TODO: this is an idea we could think about to implement animations
  // /**
  //  * Called right after the View is moved for whatever reason
  //  * (for example, if it was dragged or if it changed positions during
  //  * the rendering of a step of the user's program)
  //  */
  // onMoved(callback: (newPosition: { x: number; y: number }) => void): void;
}

export interface CodeAreaView extends View {
  /**
   * @param lineNumber -1 to clear the highlight. If this number is fractional,
   * moves the arrow but does not activate the line background color
   */
  highlightCurrentLine(lineNumber: number): void;
  /**
   * @param lineNumber -1 to clear the highlight. If this number is fractional,
   * moves the arrow but does not activate the line background color
   */
  highlightPreviousLine(lineNumber: number): void;
}

export default interface ViewModule {
  createShallowArrayView(arrayData: HeapArray): HeapElementView;

  createShallowObjectView(objectData: HeapObject): HeapElementView;

  createHeapFunctionView(code: string): HeapElementView;

  createShallowStackFrameView(frame: StackFrame): StackFrameView;

  createCodeAreaView(code: string, firstLineNumber: number): CodeAreaView;
}
