'use client'
import { SecondaryButton } from '@/components/Button';
import { CodeBracketIcon } from '@heroicons/react/24/outline';
import Markdown from '@/components/Markdown';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';
import { datasetToSdkUsage, CopyButton } from './DataTable';

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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 text-left transition-all sm:my-8 sm:w-full sm:max-w-xl sm:p-6 border border-gray-100">
                <div>
                  <div className="">
                    <Dialog.Title
                      as="h3"
                      className="mb-3 text-lg leading-6 text-gray-800"
                    >
                      Remix
                    </Dialog.Title>
                    <div className="rounded-md bg-gray-100 p-5 text-sm text-gray-600">
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
                      <Markdown>{datasetToSdkUsage(datasetName)}</Markdown>
                    </div>
                  </div>
                </div>
                <CopyButton
                  className="mt-5 inline-flex w-full justify-center px-3 py-2 text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  textToCopy={datasetToSdkUsage(datasetName)} />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}


export const UseInSdkButton = ({ datasetName }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <UseInSdkModal datasetName={datasetName} open={open} setOpen={setOpen} />
      <SecondaryButton onClick={() => setOpen(true)} className="flex-1 gap-1">
        <CodeBracketIcon height={18} width={18} />
        Remix for your app
      </SecondaryButton>
    </>
  );
};