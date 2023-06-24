import { describe, expect, jest, test } from '@jest/globals';
import fs from 'fs';
import glob from 'glob';
import path from 'path';
import { createClient } from '../src/index';
import { stream as originalStream } from '../src/utils';

try {
  require('dotenv').config({ path: './.env' })
} catch (e) {
  console.log('No .env file found or dotenv is not installed')
}

const URL = process.env.EMBEDBASE_URL || 'https://api.embedbase.xyz'
const KEY = process.env.EMBEDBASE_API_KEY || 'some.fake.KEY'

const embedbase = createClient(URL, KEY)

const DATASET_NAME = process.env.EMBEDBASE_DATASET || 'unit_test_js'
const TIMEOUT = Number(process.env.EMBEDBASE_TIMEOUT || 0) || 60000


test('it should create the client connection', () => {
  expect(embedbase).toBeDefined()
  expect(embedbase).toBeInstanceOf({}.constructor)
})

test('it should throw an error if no valid params are provided', () => {
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
  }, TIMEOUT)
})

test('should be able to add elements to a dataset,   ', async () => {
  const embedbase = createClient(URL, KEY)
  await embedbase.dataset(DATASET_NAME).clear()
  // just used to make sure we're creating new datasets
  const data = await embedbase.dataset(DATASET_NAME).add('hello')
  expect(data).toBeDefined()
  expect(data).toHaveProperty('id')
  expect(data).toHaveProperty('embedding')
}, TIMEOUT)


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
  await embedbase.dataset(DATASET_NAME).clear()
  const data = await embedbase
    .dataset(DATASET_NAME)
    .batchAdd(inputs.map((input) => ({ data: input })))
  expect(data).toBeDefined()
  expect(data).toBeInstanceOf(Array)
  expect(data).toHaveLength(10)
}, TIMEOUT)

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
  await embedbase.dataset(DATASET_NAME).clear()
  const data = await embedbase.dataset(DATASET_NAME).batchAdd(
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
}, TIMEOUT)

test('should return an array of similarities', async () => {
  const embedbase = createClient(URL, KEY)
  await embedbase.dataset(DATASET_NAME).clear()
  await embedbase.dataset(DATASET_NAME).add('hello')

  const data = await embedbase.dataset(DATASET_NAME).search('hello')
  console.log(data)

  expect(data).toBeDefined()
  expect(data).toBeInstanceOf(Array)
  expect(data[0]).toHaveProperty('score')
  expect(data[0]).toHaveProperty('data')
  expect(data[0]).toHaveProperty('embedding')
  expect(data[0]).toHaveProperty('hash')
  expect(data[0].data).toBe('hello')
}, TIMEOUT)

test('should return an array of similarities with metadata', async () => {
  const embedbase = createClient(URL, KEY)
  await embedbase.dataset(DATASET_NAME).clear()
  await embedbase.dataset(DATASET_NAME).add('hello', {
    timestamp: new Date().getTime(),
  })
  const data = await embedbase.dataset(DATASET_NAME).search('hello')
  console.log(data)

  expect(data).toBeDefined()
  expect(data).toBeInstanceOf(Array)
  expect(data[0]).toHaveProperty('metadata')
}, TIMEOUT)

// this is not striclty to just a simplification for our tests
test('should use return equal element of top_k', async () => {
  const embedbase = createClient(URL, KEY)

  await embedbase.dataset(DATASET_NAME).clear()
  await embedbase.dataset(DATASET_NAME).add('the tiger is the biggest cat')
  await embedbase.dataset(DATASET_NAME).add('the butterfly is the smallest cat')
  const data = await embedbase.dataset(DATASET_NAME).search('cats', { limit: 5 })

  expect(data).toBeDefined()
  expect(data).toBeInstanceOf(Array)
  expect(data).toHaveLength(2)
}, TIMEOUT)

test('should return a list of strings when using createContext', async () => {
  const embedbase = createClient(URL, KEY)
  await embedbase.dataset(DATASET_NAME).clear()
  await embedbase.dataset(DATASET_NAME).add('the tiger is the biggest cat')
  await embedbase.dataset(DATASET_NAME).add('the butterfly is the smallest cat')
  const data = await embedbase.dataset(DATASET_NAME).createContext('test', { limit: 10 })

  expect(data).toBeDefined()
  expect(data).toHaveLength(2)
}, TIMEOUT)

test('should return a list of datasets', async () => {
  const embedbase = createClient(URL, KEY)
  // TODO clear dataset first
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
}, TIMEOUT)
test('should be able to filter by metadata using where', async () => {
  const embedbase = createClient(URL, KEY)

  const d = [
    {
      "data": "Alice invited Bob at 6 PM at the restaurant",
      "metadata": { "source": "notion.so", "path": "https://notion.so/alice" },
    },
    {
      "data": "John pushed code on github at 8 AM",
      "metadata": {
        "source": "github.com",
        "path": "https://github.com/john/john",
      },
    },
    {
      "data": "The lion is the king of the savannah.",
      "metadata": {
        "source": "wikipedia.org",
        "path": "https://en.wikipedia.org/wiki/Lion",
      },
    },
  ]

  await Promise.all(d.map((input) =>
    embedbase.dataset('unit').add(input.data, input.metadata)))

  const data = await embedbase
    .dataset('unit')
    .search('Time related')
    .where('source', '==', 'github.com')

  expect(data).toBeDefined()
  expect(data).toBeInstanceOf(Array)
  expect(data.length).toBeGreaterThanOrEqual(1)
  expect(data[0].metadata).toHaveProperty('source', 'github.com')
}, TIMEOUT)

test('should be able to chat', async () => {
  for await (const res of embedbase.useModel('bigscience/bloomz-7b1').streamText('tell a story', {
    maxNewTokens: 10,
  })) {
    expect(res).toBeDefined()
    console.log(res)
  }
}, TIMEOUT)

test.skip('should receive maxed out plan error', async () => {
  // TODO: automatically make this key bankrupt on month start or mock http error
  const bankruptBase = createClient(URL, process.env.BANKRUPT_EMBEDBASE_KEY)

  // const e = async () => {
  //   for await (const res of bankruptBase.generate('hello')) {
  //     expect(res).toBeDefined()
  //   }
  // }
  // // run 50 time to max out plan
  // Promise.all(Array(50).fill(0).map(() => e()))

  try {
    for await (const res of bankruptBase.useModel('bigscience/bloomz-7b1').streamText('hello')) {
      // Execution should not reach here, so the test will fail if it does
      expect(false).toBe(true);
    }
  } catch (error) {
    // Check if the error is an instance of Response and has the desired status
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Plan limit exceeded, please upgrade on the dashboard. If you are building open-source, please contact us at louis@embedbase.xyz")
  }
}, TIMEOUT)


const errorStatusCodes = [500, 401, 402];


describe('API error handling tests', () => {
  test(`should handle API crashing with Response error`, async () => {
    errorStatusCodes.forEach(async (statusCode) => {

      // Manually mock the stream function for this test
      const streamMock = jest.fn(() => {
        return (async function* () {
          throw new Error(JSON.stringify({ error: 'some error' }));
        })();
      });

      // Replace the original stream function with the mock
      jest.spyOn(require('../src/utils'), 'stream').mockImplementation(streamMock);


      try {
        for await (const res of embedbase.useModel('bigscience/bloomz-7b1').streamText('hello')) {
          // Execution should not reach here, so the test will fail if it does
          expect(false).toBe(true);
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    // Restore the original stream function implementation after the test
    // @ts-ignore
    jest.spyOn(require('../src/utils'), 'stream').mockImplementation(originalStream);
  }, TIMEOUT);


});

test('should be able to list documents', async () => {
  // first add some documents, then list
  const embedbase = createClient(URL, KEY)
  await embedbase.dataset(DATASET_NAME).clear()
  await embedbase.dataset(DATASET_NAME).add('hello')
  await embedbase.dataset(DATASET_NAME).add('hello1')
  await embedbase.dataset(DATASET_NAME).add('hello2')

  let documents = await embedbase.dataset(DATASET_NAME).list().offset(0).limit(3)
  expect(documents).toBeDefined()
  expect(documents).toBeInstanceOf(Array)
  expect(documents.length).toBeGreaterThanOrEqual(3)

  documents = await embedbase.dataset(DATASET_NAME).list().offset(0).limit(2)
  expect(documents.length).toEqual(2)

  documents = await embedbase.dataset(DATASET_NAME).list().offset(1).limit(2)
  expect(documents.length).toEqual(2)
}, TIMEOUT)

test('should be able to clear dataset', async () => {
  const embedbase = createClient(URL, KEY)
  await embedbase.dataset(DATASET_NAME).clear()
  await embedbase.dataset(DATASET_NAME).add('hello')
  let documents = await embedbase.dataset(DATASET_NAME).list()
  expect(documents).toBeDefined()
  expect(documents).toBeInstanceOf(Array)
  expect(documents.length).toEqual(1)
  await embedbase.dataset(DATASET_NAME).clear()
  documents = await embedbase.dataset(DATASET_NAME).list()
  expect(documents).toBeDefined()
  expect(documents).toBeInstanceOf(Array)
  expect(documents.length).toEqual(0)
}, TIMEOUT)


test('should be able to update dataset', async () => {
  const embedbase = createClient(URL, KEY)
  await embedbase.dataset(DATASET_NAME).clear()
  const result = await embedbase.dataset(DATASET_NAME).add('hello')
  expect(result).toBeDefined()
  expect(result).toHaveProperty('id')
  const updateResult = await embedbase.dataset(DATASET_NAME).update([{
    id: result.id,
    data: 'hello world'
  }])
  expect(updateResult).toBeDefined()
  expect(updateResult.length).toEqual(1)
  expect(updateResult[0].data).toEqual('hello world')

  const searchResult = await embedbase.dataset(DATASET_NAME).search('hello world')
  expect(searchResult).toBeDefined()
  expect(searchResult[0].id).toEqual(result.id)
}, TIMEOUT)

test('should be able to search the internet', async () => {
  const result = await embedbase.internetSearch('qlora paper')
  expect(result).toBeDefined()
  expect(result).toBeInstanceOf(Array)
  expect(result.length).toBeGreaterThanOrEqual(1)
}, TIMEOUT)

test('should be able to chunkAndBatchAdd', async () => {
  // very long documents
  const documents = [
    {
      data: Array(1000).fill('hello').join(' '),
      metadata: {
        hello: 'world'
      }
    },
    {
      data: Array(1000).fill('hella').join(' '),
      metadata: {
        hello: 'world'
      }
    }
  ]
  await embedbase.dataset(DATASET_NAME).clear()
  const result = await embedbase.dataset(DATASET_NAME).chunkAndBatchAdd(documents)
  expect(result).toBeDefined()
}, TIMEOUT)

test('should provide clear error message', async () => {
  // very long documents
  const documents = [
    {
      foo: 'bar'
    }
  ]
  await embedbase.dataset(DATASET_NAME).clear()

  try {
    // @ts-ignore
    const results = await embedbase.dataset(DATASET_NAME).batchAdd(documents)
    expect(false).toBe(true)
  } catch (error) {
    expect(error.message).toBe('body.documents.0.data: field required')
  }
}, TIMEOUT)

test('should be able to generate text sync', async () => {
  const res = await embedbase.useModel('bigscience/bloomz-7b1').generateText('1+1=', {
    maxNewTokens: 10,
  })
  expect(res).toBeDefined()
}, TIMEOUT)


test('should be able to replace my documents', async () => {
  const documents = [
    {
      data: 'Nietzsche - Thus Spoke Zarathustra - Man is a rope, tied between beast and overman — a rope over an abyss.',
      metadata: {
        source: 'notion.so',
      },
    },
    {
      data: 'Marcus Aurelius - Meditations - He who lives in harmony with himself lives in harmony with the universe',
      metadata: {
        source: 'notion.so',
      },
    }
  ]
  await embedbase.dataset(DATASET_NAME).clear()
  let res = await embedbase.dataset(DATASET_NAME).chunkAndBatchAdd(documents)

  expect(res).toBeDefined()
  expect(res.length).toBe(2)
  expect(res[0].data).toContain('Nietzsche')
  expect(res[0].data).toContain('abyss')
  expect(res[1].data).toContain('Marcus')

  res = await embedbase.dataset(DATASET_NAME).replace([{
    data: 'Nietzsche - Thus Spoke Zarathustra - One must have chaos within oneself, to give birth to a dancing star.'
  }, {
    data: 'Marcus Aurelius - Meditations - The happiness of your life depends upon the quality of your thoughts.'
  }], 'source', '==', 'notion.so')

  expect(res).toBeDefined()
  expect(res.length).toBe(2)
  expect(res[0].data).toContain('Nietzsche')
  expect(res[0].data).toContain('dancing')
  expect(res[1].data).toContain('Marcus')
  expect(res[1].data).toContain('thoughts')

  res = await embedbase.dataset(DATASET_NAME).search('Nietzsche', { limit: 1 }).where('source', '==', 'notion.so')

  expect(res).toBeDefined()
  expect(res.length).toBe(1)
  expect(res[0].data).toContain('dancing')
}, TIMEOUT)

test.skip('large documents shouldnt crash javascript heap', async () => {

  const ignored = [
    "node_modules",
    "dist",
    "build",
    "public",
    "env",
    ".next",
    ".git",
  ];
  // read all files under pages/* with .md, .mdx, .ts, .py extension
  const filePaths = glob.sync("../../**/*.{md,mdx,ts,py}")
    .filter((p) => !ignored.some((i) => p.includes(i)) &&
      // Check if the path is a file
      fs.statSync(p).isFile());

  const documents = filePaths
    .map((p) => ({
      path:
        // if the file is under docs/ folder, then
        // it is docs (docs.embedbase.xyz)
        p.includes("docs/") ?
          path.join(
            "https://docs.embedbase.xyz",
            p.replace("../", "")
              .replace("pages/", "/")
              .replace("index.mdx", "")
              .replace(".mdx", "")
          ) :
          // otherwise it is https://github.com/different-ai/embedbase
          path.join(
            "https://github.com/different-ai/embedbase/blob/main",
            p.replace("../", "")
          ),
      // content of the file
      data: fs.readFileSync(p, "utf-8")
    }));

  // await Promise.all(documents.map((doc) => splitText(doc.data)))
  await embedbase.dataset(DATASET_NAME).clear()
  await embedbase.dataset(DATASET_NAME).chunkAndBatchAdd(documents.filter((d) => !d.data.includes("<|endoftext|>")))
  expect(true).toBe(true)
}, TIMEOUT * 10)

