import { createClient } from '../src/index'

try {
  require('dotenv').config({ path: './.env' })
} catch (e) {
  console.log('No .env file found or dotenv is not installed')
}

const URL = process.env.EMBEDBASE_URL || 'https://api.embedbase.xyz'
const KEY = process.env.EMBEDBASE_API_KEY || 'some.fake.KEY'

const embedbase = createClient(URL, KEY)
const RANDOM_DATASET_NAME = new Date().getTime().toString()

test('it should create the client connection', async () => {
  expect(embedbase).toBeDefined()
  expect(embedbase).toBeInstanceOf({}.constructor)
})

test('it should throw an error if no valid params are provided', async () => {
  expect(() => createClient('', KEY)).toThrowError('embedbaseUrl is required.')
})

describe('Check if headers are set', () => {
  test('should have auth header set set', () => {
    const header = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

    const request = createClient(URL, KEY)

    // @ts-ignore
    const getHeaders = request.headers

    expect(getHeaders).toHaveProperty('Authorization', header.Authorization)
    expect(getHeaders).toHaveProperty('Content-Type', header['Content-Type'])
  })
})

describe('Check if the client is able to fetch data', () => {
  test('should be able to add elements to a dataset,   ', async () => {
    const embedbase = createClient(URL, KEY)
    // just used to make sure we're creating new datasets
    const data = await embedbase.dataset(RANDOM_DATASET_NAME).add('hello')
    expect(data).toBeDefined()
    expect(data).toHaveProperty('id')
    expect(data).toHaveProperty('status')
  })

  test('should be able to batch add elements to a dataset', async () => {
    const embedbase = createClient(URL, KEY)
    const inputs = [
      'test',
      'my',
      'love',
      'hello',
      'world',
      'wtest',
      'helloooo',
      'johny',
      'continue',
      'jurassic',
    ]
    const data = await embedbase
      .dataset(RANDOM_DATASET_NAME)
      .batchAdd(inputs.map((input) => ({ data: input })))
    expect(data).toBeDefined()
    expect(data).toBeInstanceOf(Array)
    expect(data).toHaveLength(10)
  })

  test('should be able to batch add elements with metadata to a dataset', async () => {
    const embedbase = createClient(URL, KEY)
    const inputs = [
      'test',
      'my',
      'love',
      'hello',
      'world',
      'wtest',
      'helloooo',
      'johny',
      'continue',
      'jurassic',
    ]
    const data = await embedbase.dataset(RANDOM_DATASET_NAME).batchAdd(
      inputs.map((input) => ({
        data: input,
        metadata: {
          timestamp: new Date().getTime(),
        },
      }))
    )
    expect(data).toBeDefined()
    expect(data).toBeInstanceOf(Array)
    expect(data).toHaveLength(10)
  })

  test('should return an array of similarities', async () => {
    const embedbase = createClient(URL, KEY)
    await embedbase.dataset(RANDOM_DATASET_NAME).add('hello')

    const data = await embedbase.dataset(RANDOM_DATASET_NAME).search('hello')
    console.log(data)

    expect(data).toBeDefined()
    expect(data).toBeInstanceOf(Array)
    expect(data[0]).toHaveProperty('score')
    expect(data[0]).toHaveProperty('data')
    expect(data[0]).toHaveProperty('embedding')
    expect(data[0]).toHaveProperty('hash')
    expect(data[0].data).toBe('hello')
  })

  test('should return an array of similarities with metadata', async () => {
    const embedbase = createClient(URL, KEY)
    await embedbase.dataset(RANDOM_DATASET_NAME).add('hello', {
      timestamp: new Date().getTime(),
    })
    const data = await embedbase.dataset(RANDOM_DATASET_NAME).search('hello')
    console.log(data)

    expect(data).toBeDefined()
    expect(data).toBeInstanceOf(Array)
    expect(data[0]).toHaveProperty('metadata')
  })

  // this is not striclty to just a simplification for our tests
  test('should use return equal element of top_k', async () => {
    const embedbase = createClient(URL, KEY)

    const data = await embedbase.dataset(RANDOM_DATASET_NAME).search('test', { limit: 10 })

    expect(data).toBeDefined()
    expect(data).toBeInstanceOf(Array)
    expect(data).toHaveLength(10)
  })

  test('should return a list of strings when using createContext', async () => {
    const embedbase = createClient(URL, KEY)

    const data = await embedbase.dataset(RANDOM_DATASET_NAME).createContext('test', { limit: 10 })

    expect(data).toBeDefined()
    expect(data).toHaveLength(10)
  })

  test('should return a list of datasets', async () => {
    const embedbase = createClient(URL, KEY)

    await Promise.all([
      embedbase.dataset('foo').add('test'),
      embedbase.dataset('bar').add('test'),
      embedbase.dataset('baz').add('test'),
    ])

    const data = await embedbase.datasets()

    expect(data).toBeDefined()
    expect(data).toBeInstanceOf(Array)
    expect(data.length).toBeGreaterThanOrEqual(3)
    const datasetIds = data.map((dataset) => dataset.datasetId)
    expect(datasetIds).toContain('foo')
    expect(datasetIds).toContain('bar')
    expect(datasetIds).toContain('baz')
  })
})
