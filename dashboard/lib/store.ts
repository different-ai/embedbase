import { create } from 'zustand'
import { Dataset } from '../hooks/useDatasets'
import { Chat } from '../components/SmartChat'
import { devtools, persist } from 'zustand/middleware'


interface AppState {
  apiKey: string
  datasets: Dataset[]
  setApiKey: (apiKey: string) => void
  setDatasets: (datasets: Dataset[]) => void
  showSandbox: boolean
  currentSandboxCode: {}
  setShowSandbox: (showSandbox: boolean) => void
  setCurrentSandboxCode: (currentSandboxCode: string) => void
  chats: Chat[]
  setChats: (chats: Chat[]) => void
}

// export const createPersisted = devtools(persist((set) => ({
//   chats: [],
//   setChats: (chats: Chat[]) => set({ chats }),
// }), {
//   name: 'chats',
//   getStorage: () => localStorage,
// }))

export const createPersisted = (set) => ({
  chats: [{
    id: "1",
    createdAt: new Date(),
    messages: [],
  }],
  setChats: (chats: Chat[]) => set({ chats }),
})

export const useAppStore = create<AppState>()((set) => ({
  apiKey: undefined,
  setApiKey: (apiKey: string) => set({ apiKey }),
  setDatasets: (datasets: Dataset[]) => set({ datasets }),
  datasets: [],
  showSandbox: false,
  currentSandboxCode: undefined,
  setShowSandbox: (showSandbox: boolean) => set({ showSandbox }),
  setCurrentSandboxCode: (currentSandboxCode: string) =>
    set({ currentSandboxCode }),
  ...createPersisted(set),
}))
