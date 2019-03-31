import { createRef } from "../../src";

interface NamedObject {
  name: string;
}
interface Material extends NamedObject {
  texture?: NamedObject;
}

function pause(ms) {
  return new Promise(r => setTimeout(r, ms));
}
function createNamedRef(name: string, timeout: number) {
  return createRef<NamedObject>(
    () => {
      return {
        value: {
          name
        }
      };
    },
    {
      timeout
    }
  );
}

describe('Simple tests', () => {
  it('Create and use simple ref', async () => {
    const name = 'hello world';

    const ref = createNamedRef(name, 0);

    ref.use();

    const value1 = await ref.value();
    expect(value1).toMatchObject({
      name
    });
  });

  it('Check immediate timeout', async () => {
    const name = 'hello world';

    const ref = createNamedRef(name, 0);

    ref.use();

    const value1 = await ref.value();

    expect(value1).toMatchObject({
      name
    });

    ref.unuse();

    const value2 = await ref.value();
    expect(value2 === undefined);

    ref.use();

    const value3 = await ref.value();
    expect(value1 !== value3);

    ref.unuse();
  });

  it('Check delayed timeout', async () => {
    const name = 'hello world';

    const ref = createNamedRef(name, 200);

    ref.use();

    const value1 = await ref.value();

    expect(value1).toMatchObject({
      name
    });

    ref.unuse();

    // Before timeout is called
    ref.use();
    const value2 = await ref.value();
    expect(value1 === value2);

    ref.unuse();

    // After timeout is called
    await pause(600);

    ref.use();
    const value3 = await ref.value();
    expect(value1 !== value3);
  });

  it('Check no timeout', async () => {
    const name = 'hello world';

    const ref = createNamedRef(name, -1);

    ref.use();

    const value1 = await ref.value();

    expect(value1).toMatchObject({
      name
    });

    ref.unuse();
    ref.use();

    const value3 = await ref.value();
    expect(value1 === value3);

    ref.unuse();
  });

  it('Create ref with dependencies', async () => {
    const MyTexture = createRef<NamedObject>(
      async () => {
        await pause(500);
        const value: NamedObject = {
          name: 'myTexture'
        };
        return {
          value,
          destroy: () => {}
        };
      },
      {
        timeout: 0
      }
    );

    const MyMaterial = createRef<Material, [NamedObject]>(
      ([texture]) => {
        const value = {
          name: 'myMaterial',
          texture
        };
        return {
          value,
          destroy: async () => {}
        };
      },
      {
        deps: [MyTexture],
        timeout: 0
      }
    );

    MyMaterial.use();

    const myMaterial1 = await MyMaterial.value();
    expect(myMaterial1).toMatchObject({
      name: 'myMaterial',
      texture: {
        name: 'myTexture'
      }
    });

    MyMaterial.unuse();

    const myMaterial2 = await MyMaterial.value();
    expect(myMaterial2 === undefined);
  });
});
