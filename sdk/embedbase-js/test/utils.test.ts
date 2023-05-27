import { expect, test } from '@jest/globals';
import { batch, camelize } from '../src/utils';

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

test('batch should properly return results', async () => {
  const fn = async (arg: string[]) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        return resolve('foo' + arg.join(','))
      }, Math.random() * 100)
    })
  }

  const results = await batch(Array(10).fill('bar'), fn, 2)

  expect(results).toEqual([
    "foobar,bar",
    "foobar,bar",
    "foobar,bar",
    "foobar,bar",
    "foobar,bar",
  ])
})
