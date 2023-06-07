'use client'
import { PrimaryButton } from '@/components/Button'
import { ChatBox } from '@/components/ChatBox'
import { Input, TextArea } from '@/components/Input'
import { SubmitIcon } from '@/components/SubmitIcon'
import { useDataSetItemStore } from './store'

import { create } from 'zustand'
import { useState } from 'react'
import { createClient } from 'embedbase-js'
import { getRedirectURL } from '@/lib/redirectUrl'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast } from 'react-hot-toast'
import { getApiKeys } from '../../../pages/dashboard/explorer/[datasetId]'

interface DatasetItemStore {
  messages: string[]
  appendMessage: (message: string) => void
  setMessages: (messages: string[]) => void
  appendChunkToLastMessage: (chunk: string) => void
}

export const useChatAppStore = create<DatasetItemStore>()((set) => ({
  messages: [],
  appendMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set(() => ({ messages })),
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
  const datasetName = useDataSetItemStore((state) => state.name)

  const appendChunkToLastMessage = useChatAppStore(
    (state) => state.appendChunkToLastMessage
  )

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
    const apiKey = await getApiKeys(supabase, session.user.id)

    console.log(apiKey)
    const embedbase = createClient(
      'https://api.embedbase.xyz',
      apiKey
      //   '093d0aaf-11b2-4046-8f7f-5bd703b26957'
    )

    // add the user message to chat
    appendMessage(userInput)

    // create a message to append stream from generate
    appendMessage('')

    const question = userInput
    const context = await embedbase.dataset(datasetName).createContext(question)

    for await (const chunk of embedbase.generate(`${context} ${question}`, {
      url: `${getRedirectURL()}/api/chat/`,
      history: [],
    })) {
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
        className="w-full border-gray-200 bg-white text-xs text-gray-800 focus:outline-none focus:ring focus:ring-transparent"
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
    <div className="flex h-[calc(100vh-240px)] flex-col gap-2 space-y-2 overflow-y-auto p-2 text-xs">
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
    <div className="w-full  border-t border-gray-100">
      <ChatBody>
        <ChatMessages />
      </ChatBody>
      <div className="rounded-b-lg bg-gray-50 p-4 ">
        <ChatForm />
      </div>
    </div>
  )
}
