import React, { useState } from 'react'
import { useTheme } from 'nextra-theme-docs'
import { PrimaryButton } from './Button'
import Markdown from './Markdown'

const Modal = ({ children, open, onClose }) => {
  const theme = useTheme()
  if (!open) return null
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 100
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: theme.resolvedTheme === 'dark' ? '#1a1a1a' : 'white',
          padding: 20,
          borderRadius: 5,
          width: '80%',
          maxWidth: 700,
          maxHeight: '80%',
          overflow: 'auto'
        }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

const questions = [
  'What can you build with Embedbase?',
  'What is Embedbase?',
  'How can I insert data into Embedbase using the Javascript SDK?'
]

const QuestionSection = () => {
  return (
    <div className="font-gray-500 flex flex-col text-sm">
      <div className="font-gray-500">Copy/paste one of the example below into the search bar:</div>
      <div className="flex flex-col gap-2">
        <ul className="list-inside list-disc">
          {questions.map(q => (
            // in row orientation, centered, with a gap of 3
            <li key={q}>{q}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

interface TextFieldProps {
  value?: string
  onChange?: (e: any) => void
  autoFocus?: boolean
  placeholder?: string
  onClick?: () => void
}

const TextField = ({
  value,
  onChange,
  autoFocus,
  placeholder,
  onClick
}: TextFieldProps) => {
  return (
    // a magnifier icon on the left
    <input
      autoFocus={autoFocus || false}
      placeholder={placeholder || 'Search...'}
      onClick={onClick}
      type="text"
      value={value}
      onChange={onChange}
      // border around with smooth corners, a magnifier icon on the left,
      // the search bar taking up the rest of the space
      // focused on load
      style={{
        width: '100%',
        padding: '0.5rem',
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        outline: 'none'
      }}
    />
  )
}

export const EmbedbaseSearch = () => {
  const [loading, setLoading] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [output, setOutput] = useState('')

  const qa = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    setOutput('')

    const promptResponse = await fetch('/api/buildPrompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt
      })
    })
    const promptData = await promptResponse.json()
    const response = await fetch('/api/qa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: promptData.prompt
      })
    })
    console.log('Edge function returned.')
    setLoading(false)

    if (!response.ok) {
      throw new Error(response.statusText)
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
      setOutput(prev => prev + chunkValue)
    }

    setLoading(false)
  }
  // a nice looking input search bar with cmd k to open
  // on open, show a modal with a form to enter a prompt
  return (
    <div>
      <form onSubmit={qa} className="flex gap-3 mt-3">
        <TextField
          value={prompt}
          placeholder="Ask a question..."
          onChange={e => setPrompt(e.target.value)}
          autoFocus
        />
        <PrimaryButton
          style={{ minWidth: 'max-content' }}
          type="submit"
          className=""
          disabled={loading}
        >
          Ask a question
        </PrimaryButton>
      </form>

      <div className="nx-py-4 min-h-40 flex flex-col gap-3">
        <a
          href="https://embedbase.xyz"
          className="text-xs  text-gray-500 dark:text-white"
        >
          Powered by Embedbase
        </a>

        {/* row oriented, centered, with a gap of 3 */}
        {!loading && output.length < 1 && (
          <div className="flex	min-h-[300px] items-center justify-center text-sm font-semibold text-gray-400  p-4 border border-gray-300 rounded-md">
            <QuestionSection />
          </div>
        )}
        {loading && (
          <div className="flex	min-h-[300px] items-center justify-center text-sm font-semibold text-gray-400">
            <span>Loading...</span>
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-900 ml-3"></div>
          </div>
        )}
        {!loading && output.length > 0 && (
          <Markdown>
            {output}
          </Markdown>
        )}
      </div>
    </div>
  )
}

export const SearchModal = () => {
  const [open, setOpen] = useState(false)

  const onClose = () => {
    setOpen(false)
  }

  return (
    <div>
      {/* on click, open modal */}
      <TextField
        onClick={() => setOpen(true)}
        placeholder="Ask a question..."
      />
      <Modal open={open} onClose={onClose}>
        <EmbedbaseSearch />
      </Modal>
    </div>
  )
}
