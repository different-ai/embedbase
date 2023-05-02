import { create } from 'zustand'
import { Dataset } from '../hooks/useDatasets'


interface AppState {
  apiKey: string
  datasets: Dataset[]
  setApiKey: (apiKey: string) => void
  setDatasets: (datasets: Dataset[]) => void
  showSandbox: boolean
  currentSandboxCode: {}
  setShowSandbox: (showSandbox: boolean) => void
  setCurrentSandboxCode: (currentSandboxCode: string) => void
}


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
}))
