type OnDestroy = () => void | Promise<void>;
type ValuesToRefs<T> = { [P in keyof T]: Ref<T[P]> };
type PartialValues<T> = { [P in keyof T]: T[P] | undefined };

export type RefFactoryResult<T> = {
  value?: T;
  destroy?: OnDestroy;
};

export type RefFactory<T, V> = (
  deps: PartialValues<V>
) => RefFactoryResult<T> | Promise<RefFactoryResult<T>>;

export type RefOptions<V> = {
  deps?: ValuesToRefs<V>;
  timeout?: number;
};

export type Ref<T> = {
  use(): void;
  unuse(): void;
  value(): Promise<T | undefined>;
};

function isPromise(obj: any): obj is Promise<any> {
  return obj && typeof obj.then === 'function';
}
function loadDeps(deps: Array<Ref<any>>): Promise<any[]> {
  deps.map(dep => dep.use());
  return Promise.all(deps.map(dep => dep.value()));
}
function loadFactory(
  depsValues: any,
  factory: RefFactory<any, any>
): Promise<RefFactoryResult<any>> {
  try {
    const result = factory(depsValues);
    return isPromise(result) ? result : Promise.resolve(result);
  } catch {
    return Promise.resolve({
      value: undefined,
      destroy: undefined
    });
  }
}

export function createRef<T, V = []>(
  factory: RefFactory<T, V>,
  options: RefOptions<V> = {}
): Ref<T> {
  // Options
  const _deps = (options.deps || []) as Array<Ref<any>>;
  const _timeout = options.timeout === undefined ? 5000 : Math.max(-1, options.timeout);

  // Private instance variables
  let _timeoutHandle: number | undefined;
  let _promise: Promise<T | undefined> = Promise.resolve(undefined);
  let _onDestroy: OnDestroy | undefined;
  let _useCount: number = 0;

  // Private instance methods
  function loadRef() {
    return loadDeps(_deps)
      .then(values => loadFactory(values, factory))
      .then(result => {
        _onDestroy = result.destroy;
        return result.value;
      });
  }

  function unloadRef(): Promise<undefined> {
    _deps.forEach(dep => dep.unuse());
    _timeoutHandle = undefined;

    if (_onDestroy) {
      const result = _onDestroy();
      _onDestroy = undefined;
      return isPromise(result) ? result.then(() => undefined) : Promise.resolve(undefined);
    }
    return Promise.resolve(undefined);
  }

  // Public instance methods
  return Object.freeze({
    use() {
      if (++_useCount > 1) {
        return;
      }
      if (_timeoutHandle) {
        clearTimeout(_timeoutHandle as any);
        _timeoutHandle = undefined;
        return;
      }
      _promise = _promise.then(() => loadRef());
    },
    value() {
      return _promise;
    },
    unuse() {
      if (_useCount > 0 && --_useCount === 0) {
        if (_timeout === 0) {
          _promise = _promise.then(() => unloadRef());
        } else if (_timeout > 0) {
          setTimeout(() => {
            _promise = _promise.then(() => unloadRef());
          }, _timeout);
        }
      }
    }
  });
}
