'use client'
import { SecondaryButton } from '@/components/Button'
import { CodeBracketIcon } from '@heroicons/react/24/outline'
import Markdown from '@/components/Markdown'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useState } from 'react'
import { CopyButton } from './DataTable'
import { useDataSetItemStore } from './store'

function UseInSdkModal({ datasetName, open, setOpen }) {
  const query = useDataSetItemStore((state) => state.query)
  const question = useDataSetItemStore((state) => state.userQuestion)
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
          <div className="fixed inset-0 bg-opacity-75 transition-opacity" />
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg border border-[#912ee8] border-opacity-25 bg-white px-4 pb-4 text-left transition-all sm:my-8 sm:w-full sm:max-w-xl sm:p-6">
                <div>
                  <div className="">
                    <Dialog.Title
                      as="h3"
                      className="mb-3 text-lg leading-6 text-gray-800"
                    >
                      Remix
                    </Dialog.Title>
                    <div className="rounded-md bg-gray-50 p-5 text-sm text-gray-600">
                      You can easily re-use this dataset in your own application
                      using the&nbsp;
                      <a
                        href="https://docs.embedbase.xyz/sdk"
                        className="underline"
                        rel="noreferrer"
                        target="_blank"
                      >
                        Embedbase SDK
                      </a>
                    </div>

                    <div className="mt-2">
                      <Markdown>
                        {datasetToSdkUsage(datasetName, query, question)}
                      </Markdown>
                    </div>
                  </div>
                </div>
                <CopyButton
                  className="mt-5 inline-flex w-full justify-center px-3 py-2 text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  textToCopy={datasetToSdkUsage(datasetName, query, question)}
                />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}

export const UseInSdkButton = ({ datasetName }) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <UseInSdkModal datasetName={datasetName} open={open} setOpen={setOpen} />
      <SecondaryButton
        onClick={() => setOpen(true)}
        className="fle mr-2 max-w-max items-center gap-1 "
      >
        <div className="font-normal text-gray-900">Remix for your app</div>
        <CodeBracketIcon height={12} width={12} />
      </SecondaryButton>
    </>
  )
}

export const datasetToSdkUsage = (
  datasetName,
  query,
  question = 'write down a question here'
) => {
  return ` \`\`\`js
const { createClient } = require("embedbase-js");

const embedbase = createClient('https://api.embedbase.xyz', '<grab the api key here https://app.embedbase.xyz/>')
const question = "${question}";

(async () => {
  console.log("retrieving data...");
  const context = await embedbase.dataset('${datasetName}').createContext(${query});

  console.log("generating data");
  const response = await embedbase.generate(\`\${context} \${question}\`).get();
  console.log(response.join(""));
})();


\`\`\``
}
