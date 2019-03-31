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

describe('Simple tests', () => {
  it('Create and use simple ref', async () => {
    console.log('Create and use simple ref');

    const ref = createRef<NamedObject>(
      () => {
        return {
          value: {
            name: 'hello world'
          }
        };
      },
      {
        timeout: 0
      }
    );

    const value = await ref.use();

    expect(value).toMatchObject({
      name: 'hello world'
    });

    ref.unuse();
    await pause(200);
  });

  it('Check no timeout', async () => {
    console.log('Check no timeout');

    const ref1 = createRef<NamedObject>(
      () => {
        return {
          value: {
            name: 'hello world'
          }
        };
      },
      {
        timeout: -1
      }
    );
    const ref2 = createRef<NamedObject>(
      () => {
        return {
          value: {
            name: 'hello world'
          }
        };
      },
      {
        timeout: 0
      }
    );

    const ref1_value1 = await ref1.use();
    const ref2_value1 = await ref1.use();

    expect(ref1_value1).toMatchObject({
      name: 'hello world'
    });
    expect(ref2_value1).toMatchObject({
      name: 'hello world'
    });

    ref1.unuse();
    ref2.unuse();
    await pause(200);

    const ref1_value2 = await ref1.use();
    const ref2_value2 = await ref2.use();

    expect(ref1_value1 === ref1_value2);
    expect(ref2_value1 !== ref2_value2);
  });

  it('Create ref with dependencies', async () => {
    console.log('Create ref with dependencies');

    const MyTexture = createRef<NamedObject>(
      async () => {
        await pause(500);
        const value: NamedObject = {
          name: 'myTexture'
        };
        console.log('myTexture value', value);
        return {
          value,
          destroy: () => {
            console.log('destroy myTexture');
          }
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
        console.log('myMaterial value', value);
        return {
          value,
          destroy: () => {
            console.log('destroy myMaterial');
          }
        };
      },
      {
        deps: [MyTexture],
        timeout: 0
      }
    );

    const myMaterial = await MyMaterial.use();

    expect(myMaterial).toMatchObject({
      name: 'myMaterial',
      texture: {
        name: 'myTexture'
      }
    });

    MyMaterial.unuse();
    await pause(200);
  });
});
