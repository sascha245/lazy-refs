import { Ref } from "./ref";

export function findRefs(ref: Ref): Ref[];
export function findRefs(refs: Ref[]): Ref[];
export function findRefs(refOrRefs: Ref | Ref[]) {
  const refs = Array.isArray(refOrRefs) ? refOrRefs : [refOrRefs];
  const set = new Set();
  const recursivOp = (deps: Ref[]) => {
    for (const dep of deps) {
      if (dep && !set.has(dep)) {
        set.add(dep);
        recursivOp(dep.dependencies);
      }
    }
  };
  recursivOp(refs);
  return [...set];
}
