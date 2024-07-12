import type { Connection } from "./types";

export function diffConnections(
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
