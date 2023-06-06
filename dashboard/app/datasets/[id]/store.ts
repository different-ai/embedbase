import { create } from 'zustand'

interface DatasetItemStore {
  name: string
  setName: (name: string) => void
}

export const useDataSetItemStore = create<DatasetItemStore>()((set) => ({
  name: '',
  setName: (name: string) => set({ name }),
}))
