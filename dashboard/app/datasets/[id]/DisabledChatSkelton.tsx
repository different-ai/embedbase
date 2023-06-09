import { PrimaryButton } from '@/components/Button'
import { ChatBox } from '@/components/ChatBox'
import { Input, TextArea } from '@/components/Input'
import { SubmitIcon } from '@/components/SubmitIcon'

export function DisabledChatSkelton() {
  return (
    <div className="w-full  border-t border-[#912ee8] border-opacity-25">
      <div className="gap-4 rounded-t-lg p-2 ">
        <div className="flex h-[200px] flex-col gap-3 space-y-2 overflow-y-auto p-2 text-xs">
          <div>
            <ChatBox>What do you want to know about this dataset?</ChatBox>
          </div>
        </div>
      </div>
      <div>
        <div className="rounded-b-lg bg-gray-50 p-4 ">
          <form className="flex">
            <Input
              rows={4}
              type="text"
              id="userInput"
              name="userInput"
              placeholder={'coming soon'}
              className="w-full border-[#912ee8] border-opacity-25 bg-white text-gray-800 focus:outline-none focus:ring focus:ring-transparent text-xs"
            />
              <PrimaryButton
                type="submit"
                disabled={true}
                className="flex rounded-md bg-black px-4 py-2 ml-3"
              >
                <SubmitIcon />
              </PrimaryButton>
          </form>
        </div>
      </div>
    </div>
  )
}
