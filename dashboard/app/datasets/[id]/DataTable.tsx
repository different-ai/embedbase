'use client'
import { SecondaryButton } from '@/components/Button'
import {
  ArrowLeftCircleIcon,
  ArrowRightCircleIcon,
  ClipboardIcon,
  HomeIcon,
  LinkIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Document } from 'embedbase-js'
import { Fragment, useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { useDataSetItemStore } from './store'

export const CopyButton = ({ className, textToCopy }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy)
    toast.success('Copied to clipboard', { position: 'bottom-right' })
  }

  return (
    <SecondaryButton
      onClick={handleCopy}
      title="Copy code snippet to clipboard"
      type="button"
      {...{ className }}
    >
      <ClipboardIcon className="h-4 w-4" />
      <span className="ml-1.5">Copy</span>
    </SecondaryButton>
  )
}

const pageSize = 25
interface DataTableProps {
  documents: Document[]
  page: number
  count: number
  datasetId: string
  datasetName: string
  datasetOwnerUsername: string
}
const Table = ({ defaultDocuments }) => {
  const documents = useDataSetItemStore((state) => state.documents)
  const [activeDocument, setActiveDocument] = useState(null)

  const handleExpandRow = (document) => {
    setActiveDocument((prevDocument) =>
      prevDocument && prevDocument.id === document?.id ? null : document
    )
  }

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast('Copied to clipboard!')
  }
  const renderedDocuments = documents || defaultDocuments

  return (
    <table className="min-w-full bg-gray-100" style={{ tableLayout: 'fixed' }}>
      <tbody className="space-y bg-gray-100">
        {renderedDocuments.map((document) => (
          <tr
            key={document.id}
            className="border-1 cursor-pointer border-t border-purple-700 border-opacity-[10%] odd:bg-white even:bg-gray-50"
          >
            <td
              className="cursor-context-menu select-none px-4 py-1 font-mono text-xs text-gray-500"
              onClick={() => handleCopyToClipboard(document.id)}
            >
              {document.id.slice(0, 8)}
            </td>
            <td onClick={() => handleExpandRow(document)}>
              <div className="max-h-[100px] px-3 py-1 text-left text-xs text-gray-900">
                {activeDocument?.id === document.id
                  ? document.data
                  : document.data.slice(0, 100)}
                {document.data.length > 100 &&
                  document.id !== activeDocument?.id &&
                  '...'}
              </div>
            </td>
            <td className="px-4 py-1 text-xs text-gray-500">
              {document.metadata?.path?.startsWith('http') ? (
                <a
                  href={document.metadata.path}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <LinkIcon className="h-4 w-4" />
                </a>
              ) : (
                document.metadata?.path?.split(0, 10)
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function DataTable({
  documents,
  page,
  count,
  datasetId,
  datasetName,
  datasetOwnerUsername,
}: DataTableProps) {
  const setName = useDataSetItemStore((state) => state.setName)
  const setDocuments = useDataSetItemStore((state) => state.setDocuments)
  // initialize dataset item store
  useEffect(() => {
    setName(datasetName)
    setDocuments(documents)
  }, [documents, datasetName])

  return (
    <div className="p w-full rounded-md border border-purple-700 border-opacity-25">
      <Toaster />
      <div className="flex items-center justify-between border-purple-700 border-opacity-25 p-4 ">
        <div className="flex items-center">
          <h3 className="text-lg font-semibold text-gray-700">{datasetName}</h3>
          {/* display author in light gray ish */}
          <h3 className="ml-2 text-xs font-medium text-gray-400">
            by {datasetOwnerUsername}
          </h3>
        </div>
      </div>

      <div className="relative max-h-[calc(100vh-290px)] overflow-auto border-b ">
        <Table defaultDocuments={documents} />
      </div>

      <DataTableController datasetId={datasetId} page={page} count={count} />
    </div>
  )
}
function DataTableController({
  datasetId,
  page,
  count,
}: {
  datasetId: string
  page: number
  count: number
}) {
  return (
    <div className="sm:text-md mt-4 mb-3 flex items-center justify-between gap-3 px-1 text-2xs sm:px-4">
      <div className="flex items-center gap-1 sm:gap-3">
        {/* previous */}
        <Link href={`/datasets/${datasetId}/?page=${page - 1}`}>
          <SecondaryButton className="flex gap-1 text-xs" disabled={page === 0}>
            <ArrowLeftCircleIcon className="h-3 w-3" />
            Previous
          </SecondaryButton>
        </Link>
        {/* next */}
        <Link href={`/datasets/${datasetId}/?page=${page + 1}`}>
          <SecondaryButton
            className="flex gap-1 text-xs"
            disabled={page * pageSize + pageSize >= count}
          >
            Next
            <ArrowRightCircleIcon className="h-3 w-3" />
          </SecondaryButton>
        </Link>
        {/* dispaly count */}
        <div className="text-gray-500">
          {page * pageSize} - {page * pageSize + pageSize} of {count}
        </div>
      </div>
    </div>
  )
}
