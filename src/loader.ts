import { findRefs } from "./find";
import { Ref } from "./index";

type OnProgressCallback = (current: number, total: number) => void;

export type Bundle = {
  readonly dependencies: Ref[];
  load(onProgress: OnProgressCallback): Promise<void>;
  unload(): void;
};

export function createLoader(dependencies: Ref[]): Bundle {
  const refs = findRefs(dependencies);

  return Object.freeze({
    get dependencies() {
      return refs;
    },
    load(onProgress: OnProgressCallback) {
      refs.forEach(ref => ref.use());

      let current = 0;
      const total = refs.length;
      return Promise.all(
        refs.map(ref =>
          ref.value.then(() => {
            ++current;
            if (onProgress) {
              onProgress(current, total);
            }
          })
        )
      ).then(() => undefined);
    },
    unload() {
      refs.forEach(ref => ref.unuse());
    }
  });
}
