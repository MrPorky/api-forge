// Internal helper that merges a union of object types into an intersection-like
// structure ensuring missing keys are marked as never.
type _Combine<T, K extends PropertyKey = T extends unknown ? keyof T : never>
  = T extends unknown ? T & Record<Exclude<K, keyof T>, never> : never

/** Merge a union of object types into a single object type (like a deep union). */
export type Combine<T> = { [K in keyof _Combine<T>]: _Combine<T>[K] }

type FilteredKeys<T> = {
  [K in keyof T]: T[K] extends never ? never : K
}[keyof T]

/** Remove keys whose value type resolved to never */
export type RemoveNever<T> = {
  [K in FilteredKeys<T>]: T[K]
}

/** Treat an empty object type {} as never (used for optional input inference) */
export type EmptyObjectIsNever<T> = keyof T extends never ? never : T
