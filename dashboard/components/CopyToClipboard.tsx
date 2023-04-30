import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import { text } from 'stream/consumers'

interface CopyToClipboardProps {
  textToCopy: string
}
export const CopyToClipboard = ({ textToCopy }: CopyToClipboardProps) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy)
    toast.success('Copied to clipboard', { position: 'bottom-right' })
  }
  return (
    <div onClick={handleCopy} className="flex cursor-pointer items-center ">
      {/* only display first and last 3 chars */}
      {textToCopy.substring(0,1)}
      ...
      {textToCopy.substring(textToCopy.length - 4, textToCopy.length)}
      <ClipboardDocumentCheckIcon className="h-3 w-3 ml-1" />
    </div>
  )
}
