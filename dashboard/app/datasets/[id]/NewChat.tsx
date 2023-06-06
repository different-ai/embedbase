'use client'
import { PrimaryButton } from '@/components/Button'
import { ChatBox } from '@/components/ChatBox'
import { Input, TextArea } from '@/components/Input'
import { SubmitIcon } from '@/components/SubmitIcon'
import { useDataSetItemStore } from './store'

const ChatForm = () => {
  const datasetName = useDataSetItemStore((state) => state)
  return (
    <form className="flex">
      <Input
        type="text"
        id="userInput"
        name="userInput"
        placeholder={'coming soon'}
        className="w-full border-gray-200 bg-white text-xs text-gray-800 focus:outline-none focus:ring focus:ring-transparent"
      />
      <PrimaryButton
        type="submit"
        disabled={true}
        className="ml-3 flex rounded-md bg-black px-4 py-2"
      >
        <SubmitIcon />
      </PrimaryButton>
    </form>
  )
}
const ChatBody = ({ children }) => {
  return (
    <div className="gap-4 rounded-t-lg p-2 ">
      <div className="flex h-[200px] flex-col gap-2 space-y-2 overflow-y-auto p-2 text-xs">
        {children}
      </div>
    </div>
  )
}

const ChatMessages = () => {
  return (
    <>
      <ChatBox>What do you want to know about this dataset?</ChatBox>
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
