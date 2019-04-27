import { createRef, Ref } from "../../src";

export interface NamedObject {
  name: string;
}
export interface Material extends NamedObject {
  texture?: NamedObject;
}

export type MaterialDependencies = {
  texture?: Ref<NamedObject>;
};

export function createNamedRef(name: string, timeout: number = 0) {
  return createRef<NamedObject>({
    created: () => {
      return {
        name
      };
    },
    timeout
  });
}

export function createMaterialRef(
  name: string,
  dependencies: MaterialDependencies,
  timeout: number = 0
) {
  return createRef<Material, MaterialDependencies>({
    created: ({ texture }) => {
      return {
        name,
        texture
      };
    },
    dependencies,
    timeout
  });
}
