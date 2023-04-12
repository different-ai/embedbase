export function getChunksByNewLine(text: string): string[] {
  return text.split(/\r?\n/)
}
