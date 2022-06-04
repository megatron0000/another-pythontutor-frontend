/**
 * Utility functions to calculate which things were created/deleted/updated
 * between two given visualization data structures
 */

import { Connection } from "./layout";
import { HeapElementId, StackFrameId, Step } from "./trace";

export interface Diff<T> {
  destroyed: T[];
  created: T[];
  updated: T[];
}

export default interface DiffModule {
  diffHeap(step1: Step, step2: Step): Diff<HeapElementId>;

  diffStack(step1: Step, step2: Step): Diff<StackFrameId>;

  diffConnections(
    connections1: Connection[],
    connections2: Connection[]
  ): Diff<Connection>;
}
