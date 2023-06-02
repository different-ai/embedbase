import EmbedbaseClient from './EmbedbaseClient'

export { default as EmbedbaseClient } from './EmbedbaseClient'
export type * from './types'
/**
 * Creates a new Embedbase Client.
 */
export const createClient = (embedbaseUrl: string, embedbaseKey?: string) => {
  return new EmbedbaseClient(embedbaseUrl, embedbaseKey)
}

export { merge, splitText } from './split'
