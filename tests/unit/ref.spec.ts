import { createRef } from "../../src";
import { pause } from "../utils/pause";
import { createMaterialRef, createNamedRef, Material, NamedObject } from "../utils/refs";

describe('Ref', () => {
  it('Create and use simple ref', async () => {
    const name = 'hello world';

    const ref = createNamedRef(name, 0);

    ref.use();

    const value1 = await ref.value;
    expect(value1).toMatchObject({
      name
    });
  });

  it('Check immediate timeout', async () => {
    const name = 'hello world';

    const ref = createNamedRef(name, 0);

    ref.use();

    const value1 = await ref.value;

    expect(value1).toMatchObject({
      name
    });

    ref.unuse();

    const value2 = await ref.value;
    expect(value2 === undefined);

    ref.use();

    const value3 = await ref.value;
    expect(value1 !== value3);

    ref.unuse();
  });

  it('Check delayed timeout', async () => {
    const name = 'hello world';

    const ref = createNamedRef(name, 200);

    ref.use();

    const value1 = await ref.value;

    expect(value1).toMatchObject({
      name
    });

    ref.unuse();

    // Before timeout is called
    ref.use();
    const value2 = await ref.value;
    expect(value1 === value2);

    ref.unuse();

    // After timeout is called
    await pause(600);

    ref.use();
    const value3 = await ref.value;
    expect(value1 !== value3);
  });

  it('Check no timeout', async () => {
    const name = 'hello world';

    const ref = createNamedRef(name, -1);

    ref.use();

    const value1 = await ref.value;

    expect(value1).toMatchObject({
      name
    });

    ref.unuse();
    ref.use();

    const value3 = await ref.value;
    expect(value1 === value3);

    ref.unuse();
  });

  it('Create ref with dependencies', async () => {
    const MyTexture = createRef({
      async created(): Promise<NamedObject> {
        await pause(500);
        return {
          name: 'myTexture'
        };
      },
      timeout: 0
    });

    const MyMaterial = createRef({
      created: ({ texture }): Material => {
        return {
          name: 'myMaterial',
          texture
        };
      },
      dependencies: {
        texture: MyTexture
      },
      timeout: 0
    });

    MyMaterial.use();

    const myMaterial1 = await MyMaterial.value;
    expect(myMaterial1).toMatchObject({
      name: 'myMaterial',
      texture: {
        name: 'myTexture'
      }
    });

    MyMaterial.unuse();

    const myMaterial2 = await MyMaterial.value;
    expect(myMaterial2 === undefined);
  });

  it('Create ref with dependencies with custom factory function typings', async () => {
    const MyTexture = createRef({
      async created(): Promise<NamedObject> {
        await pause(500);
        return {
          name: 'myTexture'
        };
      },
      timeout: 0
    });

    createMaterialRef(
      'myMaterial1',
      {
        texture: undefined
      },
      0
    );

    createMaterialRef(
      'myMaterial2',
      {
        texture: MyTexture
      },
      0
    );
  });

  it('Should call destroyed when not used anymore', async () => {
    const result = await new Promise(resolve => {
      const MyTexture = createRef({
        async created(): Promise<NamedObject> {
          return {
            name: 'myTexture'
          };
        },
        destroyed() {
          resolve(true);
        },
        timeout: 0
      });

      MyTexture.use();
      MyTexture.unuse();
    });

    expect(result).toBe(true);
  });
});
