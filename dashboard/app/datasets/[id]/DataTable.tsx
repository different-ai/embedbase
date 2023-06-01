"use client";
import { SecondaryButton } from '@/components/Button';
import {
    ArrowLeftCircleIcon,
    ArrowRightCircleIcon,
    ClipboardIcon,
    CodeBracketIcon,
    HomeIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';


import Markdown from '@/components/Markdown';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';



const CopyButton = ({ className, textToCopy }) => {

    const handleCopy = () => {
        navigator.clipboard.writeText(textToCopy)
        toast.success('Copied to clipboard', { position: 'bottom-right' })
    };

    return (
        <SecondaryButton
            onClick={handleCopy}
            title="Copy code snippet to clipboard"
            type="button"
            {...{ className }}
        >
            <ClipboardIcon className="w-4 h-4" />
            <span className="ml-1.5">Copy</span>
        </SecondaryButton>
    );
};
const datasetToSdkUsage = (datasetName) => {
    return `import { createClient } from 'embedbase-js'
const embedbase = createClient('https://api.embedbase.xyz', '<grab me here https://app.embedbase.xyz/>')
const question = 'ask something!'
const context = await embedbase.dataset('${datasetName}').createContext(question)
const prompt = 
    \`Based on the following context:\n\${context}\nAnswer the user's question: \${question}\`
for await (const res of embedbase.generate(prompt)) {
    console.log(res)
}`
}


function cleanPath(path) {
    return path.replace(/\/\//g, '/')
}
function Breadcrumbs() {
    const pathname = usePathname();
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
                            <p
                                className={`ml-4 text-sm font-medium text-gray-500`}
                            >
                                {page.name}
                            </p>
                        </div>
                    </li>
                ))}
            </ol>
        </nav>
    )
}



function UseInSdkModal({ datasetName, open, setOpen }) {

    return (
        <Transition.Root show={open} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={setOpen}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
                                <div>
                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                                        <CodeBracketIcon className="h-6 w-6 text-gray-600" aria-hidden="true" />
                                    </div>
                                    <div className="mt-3 sm:mt-5">
                                        <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                                            {/* underline with link to docs.embedbase.xyz/sdk that open a new tab */}
                                            How to load this dataset directly with the {' '}
                                            <a href="https://docs.embedbase.xyz/sdk" className="underline" rel="noreferrer" target="_blank">Embedbase SDK</a>
                                        </Dialog.Title>
                                        <div className="mt-2">
                                            <Markdown>
                                                {datasetToSdkUsage(datasetName)}
                                            </Markdown>
                                        </div>

                                    </div>
                                </div>
                                <CopyButton
                                    className="mt-5 inline-flex w-full justify-center px-3 py-2 text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                                    textToCopy={datasetToSdkUsage(datasetName)}
                                />
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    )
}


const pageSize = 25;
export default function DataTable({ documents, page, count, datasetId, datasetName }) {
    const [open, setOpen] = useState(false)

    return (
        <div className="rounded-md px-4">
            {/* TODO: move to layout? */}
            <Toaster />
            <UseInSdkModal datasetName={datasetName} open={open} setOpen={setOpen} />
            <Breadcrumbs />
            <div className="mt-4 mb-3 flex justify-between items-center gap-3">
                <div className="flex items-center gap-3">
                    {/* previous */}
                    <Link href={`/datasets/${datasetId}/?page=${page - 1}`}>
                        <SecondaryButton
                            className="flex gap-1"
                            disabled={page === 0}
                        >
                            <ArrowLeftCircleIcon className="h-5 w-5" />
                            Previous
                        </SecondaryButton>
                    </Link>
                    {/* next */}
                    <Link href={`/datasets/${datasetId}/?page=${page + 1}`}>
                        <SecondaryButton
                            className="flex gap-1"
                            disabled={page * pageSize + pageSize >= count}
                        >
                            Next
                            <ArrowRightCircleIcon className="h-5 w-5" />
                        </SecondaryButton>
                    </Link>
                    {/* dispaly count */}
                    <div className="text-gray-500">
                        {page * pageSize} - {page * pageSize + pageSize} of {count}
                    </div>
                </div>
                <div className="flex-col justify-end">

                    <SecondaryButton
                        onClick={() => setOpen(true)}
                        className="gap-1 flex-1"
                    >
                        <CodeBracketIcon height={18} width={18} />
                        Use in Embedbase SDK
                    </SecondaryButton>
                </div>
            </div>

            <table className="min-w-full  ">
                <tbody className="space-y flex flex-col space-y-4">
                    {documents.map((document) => (
                        <tr
                            key={document.id}
                            className="rounded-lg border border-gray-300 bg-white"
                        >
                            {/* copy to clipboard on click */}
                            <td
                                className=" cursor-context-menu px-4 py-4 text-xs	text-gray-500"
                            // onClick={() => handleCopyToClipboard(document.id)}
                            >
                                {document.id.slice(0, 10)}
                            </td>
                            <td>
                                <div className="max-h-[100px] px-3 py-3.5 text-left text-sm text-gray-900">
                                    {/* only keep first 15 chars */}
                                    {document.data.slice(0, 100)}...
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}