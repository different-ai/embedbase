import { describe, expect, it } from '@jest/globals';
import { merge } from '../src/split';
import { splitText } from '../src/split/index';


describe('Splitting based on max tokens', () => {
  it('splits text into sentences no longer than maxTokens', async () => {
    const text = 'AGI '.repeat(50)
    const chunks = await splitText(text, { chunkSize: 50, chunkOverlap: 0 }).map((c) => c.chunk)

    expect(chunks.join('')).toBe(text)
  })
})

it('merge chunks', async () => {
  const text = 'AGI'.repeat(50)
  const chunks = await splitText(text, { chunkSize: 50, chunkOverlap: 0 }).map((c) => c.chunk)
  const merged = await merge(chunks, { separator: '' })
  expect(merged).toBe(text)
})

describe('Splitting based on max tokens properly return start and end', () => {
  it('splits text into sentences no longer than maxTokens and return start and end', async () => {
    const text = 'AGI '.repeat(50)
    const chunks = await splitText(text, { chunkSize: 50, chunkOverlap: 0 }).map((c) => c)

    expect(chunks.map((c) => c.chunk).join('')).toBe(text)
    expect(chunks[0].start).toBe(0)
    expect(chunks[0].end).toBe(99)
    expect(chunks[1].start).toBe(99)
    expect(chunks[1].end).toBe(199)
  })
})

it('splits text using generator', async () => {
  const text = 'AGI '.repeat(50)
  for await (const { chunk } of splitText(text, { chunkSize: 1, chunkOverlap: 0 })) {
    expect(chunk).toBe("AG")
    return
  }
})

it('splits text and batch', async () => {
  const text = 'AGI '.repeat(50)
  let i = 0
  for await (const batch of splitText(text, { chunkSize: 1, chunkOverlap: 0 }).batch(10)) {
    expect(batch.length).toBeGreaterThan(0)
    i++
  }
  expect(i).toBeGreaterThan(10)
})

it('splits text and batch with map', async () => {
  const text = 'AGI '.repeat(50)
  let i = 0
  const batches = await splitText(text, { chunkSize: 1, chunkOverlap: 0 }).batch(10).map((e) => e)
  expect(batches.length).toBeGreaterThan(10)
})

it('splits text forEach', async () => {
  const text = 'AGI '.repeat(50)
  let i = 0
  await splitText(text, { chunkSize: 1, chunkOverlap: 0 }).forEach((e) => i++)
  expect(i).toBeGreaterThan(10)
})