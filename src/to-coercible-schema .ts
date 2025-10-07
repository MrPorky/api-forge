import type { ZodType } from 'zod'
import { z } from 'zod'

/**
 * Recursively traverses a Zod schema and converts primitive types to their
 * coercible counterparts (e.g., z.string() to z.coerce.string()).
 *
 * @param schema The input Zod schema.
 * @returns A new Zod schema with coercion enabled.
 */
export function toCoercibleSchema<T extends ZodType>(schema: T): T {
  // Base case: If the schema is not an object or is null, return it as is.
  if (typeof schema !== 'object' || schema === null) {
    return schema
  }

  // A map of Zod type names to their coercible equivalents.
  const coercionMap = {
    ZodString: z.coerce.string,
    ZodNumber: z.coerce.number,
    ZodBoolean: z.coerce.boolean,
    ZodDate: z.coerce.date,
    ZodBigInt: z.coerce.bigint,
  }

  const typeName = schema.type

  // If the type is a primitive that can be coerced, create the coerced version.
  if (typeName in coercionMap) {
    // Note: This creates a new base coerced schema. It does not preserve
    // existing refinements like .min(), .email(), etc.
    return coercionMap[typeName]()
  }

  // --- Recursive Cases for Wrapper/Container Types ---

  if (typeName === 'ZodObject') {
    const shape = schema._def.shape()
    const newShape = {}
    for (const key in shape) {
      newShape[key] = toCoercibleSchema(shape[key])
    }
    return z.object(newShape) as T
  }

  if (typeName === 'ZodArray') {
    const elementType = schema._def.type
    return z.array(toCoercibleSchema(elementType)) as T
  }

  if (typeName === 'ZodOptional') {
    const innerType = schema._def.innerType
    return toCoercibleSchema(innerType).optional() as T
  }

  if (typeName === 'ZodNullable') {
    const innerType = schema._def.innerType
    return toCoercibleSchema(innerType).nullable() as T
  }

  if (typeName === 'ZodDefault') {
    const innerType = schema._def.innerType
    return toCoercibleSchema(innerType).default(schema._def.defaultValue) as T
  }

  if (typeName === 'ZodUnion') {
    const options = schema._def.options
    const newOptions = options.map(option => toCoercibleSchema(option))
    return z.union(newOptions) as T
  }

  // If the type is not recognized or cannot be coerced (e.g., ZodEnum, ZodAny),
  // return the original schema.
  return schema
}
