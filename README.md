# lazy-ref

## Install

`npm install lazy-ref --save`

## Usage

### API

```ts
export type Ref<T> = {
  use(): void;
  unuse(): void;
  value(): Promise<T | undefined>;
};
```

### Create a reference

References can return async values

```ts
import { createRef } from 'lazy-ref'

interface Texture {
  id: string;
}

const MyTexture = createRef<Texture>(async () => {
  await doSomethingAsync();
  const value = {
    id: "myTexture"
  }
  return {
    value,
    destroy: () => {
      // dispose texture
    }
  }
});
```

You can also create references that depend on other references.

```ts
interface Material {
  id: string;
  texture?: Texture;
}

const MyMaterial = createRef<Material, [Texture]>(([texture]) => {
  const value = {
    id: "myMaterial",
    texture: texture
  }
  return {
    value,
    destroy: () => {
      // dispose material
    }
  }
}, {
  deps: [MyTexture]
});
```

### Use the reference

`use`: When the reference is *used* for the first time, it will load the reference: it will automatically *use* and get the value all of its dependencies before calling the corresponding factory.

`value`: If the factory throws an error, the *value* function will not throw and will instead return `undefined`.

`unuse`: When the reference is *unused* and isn't *used* anywhere else anymore, it will unload the reference: it will *unuse* all dependencies and call the *destroy* function if defined.
The reference is initialized once again when it is *used* once more.

```ts
// First use the reference, to mark it as used and initialize the value if it hasn't been used yet
MyMaterial.use();

// We can now get the value
const myMaterial = await MyMaterial.value();

console.log(myMaterial); // { id: 'myMaterial', texture: { id: 'myTexture' } }

// Lastly, when we don't need it anymore, we unuse it so that it can be destroyed if it isn't anywhere else anymore
MyMaterial.unuse();
```

### Timeout

In the options parameter of `createRef` (2nd parameter), you can specify a timeout that tells how long the reference should wait when it is completely *unused* before unloading the reference:
- `timeout === -1` tells the reference to never unload
- `timeout === 0` tells the reference to immediately unload
- `timeout > 0`: tells the reference to wait for X ms before unloading. If it is used again before the timeout activated, the timeout is cancelled and the reference will not unload.

## Contributors

If you are interested and want to help out, don't hesitate to contact me or to create a pull request with your fixes / features.

The project now also contains samples that you can use to directly test out your features during development.

1. Clone the repository

2. Install dependencies
`npm install install`

4. Launch unit tests situated in *./tests*. The unit tests are written in Jest.
`npm run test:unit`

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
