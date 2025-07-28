/**
 * Get a union of all keys in {@linkcode T} that are required and whose values
 * are not `never` and not assignable to `undefined`.
 */
export type RequiredValueKey<T> = keyof {
  [K in keyof T as [T[K]] extends [never]
    ? never
    : undefined extends T[K]
      ? never
      : K]: unknown;
};

/**
 * Get a union of all keys in {@linkcode T} that are optional or whose values
 * are `never` or assignable to `undefined`.
 */
export type OptionalValueKey<T> = keyof {
  [K in Exclude<keyof T, RequiredValueKey<T>>]: unknown;
};
