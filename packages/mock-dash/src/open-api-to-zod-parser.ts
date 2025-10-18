import * as fs from 'node:fs'
// import * as yaml from ''
import { z } from 'zod'

// This function is the core of the parser. It recursively converts an
// OpenAPI schema object into a Zod schema object.
function openApiSchemaToZod(schema: any): z.ZodTypeAny {
  // Base case: if the schema is not an object, we can't process it.
  if (typeof schema !== 'object' || schema === null) {
    return z.any()
  }

  // Handle nullable schemas
  const isNullable = schema.nullable === true
  let zodSchema: z.ZodTypeAny

  switch (schema.type) {
    case 'string':
      zodSchema = z.string()
      if (schema.format === 'email')
        zodSchema = (zodSchema as z.ZodString).email()
      if (schema.format === 'uuid')
        zodSchema = (zodSchema as z.ZodString).uuid()
      if (schema.format === 'date-time')
        zodSchema = (zodSchema as z.ZodString).datetime()
      // Add other string formats as needed (url, etc.)
      break

    case 'number':
    case 'integer':
      zodSchema = z.number()
      if (schema.type === 'integer')
        zodSchema = (zodSchema as z.ZodNumber).int()
      break

    case 'boolean':
      zodSchema = z.boolean()
      break

    case 'object':
    {
      const shape: { [key: string]: z.ZodType } = {}
      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          const isRequired = schema.required?.includes(key)
          let propZodSchema = openApiSchemaToZod(propSchema as any)
          if (!isRequired) {
            propZodSchema = propZodSchema.optional()
          }
          shape[key] = propZodSchema
        }
      }
      zodSchema = z.object(shape)
      break
    }

    case 'array':
      if (schema.items) {
        const itemSchema = openApiSchemaToZod(schema.items)
        zodSchema = z.array(itemSchema)
      }
      else {
        zodSchema = z.array(z.any())
      }
      break

    default:
      zodSchema = z.any()
      break
  }

  return isNullable ? zodSchema.nullable() : zodSchema
}

// Main function to parse the entire OpenAPI file
export function parseOpenApi(filePath: string) {
  const fileContents = fs.readFileSync(filePath, 'utf8')
  // const spec = yaml.load(fileContents) as any
  const spec = JSON.parse(fileContents)

  if (!spec.paths) {
    throw new Error('No paths found in the OpenAPI specification.')
  }

  const allSchemas: { [key: string]: any } = {}

  // Iterate over all paths
  for (const path in spec.paths) {
    const pathItem = spec.paths[path]

    // Iterate over all HTTP methods (get, post, etc.)
    for (const method in pathItem) {
      const endpoint = pathItem[method]
      const endpointKey = `${method.toUpperCase()} ${path}`

      const endpointSchema: any = {
        input: {},
        response: {},
      }

      // 1. Process parameters (query, path/param)
      if (endpoint.parameters) {
        const queryParams: { [key: string]: z.ZodTypeAny } = {}
        const pathParams: { [key: string]: z.ZodTypeAny } = {}

        for (const param of endpoint.parameters) {
          let paramSchema = openApiSchemaToZod(param.schema)
          if (!param.required) {
            paramSchema = paramSchema.optional()
          }

          if (param.in === 'query') {
            queryParams[param.name] = paramSchema
          }
          else if (param.in === 'path') {
            pathParams[param.name] = paramSchema
          }
        }

        if (Object.keys(queryParams).length > 0) {
          endpointSchema.input.query = z.object(queryParams)
        }
        if (Object.keys(pathParams).length > 0) {
          endpointSchema.input.param = z.object(pathParams)
        }
      }

      // 2. Process requestBody (json, form)
      if (endpoint.requestBody) {
        const jsonSchema = endpoint.requestBody.content?.['application/json']?.schema
        if (jsonSchema) {
          endpointSchema.input.json = openApiSchemaToZod(jsonSchema)
        }
        // You can add logic here for 'application/x-www-form-urlencoded' if needed
      }

      // 3. Process responses
      if (endpoint.responses) {
        for (const statusCode in endpoint.responses) {
          const response = endpoint.responses[statusCode]
          const jsonSchema = response.content?.['application/json']?.schema
          if (jsonSchema) {
            endpointSchema.response[statusCode] = openApiSchemaToZod(jsonSchema)
          }
        }
      }

      allSchemas[endpointKey] = endpointSchema
    }
  }

  return allSchemas
}
