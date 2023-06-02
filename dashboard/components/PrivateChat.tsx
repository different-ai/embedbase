import { useEffect, useRef, useState } from 'react'
import { Input, Label, TextArea } from './Input'

import { posthog } from 'posthog-js'
import { toast } from 'react-hot-toast'
import { create } from 'zustand'
import { useAppStore } from '../lib/store'
import { defaultChatSystem } from '../utils/constants'
import { CreateContextResponse } from '../utils/types'
import { PrimaryButton } from './Button'
import { ChatBox } from './ChatBox'
import { ChatSkeleton } from './ChatSkeleton'
import { Footer } from './Footer'
import Markdown from './Markdown'
import Spinner from './Spinner'
import { SubmitIcon } from './SubmitIcon'
import { SystemMessage } from './SystemMessage'
const DatasetCheckboxes = ({ datasets, isLoading }) => {
  const selectedDatasetIds = useSmartChatStore(
    (state) => state.selectedDatasetIds
  )
  const setSelectedDatasetIds = useSmartChatStore(
    (state) => state.addToSetDatasetIds
  )
  const removeDatasetId = useSmartChatStore((state) => state.removeDatasetId)
  const [filter, setFilter] = useState('')
  const displayedDatasets = datasets
    .filter((dataset) => filter === '' || dataset.id.includes(filter))
    .slice(0, 6)

  useEffect(() => {
    if (datasets.length > 0 && selectedDatasetIds.length === 0) {
      setSelectedDatasetIds(datasets[0].id)
    }
  }, [datasets])

  const addChip = (id) => {
    if (selectedDatasetIds.length < 5) {
      setSelectedDatasetIds(id)
    }
  }

  const removeChip = (id) => {
    removeDatasetId(id)
  }

  return (
    <div className="flex flex-col gap-2">
      {/* a input text to filter dataset list */}
      <div className="flex-col items-center gap-2">
        <Input
          id="filter"
          name="filter"
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full text-sm"
          placeholder="Enter dataset name to filter"
        />
      </div>

      {/* display selected chips */}
      <div className="flex flex-wrap gap-2">
        {selectedDatasetIds.map((id) => (
          <div
            key={id}
            className="border-1 flex max-w-[100px] items-center gap-2 rounded-md border bg-gray-100 py-1 px-2 text-xs "
            title={id}
          >
            <span className=" truncate text-gray-600">{id}</span>
            <button
              className="text-gray-500 hover:text-gray-800"
              onClick={() => removeChip(id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* display dataset list */}
      <div className="flex flex-wrap gap-2">
        {isLoading && (
          <div className="flex h-12 w-full items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 animate-spin rounded-full border-t-2 border-b-2 border-gray-300"></div>
              <p className="text-gray-500">Loading...</p>
            </div>
          </div>
        )}

        {displayedDatasets
          .filter((dataset) => !selectedDatasetIds.includes(dataset.id))
          .map((dataset) => (
            <div
              key={dataset.id}
              className="relative flex max-w-full items-center gap-1 truncate py-1"
            >
              <button
                className="truncate text-xs font-medium text-gray-700 hover:text-gray-600"
                onClick={() => addChip(dataset.id)}
                disabled={selectedDatasetIds.includes(dataset.id)}
              >
                {dataset.id}
              </button>
            </div>
          ))}
      </div>
    </div>
  )
}

import { Switch } from '@headlessui/react'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

function Toggle() {
  const useBingSearch = useSmartChatStore((state) => state.useBingSearch)
  const setUseBingSearch = useSmartChatStore((state) => state.setUseBingSearch)

  return (
    <Switch.Group as="div" className="flex items-center">
      <Switch
        checked={useBingSearch}
        onChange={setUseBingSearch}
        className={classNames(
          useBingSearch ? 'bg-black' : 'bg-gray-200',
          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2'
        )}
      >
        <span
          aria-hidden="true"
          className={classNames(
            useBingSearch ? 'translate-x-5' : 'translate-x-0',
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
          )}
        />
      </Switch>
      <Switch.Label as="span" className="ml-3 text-sm">
        <span className="font-medium text-gray-900">Bing Search</span>{' '}
      </Switch.Label>
    </Switch.Group>
  )
}

interface ChatState {
  messages: Message[]
  history: { content: string; role: string }[]
  addMessage: (message: Message) => void
  systemMessage: string
  setSystemMessage: (message: string) => void
  selectedDatasetIds: string[]
  addToSetDatasetIds: (id: string) => void
  removeDatasetId: (id: string) => void
  clearSelectedDatasetId: () => void
  useBingSearch: boolean
  setUseBingSearch: (useBingSearch: boolean) => void
}

export const useSmartChatStore = create<ChatState>((set) => ({
  messages: [],
  history: [],
  setSystemMessage: (message) => {
    set((state) => ({
      systemMessage: message,
    }))
  },
  systemMessage: defaultChatSystem,
  addMessage: (message) => {
    // commit to history but leave out metadata
    const { metadata, ...messageWithoutReferences } = message
    set((state) => ({
      history: [...state.history, { ...messageWithoutReferences }],
      messages: [...state.messages, message],
    }))
  },
  selectedDatasetIds: [],
  addToSetDatasetIds: (id) => {
    set((state) => ({
      selectedDatasetIds: [...state.selectedDatasetIds, id],
    }))
  },
  removeDatasetId: (id) => {
    set((state) => ({
      selectedDatasetIds: state.selectedDatasetIds.filter((i) => i !== id),
    }))
  },
  clearSelectedDatasetId: () => {
    set((state) => ({
      selectedDatasetIds: [],
    }))
  },
  useBingSearch: false,
  setUseBingSearch: (useBingSearch) => set(() => ({ useBingSearch })),
}))

export interface Chat {
  id: string
  createdAt: Date
  messages: Message[]
}

interface Message {
  content: string
  role: 'user' | 'assistant' | 'system'
  metadata?: {
    references: string[]
    [key: string]: unknown
  }
}
export default function SmartChat() {
  const inputRef = useRef(null)
  const messages = useSmartChatStore((state) => state.messages)
  const addMessage = useSmartChatStore((state) => state.addMessage)
  const history = useSmartChatStore((state) => state.history)
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const defaultMessage = 'Hi there! How can I help?'
  const [lastMessage, setLastMessage] = useState<Message>({
    content: defaultMessage,
    role: 'assistant',
    metadata: { references: [] },
  })
  const datasets = useAppStore((state) => state.datasets)

  const selectedDatasetIds = useSmartChatStore(
    (state) => state.selectedDatasetIds
  )
  const apiKey = useAppStore((state) => state.apiKey)
  const firstApiKey = apiKey
  const system = useSmartChatStore((state) => state.systemMessage)
  const messageListRef = useRef(null)
  const useBingSearch = useSmartChatStore((state) => state.useBingSearch)
  // Auto scroll chat to bottom
  useEffect(() => {
    const messageList = messageListRef.current
    messageList.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus on text field on load
  useEffect(() => {
    inputRef.current.focus()
  }, [])
  const onError = (error: Error | Response) => {
    console.error(error)
    const userFacingMessage =
      // is type Response
      error instanceof Response && error.status === 401
        ? 'Playground is disabled for free-tier please go to "Account" on the left to upgrade to pro.'
        : error instanceof Response && error.status === 402
        ? 'You reached your monthly limit. Please upgrade to continue using the playground.'
        : 'Oops! There seems to be an error. Please try again.'

    addMessage({
      content: 'Oops! There seems to be an error. Please try again',
      role: 'assistant',
    })

    toast.error(userFacingMessage, {
      duration: 5000,
    })
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    try {
      e.preventDefault()
      const userInput: string = inputRef.current?.value
      posthog.capture('chat:submit', { userInput })
      if (userInput.trim() === '') {
        return
      }

      setLoading(true)
      // commit the previous assistant message to chat & history
      addMessage(lastMessage)
      // add new user messsage to chat & history
      addMessage({ content: userInput, role: 'user' })
      // clear input
      setLastMessage({ content: '', role: 'assistant' })

      // 2.a ask the context based on a query
      let res: CreateContextResponse = { chunkedContext: '', contexts: [] }
      if (useBingSearch) {
        res = await fetch('/api/createContextWithBingSearch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: userInput,
            apiKey: firstApiKey,
          }),
        }).then((res) => res.json())
      } else if (selectedDatasetIds.length > 0) {
        res = await fetch('/api/createContext', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: userInput,
            datasetIds: selectedDatasetIds,
            apiKey: firstApiKey,
          }),
        }).then((res) => res.json())
      }

      setStreaming(true)
      //3. Send user the questions and hisitory as well as the relevant dataset (in this case the github repo)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt:
            res.chunkedContext === ''
              ? userInput
              : `Based on the following context:\n${res.chunkedContext}\nAnswer the user's question: ${userInput}`,
          history: history,
          system: system,
        }),
      })
      inputRef.current.value = ''

      setLoading(false)

      if (!response.ok) {
        return onError(response)
      }

      // This data is a ReadableStream
      const data = response.body
      if (!data) {
        return
      }

      const reader = data.getReader()
      const decoder = new TextDecoder()
      let done = false

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        const chunkValue = decoder.decode(value)
        setLastMessage((prev) => ({
          content: prev.content + chunkValue,
          role: 'assistant',
          metadata: {
            references: Array.from(
              new Set([
                ...res.contexts
                  .filter((c) => c.metadata && c.metadata['path'])
                  .map((c) => c.metadata['path']),
              ])
            ),
          },
        }))
      }
    } catch (error) {
      onError(error)
    } finally {
      setLoading(false)
      setStreaming(false)
    }
  }

  const isSubmitDisabled = loading || streaming

  return (
    <div className="flex grid-cols-4 flex-col gap-5  sm:grid">
      <div className="col-span-1 flex flex-col space-y-3">
        <div className="flex flex-col ">
          <SystemMessage />
        </div>
        <div className="flex flex-col ">
          <Label>Use Bing Search</Label>
          <div className="mb-3 text-xs text-gray-500">
            This lets embedbase use Bing Search to help ChatGPT answering.
          </div>
          <Toggle />
        </div>
        {!useBingSearch && (
          <div className="flex flex-col">
            <Label> Select datasets</Label>
            <div className="mb-3 text-xs text-gray-500">
              This lets embedbase know what data you want ChatGPT to use to
              create answers. (select at least one)
            </div>
            <DatasetCheckboxes datasets={datasets} isLoading={false} />
          </div>
        )}
      </div>
      <div className="col-span-3">
        <div className="gap-4 rounded-t-lg bg-gray-50 p-2 ">
          <div className="flex h-[400px] flex-col gap-3 space-y-2 overflow-y-auto p-2">
            {messages.map((message, index) => {
              if (message.content === lastMessage.content) return null
              return (
                <div key={index}>
                  <ChatBox>
                    <Markdown>{message.content}</Markdown>
                  </ChatBox>
                </div>
              )
            })}
            {loading && <ChatSkeleton />}
            <div ref={messageListRef}>
              {!loading && (
                <ChatBox>
                  <Markdown>{lastMessage.content}</Markdown>
                </ChatBox>
              )}
            </div>
          </div>
        </div>
        <div className="rounded-b-lg bg-gray-50 p-8 ">
          <form onSubmit={handleSubmit} className="flex">
            <TextArea
              disabled={loading}
              rows={4}
              type="text"
              id="userInput"
              name="userInput"
              placeholder={
                loading ? 'Waiting for response...' : 'Type your question...'
              }
              onKeyDown={(event) => {
                if (event.metaKey && event.key === 'Enter') {
                  handleSubmit(event)
                }
              }}
              ref={inputRef}
              className="w-full border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring focus:ring-transparent"
            />
            <div>
              <PrimaryButton
                type="submit"
                disabled={isSubmitDisabled}
                className="ml-3 rounded-md bg-black px-4 py-2 "
              >
                {loading ? (
                  <Spinner />
                ) : (
                  // make a component
                  <SubmitIcon />
                )}
              </PrimaryButton>
            </div>
          </form>
          <Footer />
        </div>
      </div>
    </div>
  )
}
