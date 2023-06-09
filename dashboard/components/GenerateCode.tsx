import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline'
import React from 'react'
import { useAppStore } from '../lib/store'
import { PrimaryButton } from './Button'


export default function CodeCopyBtn({ children }) {
  const store = useAppStore()
  const [loading, setLoading] = React.useState(false)

  const handleClick = async (e) => {
    setLoading(true)
    const data = await fetch('/api/generateCode', {
      body: JSON.stringify({
        prompt: children[0].props.children[0],
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    }).then((res) => res.text())

    // sometimes the response is not valid JSON
    let fixedData = data;
    if (data[0] !== '{') {
      fixedData = `{${data}`
    }

    const formattedData = JSON.parse(fixedData)
    console.log({ formattedData })
    store.setCurrentSandboxCode(formattedData)
    store.setShowSandbox(true)
    setLoading(false)
  }

  return (
    <PrimaryButton onClick={handleClick} className="cursor-pointer">
      {!loading && 'Generate a code sandbox from this (experimental)'}
      {loading && (
        <div className="flex items-center justify-center">
          Loading... this might take a while
          <div className="h-5 w-5 animate-spin rounded-full border-t-2 border-b-2 border-[#912ee8] border-opacity-25"></div>
        </div>
      )}
    </PrimaryButton>
  )
}
