import { createLoader, createRef, Ref } from "../../src";
import { pause } from "../utils/pause";
import { createMaterialRef, NamedObject } from "../utils/refs";

describe('Loader', () => {
  let myImageRef: Ref<NamedObject>;
  let myTextureRef: Ref<NamedObject>;
  let myMat1Ref: Ref<NamedObject>;
  let myMat2Ref: Ref<NamedObject>;
  let myModelRef: Ref<NamedObject>;
  let myGroupRef: Ref;

  beforeEach(() => {
    myImageRef = createRef(() => {
      return {
        name: 'myImage'
      };
    });
    myTextureRef = createRef({
      async created({}) {
        await pause(200);
        return {
          name: 'myTexture'
        };
      },
      dependencies: {
        image: myImageRef
      }
    });
    myMat1Ref = createMaterialRef('myMat1', {
      texture: myTextureRef
    });
    myMat2Ref = createMaterialRef('myMat1', {
      texture: myTextureRef
    });
    myModelRef = createRef({
      async created() {
        await pause(1000);
        return {
          name: 'myModel'
        };
      },
      dependencies: {
        material: myMat1Ref
      }
    });

    myGroupRef = createRef({
      dependencies: {
        myModelRef,
        myMat1Ref,
        myMat2Ref
      }
    });
  });

  it('should create loader', async () => {
    const loader = createLoader([myGroupRef]);

    expect(typeof loader.load).toBe('function');
    expect(typeof loader.unload).toBe('function');
  });

  it('should load with progress', async () => {
    const loader = createLoader([myGroupRef]);

    let count = 0;
    await loader.load((current, total) => {
      ++count;
    });

    expect(count).toBe(6);

    loader.unload();
  });
});
