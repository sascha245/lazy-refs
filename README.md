# lazy-refs

## Install

`npm install lazy-refs --save`

## Usage

### API

```ts
export type Ref<T = any> = {
  readonly dependencies: Ref[];
  readonly value: Promise<T | undefined>;
  use(): void;
  unuse(): void;
};
```

### Create a reference

References can return async values

```ts
import { createRef } from 'lazy-refs'

type Texture = {
  id: string;
}

// Create ref with a simple factory
const myTextureRef = createRef(async () => {
  await doSomethingAsync();
  return {
    id: 'myTexture'
  };
});

// Or create ref with options
const myTextureRef = createRef({
  async created(): Promise<Texture> {
    await doSomethingAsync();
    return {
      id: 'myTexture'
    };
  },
  destroyed(value: Texture) {
    // Dispose the texture
  }
});
```

You can also create references that depend on other references.

```ts
type Material = {
  id: string;
  texture?: Texture;
}

const myMaterialRef = createRef({
  created({ texture }) {
    return {
      id: "myMaterial",
      texture
    }
  },
  dependencies: {
    texture: myTextureRef
  }
});
```

### Use the reference

`use`: When the reference is *used* for the first time, it will load the reference: it will automatically call *use* on all of its dependencies and get their values before calling the corresponding factory.


`value`: Getter who returns a promise with the value of the reference. In the case the factory throws an error, the returned value will be `undefined`.

`unuse`: When the reference is *unused* and isn't used anywhere else anymore, it will unload the reference: it will call *unuse* on all of its dependencies and call the *destroyed* function if defined.
The reference is initialized once again when it is used once more.

```ts
// First use the reference, to mark it as used and initialize the value if it hasn't been used yet
myMaterialRef.use();

// We can now get the value
const myMaterial = await myMaterialRef.value();

console.log(myMaterial); // { id: 'myMaterial', texture: { id: 'myTexture' } }

// Lastly, when we don't need it anymore, we unuse it so that it can be destroyed if it isn't used anywhere else anymore
myMaterialRef.unuse();
```

### Timeout

In the options parameter of `createRef` (2nd parameter), you can specify a timeout that tells how long the reference should wait when it is completely *unused* before unloading the reference:
- `timeout === -1` tells the reference to never unload
- `timeout === 0` tells the reference to immediately unload
- `timeout > 0`: tells the reference to wait for X ms before unloading. If it is used again before the timeout activated, the timeout is cancelled and the reference will not unload.

### Loader

In the case you need to load a lot of references at once and track their loading progress, you can use `createLoader`.

```ts
import { createLoader } from 'lazy-refs'

const loader = createLoader([myMaterialRef]);

// Load all specified references
await loader.load((current, total) => {
  console.log("loading progress", current, total);
})

// Unload all specified references
loader.unload();
```

**Note**: The loader also goes deeply through all dependencies of the specified refs. That means that in the example above, the progress function is called twice (for `myTextureRef` and `myMaterialRef`).

## Contributors

If you are interested and want to help out, don't hesitate to contact me or to create a pull request with your fixes / features.

The project now also contains samples that you can use to directly test out your features during development.

1. Clone the repository

2. Install dependencies
`npm install`

4. Launch unit tests situated in *./tests*. The unit tests are written in Jest.
`npm run test:unit`

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
