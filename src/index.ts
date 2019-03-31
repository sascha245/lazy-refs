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

function loadDeps(deps: Array<Ref<any>>) {
  return Promise.all(deps.map(dep => dep.use()));
}
function loadFactory<T = any>(
  depsValues: any,
  factory: RefFactory<T, any>
): Promise<RefFactoryResult<T>> {
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
function isPromise(obj: any): obj is Promise<any> {
  return obj && typeof obj.then === 'function';
}

export interface Ref<T> {
  use(): Promise<T | undefined>;
  unuse(): void;
}

/**
 * TODO
 * debugging utils
 * ref group? for options sharing
 */

export function createRef<T, V = []>(
  factory: RefFactory<T, V>,
  options: RefOptions<V> = {}
): Ref<T> {
  // Options
  const _deps = (options.deps || []) as Array<Ref<any>>;
  const _timeout = options.timeout === undefined ? 5000 : Math.max(-1, options.timeout);

  // Private instance variables
  let _timeoutHandle: number | undefined;
  let _promise: Promise<any> = Promise.resolve();
  let _onDestroy: OnDestroy | undefined;
  let _vmCount: number = 0;

  function loadRef() {
    return loadDeps(_deps)
      .then(values => loadFactory(values, factory))
      .then(result => {
        _onDestroy = result.destroy;
        return result.value;
      });
  }

  function unloadRef() {
    _deps.map(dep => dep.unuse());
    _timeoutHandle = undefined;

    if (_onDestroy) {
      const result = _onDestroy!();
      if (isPromise(result)) {
        console.log('on destroy returned a promise');
        _promise = _promise.then(() => result);
      }
      _onDestroy = undefined;
    }
  }

  // Public API
  return Object.freeze({
    use(): Promise<T | undefined> {
      console.log('use', _vmCount);
      if (++_vmCount > 1) {
        return _promise;
      }
      if (_timeoutHandle) {
        console.log('reset handle timeout');
        clearTimeout(_timeoutHandle as any);
        _timeoutHandle = undefined;
        return _promise;
      }
      console.log('init value');
      return (_promise = _promise.then(() => loadRef()));
    },
    unuse() {
      console.log('unuse');
      _promise.then(() => {
        console.log('then unuse', _vmCount);
        if (_vmCount > 0 && --_vmCount === 0) {
          if (_timeout === 0) {
            console.log('handle immediate timeout');
            unloadRef();
          } else if (_timeout > 0) {
            console.log('start timeout');
            // Only called when not used for 'timeout' milliseconds
            _timeoutHandle = setTimeout(() => {
              console.log('handle timeout');
              unloadRef();
            }, _timeout) as any;
          } else {
            console.log('no timeout');
          }
        }
      });
    }
  });
}
