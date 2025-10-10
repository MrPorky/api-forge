import type { FakeFn } from './generate-mock-api'
import z from 'zod'

export type CollectionOperation = 'list' | 'get' | 'create' | 'update' | 'delete'

interface CollectionMetaBase {
  op: CollectionOperation
}

interface CollectionListMeta extends CollectionMetaBase {
  op: 'list'
}

interface CollectionGetMeta<T extends z.ZodType> extends CollectionMetaBase {
  op: 'get'
  idKey?: keyof z.infer<T> & string
  idParam: string | number
}

interface CollectionCreateMeta<T extends z.ZodType> extends CollectionMetaBase {
  op: 'create'
  data: z.infer<T>
}

interface CollectionUpdateMeta<T extends z.ZodType, K extends keyof z.infer<T>> extends CollectionMetaBase {
  op: 'update'
  idParam: z.infer<T>[K]
  data: Partial<z.infer<T>>
}

export type CollectionMeta<T extends z.ZodType, K extends keyof z.infer<T>> = CollectionListMeta
  | CollectionGetMeta<T>
  | CollectionCreateMeta<T>
  | CollectionUpdateMeta<T, K>
export interface CollectionDefinition<Z extends z.ZodType, K extends keyof z.infer<Z> = keyof z.infer<Z>> {
  size: number
  idKey: K
}

export function defineApiCollection<T extends z.ZodType, K extends keyof z.infer<T>>(schema: T, def: CollectionDefinition<T, K>) {
  return new Collection(schema, def)
}

export class Collection<T extends z.ZodType, K extends keyof z.infer<T>> {
  private readonly schema: T
  private readonly def: CollectionDefinition<T, K>
  private readonly collection: T['_zod']['output'][] = []
  private isInitialized = false

  constructor(schema: T, def: CollectionDefinition<T, K>) {
    this.schema = schema
    this.def = def
  }

  initialize(fake: FakeFn) {
    if (this.isInitialized)
      return

    for (let i = 0; i < this.def.size; i++) {
      this.collection.push(fake(this.schema))
    }

    this.isInitialized = true
  }

  /** Get a clone of the collection */
  getCollection() {
    if (!this.isInitialized)
      throw new Error('Collection not initialized. Call initialize() first.')

    return z.array(this.schema).parse(JSON.parse(JSON.stringify(this.collection)))
  }

  call(meta: CollectionMeta<T, K>) {
    if (!this.isInitialized)
      throw new Error('Collection not initialized. Call initialize() first.')

    if (meta.op === 'list') {
      return this.getCollection()
    }
    else if (meta.op === 'get') {
      return this.getCollection().find(item => item[meta.idKey ?? this.def.idKey] === meta.idParam)
    }
    else if (meta.op === 'create') {
      const newItem = this.schema.parse({})
      this.collection.push(newItem)
      return newItem
    }
  }
}
