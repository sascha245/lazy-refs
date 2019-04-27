type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type RefValue<T> = T extends Ref<infer V> ? UnwrapPromise<V> : never;
type RefValues<TDeps> = { [P in keyof TDeps]: RefValue<TDeps[P]> };

type Optional<T> = T | undefined;
type MaybePromise<T> = Promise<T> | T;

type RefCreated<TValue, TDeps> = (dependencies: RefValues<TDeps>) => MaybePromise<Optional<TValue>>;
type RefDestroyed<TValue> = (value: TValue) => MaybePromise<void>;

type RefDependencies = { [key: string]: Optional<Ref> };
type FilteredDependenciesMap = Map<string, Ref>;

export type RefOptions<TValue, TDeps> = {
  created?: RefCreated<TValue, TDeps>;
  destroyed?: RefDestroyed<TValue>;
  dependencies?: TDeps;
  timeout?: number;
};

export type Ref<TValue = any> = {
  readonly dependencies: Ref[];
  readonly value: Promise<UnwrapPromise<Optional<TValue>>>;
  use(): void;
  unuse(): void;
};

function isPromise(obj: any): obj is Promise<any> {
  return obj && typeof obj.then === 'function';
}
function isRef(obj: any): obj is Ref {
  return obj && typeof obj.use === 'function';
}
function promisify<T>(value: Promise<T> | T): Promise<T> {
  return isPromise(value) ? value : Promise.resolve(value);
}
function loadDeps(deps: FilteredDependenciesMap): Promise<object> {
  const result: object = {};
  const promises: Promise<any>[] = [];
  deps.forEach((dep, key) => {
    dep.use();
    promises.push(dep.value.then(val => (result[key] = val)));
  });
  return Promise.all(promises).then(() => result);
}

function safeCallback<TRet>(fn: Function, param: any): Promise<Optional<TRet>> {
  try {
    return promisify(fn(param));
  } catch {
    return promisify(undefined);
  }
}

function assert(condition: boolean, message: string) {
  if (condition) {
    throw new Error(message);
  }
}

function getDependenciesMap(deps: RefDependencies): FilteredDependenciesMap {
  return new Map(Object.entries(deps).filter(([key, dep]) => isRef(dep)) as Array<[string, Ref]>);
}

export function createRef<TValue, TDeps extends RefDependencies = {}>(
  options: RefOptions<TValue, TDeps>
): Ref<TValue>;
export function createRef<TValue, TDeps extends RefDependencies = {}>(
  factory: RefCreated<TValue, TDeps>
): Ref<TValue>;
export function createRef<TValue, TDeps extends RefDependencies = {}>(
  factoryOrOptions: RefCreated<TValue, TDeps> | RefOptions<TValue, TDeps>
) {
  assert(!factoryOrOptions, 'Invalid argument');

  const options: RefOptions<TValue, TDeps> =
    typeof factoryOrOptions === 'function' ? { created: factoryOrOptions } : factoryOrOptions;
  const deps = getDependenciesMap(options.dependencies || {});
  const depsArray: Ref[] = Array.from(deps.values());
  const timeout = options.timeout === undefined ? 0 : Math.max(-1, options.timeout);

  // Private instance variables
  let value: Promise<Optional<TValue>> = Promise.resolve(undefined);
  let timeoutHandle: Optional<number>;
  let useCount: number = 0;

  // Private instance methods
  function loadRef(values: object): Promise<Optional<TValue>> {
    if (options.created) {
      return safeCallback<TValue>(options.created, values);
    }
    return Promise.resolve(undefined);
  }

  function unloadRef(val: Optional<TValue>): Promise<undefined> {
    deps.forEach(dep => dep.unuse());
    timeoutHandle = undefined;

    const empty = Promise.resolve(undefined);
    if (options.destroyed && val !== undefined) {
      return safeCallback(options.destroyed, val).then(() => empty);
    }
    return empty;
  }

  return Object.freeze({
    get value() {
      return value;
    },
    get dependencies() {
      return depsArray;
    },
    use() {
      if (++useCount > 1) {
        return;
      }
      if (timeoutHandle) {
        clearTimeout(timeoutHandle as any);
        timeoutHandle = undefined;
        return;
      }
      value = value.then(() => loadDeps(deps)).then(loadRef);
    },
    unuse() {
      if (useCount > 0 && --useCount === 0) {
        if (timeout === 0) {
          value = value.then(val => unloadRef(val));
        } else if (timeout > 0) {
          setTimeout(() => {
            value = value.then(val => unloadRef(val));
          }, timeout);
        }
      }
    }
  });
}
