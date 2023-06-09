import { create } from 'zustand'

interface DatasetItemStore {
  name: string
  query: string
  queryResults: string[]
  documents: any[]
  setDocuments: (documents: any[]) => void
  setName: (name: string) => void
  setQueryResults: (queryResults: string[]) => void
  setQuery: (query: string) => void
}

export const useDataSetItemStore = create<DatasetItemStore>()((set) => ({
  name: '',
  query: '',
  documents: [],
  queryResults: [],
  setDocuments: (documents: string[]) => set({ documents }),
  setName: (name: string) => set({ name }),
  setQueryResults: (queryResults: string[]) => set({ queryResults }),
  setQuery: (query: string) => set({ query }),
}))
