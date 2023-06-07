'use client'
import { SecondaryButton } from '@/components/Button'
import {
  ArrowLeftCircleIcon,
  ArrowRightCircleIcon,
  ClipboardIcon,
  HomeIcon,
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

function cleanPath(path) {
  return path.replace(/\/\//g, '/')
}
function Breadcrumbs() {
  const pathname = usePathname()
  // Get current path
  const currentPath = pathname.split('/')

  // Build pages array using forEach loop
  const pages = currentPath
    .filter((path) => path !== '')
    .map((path, index) => {
      // Build page object
      const name = path.charAt(0).toUpperCase() + path.slice(1)
      const href = cleanPath('/' + currentPath.slice(0, index + 1).join('/'))

      const current = index === currentPath.length - 1

      return {
        name: name,
        href,
        current,
      }
    })

  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol role="list" className="flex items-center space-x-4">
        <li>
          <div>
            <Link
              href="/datasets"
              className="text-gray-400 hover:text-gray-500"
            >
              <HomeIcon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              <span className="sr-only">Home</span>
            </Link>
          </div>
        </li>

        {pages.map((page) => (
          <li key={page.name}>
            <div className="flex items-center">
              <svg
                className="h-5 w-5 flex-shrink-0 text-gray-300"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
              </svg>

              {/* TODO: href shitty */}
              {/* <Link
                                href={page.href}
                                className={`ml-4 text-sm font-medium text-gray-500 ${page.current ? 'underline' : 'hover:text-gray-700'
                                    }`}
                            >
                                {page.name}
                            </Link> */}
              <p className={`ml-4 text-sm font-medium text-gray-500`}>
                {page.name}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  )
}

const pageSize = 25
interface DataTableProps {
  documents: Document[]
  page: number
  count: number
  datasetId: string
  datasetName: string
}
export default function DataTable({
  documents,
  page,
  count,
  datasetId,
  datasetName,
}: DataTableProps) {
  const setName = useDataSetItemStore((state) => state.setName)
  const [activeDocument, setActiveDocument] = useState(null)
  // initialize dataset item store
  useEffect(() => {
    setName(datasetName)
  }, [])

  const handleExpandRow = (document) => {
    setActiveDocument((prevDocument) =>
      prevDocument && prevDocument.id === document?.id ? null : document
    )
  }
  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast('Copied to clipboard!')
  }
  return (
    <div className="p w-full rounded-md border border-gray-100">
      {/* TODO: move to layout? */}
      <Toaster />
      <div className="flex items-center justify-between border-gray-100 p-4 ">
        <div className="flex items-center">
          <h3 className="text-lg font-semibold text-gray-700">
            Dataset Preview
          </h3>
        </div>
      </div>

      <div className="relative max-h-[calc(100vh-230px)] overflow-auto border-b ">
        <table className="min-w-full  bg-gray-100 ">
          <tbody className="space-y flex flex-col bg-gray-100">
            {documents.map((document) => (
              <Fragment key={document.id}>
                <tr className="border-1 cursor-pointer border-t border-gray-300 odd:bg-white even:bg-gray-50 hover:bg-gray-100 ">
                  {/* copy to clipboard on click */}
                  <>
                    <td
                      className="cursor-context-menu select-none px-4 py-1 font-mono text-xs	text-gray-500"
                      onClick={() => handleCopyToClipboard(document.id)}
                    >
                      {document.id.slice(0, 8)}
                    </td>
                    <td onClick={() => handleExpandRow(document)}>
                      <div className="max-h-[100px] select-none px-3 py-1 text-left text-xs text-gray-900">
                        {activeDocument?.id !== document.id &&
                          `${document.data.slice(0, 100)}...`}
                        {activeDocument?.id === document.id && document.data}
                      </div>
                    </td>
                  </>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
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
