import { Step } from "../types/trace";
import DiffModule from "../types/diff";
import { Connection } from "../types/layout";

define([], function (): DiffModule {
  function diffHeap(step1: Step, step2: Step) {
    const destroyed = Object.keys(step1.heap).filter(
      x => step2.heap[x] === undefined
    );
    const created = Object.keys(step2.heap).filter(
      x => step1.heap[x] === undefined
    );
    const updated = Object.keys(step2.heap)
      .filter(x => step1.heap[x] !== undefined)
      .filter(
        x => JSON.stringify(step1.heap[x]) !== JSON.stringify(step2.heap[x])
      );

    return { destroyed, created, updated };
  }

  function diffStack(step1: Step, step2: Step) {
    const step1IDs = step1.stack_frames.map(x => x.frame_id);
    const step2IDs = step2.stack_frames.map(x => x.frame_id);

    const id2frame = (step: Step, id: number) =>
      step.stack_frames.find(({ frame_id }) => frame_id === id);

    const destroyed = step1IDs.filter(x => !step2IDs.includes(x));
    const created = step2IDs.filter(x => !step1IDs.includes(x));
    const updated = step2IDs.filter(
      frameId =>
        !created.includes(frameId) &&
        JSON.stringify(id2frame(step1, frameId)) !==
          JSON.stringify(id2frame(step2, frameId))
    );

    return { destroyed, created, updated };
  }

  function diffConnections(
    connections1: Connection[],
    connections2: Connection[]
  ) {
    const destroyed = connections1.filter(
      ({ sourceOut }) => !connections2.map(x => x.sourceOut).includes(sourceOut)
    );
    const created = connections2.filter(
      ({ sourceOut }) => !connections1.map(x => x.sourceOut).includes(sourceOut)
    );
    const updated = connections2.filter(
      x =>
        !created.includes(x) &&
        connections1.find(y => y.sourceOut === x.sourceOut)
    );

    return { destroyed, created, updated };
  }

  return {
    diffHeap,
    diffStack,
    diffConnections
  };
});
