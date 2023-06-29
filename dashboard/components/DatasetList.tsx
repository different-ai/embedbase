import { Dialog, Transition } from '@headlessui/react'
import { ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import Link from 'next/link'
import { Fragment, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import { useAppStore } from '../lib/store'
import { EMBEDBASE_CLOUD_URL } from '../utils/constants'
import { useApiKeys } from './APIKeys'
import { PrimaryButton } from './Button'
import Card, { CardTitle } from './Card'

const EmptyState = () => {
  const { status, apiKeys } = useApiKeys()
  const firstApiKey = apiKeys?.length > 0 && apiKeys[0].id
  const [hasCreatedDataset, setHasCreatedDataset] = useState(false)
  const insert = async (documents: string[], datasetId: string) => {
    setIsLoading(true)
    const p = fetch(EMBEDBASE_CLOUD_URL + '/v1/' + datasetId, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + firstApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documents: documents.map((document, i) => ({
          id: `testdoc${i}`,
          data: document,
        })),
      }),
    })
    toast.promise(p, {
      loading: 'Saving...',
      success: <b>Inserted!</b>,
      error: <b>Could not insert.</b>,
    })
    return p.then((res) => res.json()).finally(() => setIsLoading(false))
  }

  const insertTestData = async () => {
    const datasetUrl =
      'https://gist.githubusercontent.com/louis030195/acd9479b7a127368d2d30d0a90734bc4/raw/77f5f96de72591541207ddecc45607ff9d3feddf/small.json'
    const dsId = 'test-amazon-product-reviews'
    try {
      const documents = await fetch(datasetUrl)
        .then((res) => res.json())
        .then((data) => data.map((d: any) => d.Text))
      return await insert(documents, dsId).then(() => {
        setHasCreatedDataset(true)
      })
    } catch (e) {
      console.error(e)
      toast.error('😭 Could not create dataset')
    }
  }

  const [isLoading, setIsLoading] = useState(false)
  if (hasCreatedDataset) {
    return (
      <div>
        <Link href="/dashboard/explorer/">
          <PrimaryButton className="mt-4">
            <div>Check out the dataset explorer</div>
          </PrimaryButton>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="">
        <div className="mt-6">
          <div>
            <div className="mb-6 gap-6 space-y-1">
              <h1 className="mb-5 text-2xl font-medium leading-6 text-gray-900">
                Create a sample Embedbase dataset
              </h1>
              <p className="mb-3 max-w-2xl text-sm text-gray-500">
                Try the explorer with some sample data. Click below to add a
                dataset that contains Amazon product reviews.
              </p>
            </div>
          </div>
        </div>

        {/* a button saying "Insert test data" and when hovering, */}
        {/* a tooltip is showing "No data? Insert test data to get started" */}
        <div className="flex flex-col justify-around">
          <div className="mt-1">
            <PrimaryButton
              disabled={isLoading}
              className=""
              onClick={insertTestData}
            >
              Create sample dataset
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  )
}


function DeleteDatasetModal({ userId, datasetId, open, setOpen }) {
  const supabase = useSupabaseClient()

  const onHandleDelete = async () => {

    const p = new Promise(async (resolve, reject) => {
      const { error: documentsError } = await supabase
        .from('documents')
        .delete()
        .eq('user_id', userId)
        .eq('dataset_id', datasetId)
      if (documentsError) {
        throw new Error('Could not delete dataset' + documentsError)
      }

      const { error: datasetsError } = await supabase
        .from('datasets')
        .delete()
        .eq('owner', userId)
        .eq('name', datasetId)
      if (datasetsError) {
        throw new Error('Could not delete dataset' + datasetsError)
      }
      setOpen(undefined)
      resolve(null)
    })
    toast.promise(p, {
      loading: 'Deleting...',
      success: <b>🎉 Dataset deleted, refresh to see changes!</b>,
      error: <b>😭 Could not delete dataset</b>,
    }).finally(() => setOpen(undefined)).catch(console.error)
  }

  const cancelButtonRef = useRef(null)

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-10" initialFocus={cancelButtonRef} onClose={setOpen}>
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                      <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                        Confirm deletion of dataset &quot;{datasetId}&quot;
                      </Dialog.Title>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Are you sure you want to delete the selected dataset? This action cannot be undone
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                    onClick={onHandleDelete}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    onClick={() => setOpen(false)}
                    ref={cancelButtonRef}
                  >
                    Cancel
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}

export function DatasetList({ userId }) {
  const datasets = useAppStore((state) => state.datasets)
  const [isModalOpen, setIsModalOpen] = useState<string | undefined>(undefined)
  if (datasets?.length === 0) return <EmptyState />

  return (
    <div className="flex">
      <DeleteDatasetModal
        userId={userId}
        datasetId={isModalOpen}
        open={isModalOpen !== undefined}
        setOpen={setIsModalOpen}
      />

      <div className="grow">
        <div className="flex flex-wrap gap-4">
          {datasets.map((dataset, i) => (
            <Link key={i} href={`/dashboard/explorer/${dataset.id}`}>
              <Card className="flex h-[130px] w-[300px] max-w-xs flex-1 items-center justify-center rounded-md hover:bg-purple-100">
                <CardTitle className="flex items-center text-lg font-normal text-gray-600">
                  {dataset.id}
                </CardTitle>
                {/* a delete icon */}
                <div className="absolute top-2 right-2">
                  <TrashIcon
                    onClick={(e) => {
                      e.preventDefault()
                      setIsModalOpen(dataset.id)
                    }}
                    className="w-5 h-5 text-gray-400" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div >
  )
}

