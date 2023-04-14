import { readFileSync } from 'fs'
import path from 'path'
import { getChunksSimple, getChunksByNewLine, getChunksByPython, splitText } from '../src/split/index'
import { merge } from '../src/split/token'

describe('Split text in sentence and with a param for maxChar', () => {
  it('splits text into sentences no longer than maxChars', () => {
    // read file from ../samples/sample.txt
    const text = readFileSync(path.join(__dirname, './samples/sample.txt'), 'utf8')
    expect(text).toBeDefined()
    const chunks = getChunksSimple({ text, maxCharLength: 100 })
    expect(chunks.length).toBe(41)
  })
})

describe('Splitting based on max tokens', () => {
  it('splits text into sentences no longer than maxTokens', () => {
    const text = 'AGI '.repeat(50)
    // const chunks: string[] = [];
    const chunks = splitText(text, { maxTokens: 50, chunkOverlap: 0 })

    expect(chunks.map((c) => c.chunk).join('')).toBe(text)
  })
})

it('merge chunks', async () => {
  const text = 'AGI'.repeat(50)
  const chunks = splitText(text, { maxTokens: 50, chunkOverlap: 0 })
  const merged = await merge(chunks.map((c) => c.chunk), { separator: ''})
  expect(merged).toBe(text)
})

describe('Split based on new line', () => {
  it('splits text based on new line', () => {
    const text = readFileSync(path.join(__dirname, './samples/sample.ts'), 'utf8')
    // just read the file and count the number of lines
    const textLines = 937
    const chunks = getChunksByNewLine(text)
    expect(chunks).toHaveLength(textLines)
    expect(chunks.join('\n')).toBe(text)
  })
})

describe('Split based on python functions', () => {
  it('splits text based on python functions', () => {
    const text = readFileSync(path.join(__dirname, './samples/sample.py'), 'utf8')
    // i counted the number of functions in the file
    const functionCount = 18
    const chunks = getChunksByPython(text)
    expect(chunks).toHaveLength(functionCount)
  })
})

describe('Splitting based on max tokens properly return start and end', () => {
  it('splits text into sentences no longer than maxTokens and return start and end', () => {
    const text = 'AGI '.repeat(50)
    // const chunks: string[] = [];
    const chunks = splitText(text, { maxTokens: 50, chunkOverlap: 0 })

    expect(chunks.map((c) => c.chunk).join('')).toBe(text)
    expect(chunks[0].start).toBe(0)
    expect(chunks[0].end).toBe(50)
    expect(chunks[1].start).toBe(50)
    expect(chunks[1].end).toBe(100)
  })
})
