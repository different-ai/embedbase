import { splitText } from '../src/split/index'
import { merge } from '../src/split'


describe('Splitting based on max tokens', () => {
  it('splits text into sentences no longer than maxTokens', async () => {
    const text = 'AGI '.repeat(50)
    const chunks = await splitText(text, { maxTokens: 50, chunkOverlap: 0 })

    expect(chunks.map((c) => c.chunk).join('')).toBe(text)
  })
})

it('merge chunks', async () => {
  const text = 'AGI'.repeat(50)
  const chunks = await splitText(text, { maxTokens: 50, chunkOverlap: 0 })
  const merged = await merge(chunks.map((c) => c.chunk), { separator: ''})
  expect(merged).toBe(text)
})

describe('Splitting based on max tokens properly return start and end', () => {
  it('splits text into sentences no longer than maxTokens and return start and end', async () => {
    const text = 'AGI '.repeat(50)
    const chunks = await splitText(text, { maxTokens: 50, chunkOverlap: 0 })

    expect(chunks.map((c) => c.chunk).join('')).toBe(text)
    expect(chunks[0].start).toBe(0)
    expect(chunks[0].end).toBe(99)
    expect(chunks[1].start).toBe(99)
    expect(chunks[1].end).toBe(199)
  })
})
