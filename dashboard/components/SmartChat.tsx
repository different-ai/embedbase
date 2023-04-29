import { useEffect, useRef, useState } from 'react'
import { Input, Label, TextArea } from './Input'

import { Dataset } from '@/hooks/useDatasets'
import { posthog } from 'posthog-js'
import React from 'react'
import { toast } from 'react-hot-toast'
import { useAppStore } from '../lib/store'
import { defaultChatSystem } from '../utils/constants'
import { CreateContextResponse } from '../utils/types'
import Markdown from './Markdown'
import { PrimaryButton } from './Button'

const Footer = () => (
  <div className={`mt-2 text-xs text-gray-500 `}>
    <p>
      Powered by{' '}
      <a
        href="https://github.com/different-ai/embedbase"
        target="_blank"
        rel="noreferrer"
      >
        Embedbase
      </a>
      .
    </p>
  </div>
)
interface DatasetCheckboxesProps {
  datasets: Dataset[]
  isLoading: boolean
  selectedDatasetIds: string[]
  setSelectedDatasetIds: React.Dispatch<React.SetStateAction<string[]>>
}

function ChatSkeleton() {
  return (
    <div className="h-28 w-full rounded-lg bg-white p-4 ring-1 ring-slate-900/5 dark:bg-slate-800">
      <div className="flex animate-pulse space-x-4">
        {/* <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700"></div> */}
        <div className="flex-1 space-y-6 py-1">
          <div className="h-2 rounded bg-slate-200 dark:bg-slate-700"></div>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 h-2 rounded bg-slate-200 dark:bg-slate-700"></div>
              <div className="col-span-1 h-2 rounded bg-slate-200 dark:bg-slate-700"></div>
            </div>
            <div className="h-2 rounded bg-slate-200 dark:bg-slate-700"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChatBox({ children }) {
  return (
    <div className="min-h-28 w-full rounded-lg bg-white p-4 ring-1 ring-slate-900/5 dark:bg-slate-800">
      <div className="flex space-x-4">{children}</div>
    </div>
  )
}

const DatasetCheckboxes = ({
  datasets,
  isLoading,
  selectedDatasetIds,
  setSelectedDatasetIds,
}) => {
  const [filter, setFilter] = useState('')
  const displayedDatasets = datasets
    .filter((dataset) => filter === '' || dataset.id.includes(filter))
    .slice(0, 6)

  useEffect(() => {
    if (datasets.length > 0 && selectedDatasetIds.length === 0) {
      setSelectedDatasetIds([datasets[0].id])
    }
  }, [datasets])

  const addChip = (id) => {
    if (selectedDatasetIds.length < 5) {
      setSelectedDatasetIds((prev) => [...prev, id])
    }
  }

  const removeChip = (id) => {
    setSelectedDatasetIds((prev) => prev.filter((chipId) => chipId !== id))
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

export interface Chat {
  id: string
  createdAt: Date
  messages: Message[]
}

interface Message {
  message: string
  type: 'userMessage' | 'apiMessage'
  metadata?: {
    references: string[]
    [key: string]: unknown
  }
}
interface SmartChatProps {
  datasetIds: string[]
}
export default function SmartChat({ datasetIds }: SmartChatProps) {
  const inputRef = useRef(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const defaultMessage = 'Hi there! How can I help?'
  const [messages, setMessages] = useState<Message[]>([])
  const [lastMessage, setLastMessage] = useState<Message>({
    message: defaultMessage,
    type: 'apiMessage',
    metadata: { references: [] },
  })
  const datasets = useAppStore((state) => state.datasets)
  const [selectedDatasetIds, setSelectedDatasetIds] = useState(datasetIds)
  const apiKey = useAppStore((state) => state.apiKey)
  const chats = useAppStore((state) => state.chats)
  const firstApiKey = apiKey
  const [system, setSystem] = useState(defaultChatSystem)
  const messageListRef = useRef(null)
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
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        message: 'Oops! There seems to be an error. Please try again.',
        type: 'apiMessage',
      },
    ])
    toast(userFacingMessage, {
      duration: 5000,
      icon: '🚨',
      style: {
        borderRadius: '10px',
        background: '#333',
        color: '#fff',
      },
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
      // commit the previous last message to the messages array as well as the current user input
      setMessages((prevMessages) => [
        ...prevMessages,
        lastMessage,
        { message: userInput, type: 'userMessage' },
      ])

      setLastMessage({ message: '', type: 'apiMessage' })
      // 2.a ask the context based on a query
      const res: CreateContextResponse =
        selectedDatasetIds.length > 0
          ? await fetch('/api/createContext', {
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
          : { chunkedContext: '', contexts: [] }

      console.log('context', res)
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
          message: prev.message + chunkValue,
          type: 'apiMessage',
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
      chats[0].messages.push(lastMessage)
    } catch (error) {
      onError(error)
    } finally {
      setLoading(false)
      setStreaming(false)
    }
  }

  // Keep history in sync with messages
  useEffect(() => {
    if (messages.length >= 1) {
      setHistory([
        messages[messages.length - 2].message,
        messages[messages.length - 1].message,
      ])
    }
  }, [messages])
  const isSubmitDisabled = loading || streaming

  return (
    <div className="grid grid-cols-4  gap-5">
      <div className="col-span-1 flex flex-col space-y-3">
        <div className="flex flex-col ">
          <div className="flex items-center ">
            <Label>System message</Label>
          </div>
          {/* subtitle */}

          <TextArea
            name="system"
            id="system"
            row={3}
            className="text-gray-400"
            placeholder="You are a powerful AI that answer questions about a dataset..."
            onChange={(e) => setSystem(e.target.value)}
            defaultValue={defaultChatSystem}
          />
          <div className="mt-3 text-xs italic text-gray-500">
            This system message provide general guidance to GPT-4 on how to
            behave. You can leave this blank.
          </div>
        </div>
        {/* wrapped checkboxes to select the datasets to use */}
        <div className="flex flex-col">
          <Label> Select datasets</Label>
          <div className="mb-3 text-xs text-gray-500">
            This lets embedbase know what data you want ChatGPT to use to create
            answers. (select at least one)
          </div>
          <DatasetCheckboxes
            datasets={datasets}
            isLoading={false}
            selectedDatasetIds={selectedDatasetIds}
            setSelectedDatasetIds={setSelectedDatasetIds}
          />
        </div>
      </div>
      <div className="col-span-3">
        <div className="gap-4 rounded-t-lg bg-gray-100 p-2 ">
          <div className="flex h-[400px] flex-col gap-3 space-y-2 overflow-y-auto p-2">
            {messages.map((message, index) => {
              if (message.message === lastMessage.message) return null
              return (
                <div key={index}>
                  <ChatBox>
                    <Markdown>{message.message}</Markdown>
                  </ChatBox>
                </div>
              )
            })}
            {loading && <ChatSkeleton />}
            <div ref={messageListRef}>
              {!loading && (
                <ChatBox>
                  <Markdown>{lastMessage.message}</Markdown>
                </ChatBox>
              )}
            </div>
          </div>
        </div>
        <div className="rounded-b-lg bg-gray-100 p-8 ">
          <form onSubmit={handleSubmit} className="flex">
            <Input
              disabled={loading}
              rows={4}
              type="text"
              id="userInput"
              name="userInput"
              placeholder={
                loading ? 'Waiting for response...' : 'Type your question...'
              }
              ref={inputRef}
              className="w-full border-gray-200 bg-gray-50 text-gray-800 focus:outline-none focus:ring focus:ring-transparent"
            />
            <PrimaryButton
              type="submit"
              disabled={isSubmitDisabled}
              className="ml-3 rounded-md bg-black px-4 py-2"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white" />
              ) : (
                <svg
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 fill-current text-white"
                >
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                </svg>
              )}
            </PrimaryButton>
          </form>
          <Footer />
        </div>
      </div>
    </div>
  )
}
