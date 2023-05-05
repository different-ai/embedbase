'use client'
import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/Input'
import { SearchSimilarity } from 'embedbase-js/dist/module/types'

import { posthog } from 'posthog-js'
import React from 'react'
import { toast } from 'react-hot-toast'
import Markdown from '@/components/Markdown'
import { PrimaryButton } from '@/components/Button'
import { create } from 'zustand'
import Spinner from '@/components/Spinner'
import { useSearchParams } from 'next/navigation'

export interface SearchResponse {
  chunkedContext: string
  contexts: SearchSimilarity[]
  systemMessage: string
}

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

const SubmitIcon = () => (
  <svg
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 fill-current text-white"
  >
    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
  </svg>
)

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

interface ChatState {
  messages: Message[]
  history: { content: string; role: string }[]
  addMessage: (message: Message) => void
  systemMessage: string
  setSystemMessage: (message: string) => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  history: [],
  setSystemMessage: (message) => {
    set((state) => ({
      systemMessage: message,
    }))
  },
  systemMessage: '',
  addMessage: (message) => {
    // commit to history but leave out metadata
    const { metadata, ...messageWithoutReferences } = message
    set((state) => ({
      history: [...state.history, { ...messageWithoutReferences }],
      messages: [...state.messages, message],
    }))
  },
}))
//
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
interface SmartChatProps {
  datasetIds: string[]
}
export default function SmartChat({ datasetIds }: SmartChatProps) {
  const searchParams = useSearchParams()

  const inputRef = useRef(null)
  const messages = useChatStore((state) => state.messages)
  const addMessage = useChatStore((state) => state.addMessage)
  const history = useChatStore((state) => state.history)
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const defaultMessage = 'Hi there! How can I help?'
  const [lastMessage, setLastMessage] = useState<Message>({
    content: defaultMessage,
    role: 'assistant',
    metadata: { references: [] },
  })
  const publicApiKey = searchParams.get('appId')
  const system = useChatStore((state) => state.systemMessage)
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
      const res: SearchResponse = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userInput,
          publicApiKey: publicApiKey,
        }),
      }).then((res) => res.json())

      setStreaming(true)
      console.log(res)
      //3. Send user the questions and hisitory as well as the relevant dataset (in this case the github repo)
      const response = await fetch('/api/answer', {
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
          system: res.systemMessage,
          publicApiKey: publicApiKey,
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
              className="w-full border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring focus:ring-transparent"
            />
            <PrimaryButton
              type="submit"
              disabled={isSubmitDisabled}
              className="ml-3 rounded-md bg-black px-4 py-2"
            >
              {loading ? (
                <Spinner />
              ) : (
                // make a component
                <SubmitIcon />
              )}
            </PrimaryButton>
          </form>
          <Footer />
        </div>
      </div>
    </div>
  )
}
