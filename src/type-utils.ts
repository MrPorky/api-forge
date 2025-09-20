type _Combine<T, K extends PropertyKey = T extends unknown ? keyof T : never>
  = T extends unknown ? T & Record<Exclude<K, keyof T>, never> : never

export type Combine<T> = { [K in keyof _Combine<T>]: _Combine<T>[K] }

type FilteredKeys<T> = {
  [K in keyof T]: T[K] extends never ? never : K
}[keyof T]

export type RemoveNever<T> = {
  [K in FilteredKeys<T>]: T[K]
}

export type EmptyObjectIsNever<T> = keyof T extends never ? never : T
