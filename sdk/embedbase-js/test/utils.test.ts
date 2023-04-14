import { camelize } from '../src/utils'

test('camelize should properly turn snake_case to camelCase', () => {
  const obj = {
    snake_case: 'test',
    camelCase: 'test',
    snake_case2: 'test',
    camelCase2: 'test',
  }
  const expected = {
    snakeCase: 'test',
    camelCase: 'test',
    snakeCase2: 'test',
    camelCase2: 'test',
  }
  expect(camelize(obj)).toEqual(expected)
})

test('camelize should properly turn snake_case to camelCase even in nested objects', () => {
  const obj = {
    snake_case: 'test',
    camelCase: 'test',
    snake_case2: 'test',
    camelCase2: 'test',
    nested: {
      snake_case: 'test',
      camelCase: 'test',
      snake_case2: 'test',
      camelCase2: 'test',
    },
  }
  const expected = {
    snakeCase: 'test',
    camelCase: 'test',
    snakeCase2: 'test',
    camelCase2: 'test',
    nested: {
      snakeCase: 'test',
      camelCase: 'test',
      snakeCase2: 'test',
      camelCase2: 'test',
    },
  }
  expect(camelize(obj)).toEqual(expected)
})
