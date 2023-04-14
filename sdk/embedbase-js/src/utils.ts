export const stringifyList = (list: any[]) => {
  return list.map((item) => JSON.stringify(item))
}

/**
 * Camelize object recursively
 * @param obj
 * @returns
 */
export const camelize = <T>(obj: any): T => {
  if (typeof obj !== 'object' || obj === null) {
    return obj as T
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => camelize(item)) as unknown as T
  }
  const camelized = {}
  for (const key in obj) {
    camelized[camelCase(key)] = camelize(obj[key])
  }
  return camelized as T
}

const camelCase = (str: string) => {
  return str.replace(/([-_][a-z])/gi, ($1) => {
    return $1.toUpperCase().replace('-', '').replace('_', '')
  })
}
