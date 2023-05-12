import { Label, TextArea } from './Input'
import { defaultChatSystem } from '../utils/constants'
import { useSmartChatStore } from './PrivateChat'

export const SystemMessage = () => {
  const setSystemMessage = useSmartChatStore((state) => state.setSystemMessage)
  return (
    <>
      <div className="flex items-center ">
        <Label>System message</Label>
      </div>

      <TextArea
        row={3}
        placeholder="You are a powerful AI that answer questions about a dataset..."
        onChange={(e) => setSystemMessage(e.target.value)}
        defaultValue={defaultChatSystem}
        className="text-sm text-gray-700 mt-2 w-full"
      />
      <div className="mt-3 text-xs italic text-gray-500">
        This system message provide general guidance to GPT-4 on how to behave.
        You can leave this blank.
      </div>
    </>
  )
}
