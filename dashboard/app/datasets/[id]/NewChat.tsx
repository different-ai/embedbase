'use client'
import { PrimaryButton } from '@/components/Button'
import { ChatBox } from '@/components/ChatBox'
import { Input } from '@/components/Input'
import { SubmitIcon } from '@/components/SubmitIcon'
import { useDataSetItemStore } from './store'

import { create } from 'zustand'
import { useEffect, useState } from 'react'
import { createClient } from 'embedbase-js'
import { getRedirectURL } from '@/lib/redirectUrl'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast } from 'react-hot-toast'

interface DatasetItemStore {
  messages: string[]
  appendMessage: (message: string) => void
  setMessages: (messages: string[]) => void
  appendChunkToLastMessage: (chunk: string) => void
  loading: boolean
}

export const useChatAppStore = create<DatasetItemStore>()((set) => ({
  messages: [],
  appendMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set(() => ({ messages })),
  loading: false,
  appendChunkToLastMessage: (chunk) =>
    set((state) => ({
      messages: [
        ...state.messages.slice(0, -1),
        state.messages[state.messages.length - 1] + chunk,
      ],
    })),
}))

const ChatForm = () => {
  const [userInput, setUserInput] = useState('')
  const appendMessage = useChatAppStore((state) => state.appendMessage)
  const documents = useDataSetItemStore((state) => state.documents)
  const setQuestion = useDataSetItemStore((state) => state.setUserQuestion)
  const context = documents.map((doc) => doc.data)

  const appendChunkToLastMessage = useChatAppStore(
    (state) => state.appendChunkToLastMessage
  )
  useEffect(() => {
    if (userInput.trim()) {
      setQuestion(userInput)
    }
  }, [userInput])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!userInput.trim()) return
    const supabase = createClientComponentClient()
    // check if session
    const {
      data: { session },
    } = await supabase.auth.getSession()
    // if no session
    if (!session) {
      toast.error('Please sign in to chat')
      return
    }

    const {
      data: { api_key: apiKey },
    } = await supabase
      .from('api-keys')
      .select('api_key')
      .eq('user_id', session.user.id)
      .limit(1)
      .single()

    const embedbase = createClient(
      'https://api.embedbase.xyz',
      apiKey
    )

    // add the user message to chat
    appendMessage(userInput)

    // create a message to append stream from generate
    appendMessage('')

    const question = userInput
    console.log(context)
    setUserInput('')

    for await (const chunk of embedbase.generate(
      `the following line is a question:\n${question}  the following line is context to answer:\n${context.join(
        '\n'
      )} `,
      {
        url: `${getRedirectURL()}api/chat`,
        history: [],
      }
    )) {
      appendChunkToLastMessage(chunk)
    }
  }

  return (
    <form className="flex" onSubmit={handleSubmit}>
      <Input
        type="text"
        id="userInput"
        name="userInput"
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        placeholder={'Ask any question'}
        className="w-full border-purple-700 border-opacity-25 bg-white text-xs text-gray-800 focus:outline-none focus:ring focus:ring-transparent"
      />
      <PrimaryButton
        type="submit"
        disabled={!userInput.trim()}
        className="ml-3 flex rounded-md bg-black px-4 py-2"
      >
        <SubmitIcon />
      </PrimaryButton>
    </form>
  )
}
const ChatBody = ({ children }) => {
  return (
    <div className="flex h-[calc(100vh-290px)] flex-col gap-2 space-y-2 overflow-y-auto p-2 text-xs">
      {children}
    </div>
  )
}

const ChatMessages = () => {
  const messages = useChatAppStore((state) => state.messages)
  return (
    <>
      <ChatBox>What do you want to know about this dataset?</ChatBox>
      {messages.map
        ? messages.map((message, index) => (
            <ChatBox key={index}>{message}</ChatBox>
          ))
        : null}
      {/* other messages go here */}
    </>
  )
}

// update to datasetid
export function NewChat() {
  return (
    <div className="w-full  border-t border-purple-700 border-opacity-25">
      <ChatBody>
        <ChatMessages />
      </ChatBody>
      <div className="rounded-b-lg bg-gray-50 p-4 ">
        <ChatForm />
      </div>
    </div>
  )
}
