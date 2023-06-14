import { Dialog, Transition } from '@headlessui/react'
import {
  ArrowLeftCircleIcon,
  ArrowRightCircleIcon,
  PencilIcon,
  ShareIcon
} from '@heroicons/react/24/outline'
import { SupabaseClient, User, createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { Document } from 'embedbase-js'
import { useRouter } from 'next/router'
import { Fragment, useState } from 'react'
import toast from 'react-hot-toast'
import { SecondaryButton } from '../../../components/Button'
import Dashboard from '../../../components/Dashboard'
import { EMBEDBASE_CLOUD_URL } from '../../../utils/constants'

const EditModal = ({ isModalOpen, setIsModalOpen, modalDocument, setModalDocument, userId }) => {
  const supabase = useSupabaseClient()
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateDocument = async () => {
    setIsLoading(true);

    const newContent = modalDocument.data.trim();

    if (newContent) {
      const res = await supabase
        .from("documents")
        .update({ data: newContent })
        .eq("id", modalDocument.id)
        .eq("user_id", userId);

      if (res.error) {
        toast.error(res.error.message);
      } else {
        toast.success("Document updated successfully, refresh to see the difference");
      }
    }

    setIsLoading(false);
    setIsModalOpen(false);
  };

  return (
    <Transition.Root show={isModalOpen} as={Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-10 overflow-y-auto"
        onClose={() => setIsModalOpen(false)}
      >
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
                <textarea
                  className="resize-none w-full h-40 mt-4 rounded"
                  value={modalDocument?.data}
                  onChange={(e) =>
                    setModalDocument({ ...modalDocument, data: e.target.value })
                  }
                />
              </div>
              <div className="mt-5 sm:mt-6">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus-ring-2 focus-ring-offset-2 focus:ring-purple-500"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus-ring-2 focus-ring-offset-2 focus:ring-purple-500 ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                    disabled={isLoading}
                    onClick={handleUpdateDocument}
                  >
                    {isLoading ? (
                      <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      "Save"
                    )}
                  </button>
                </div>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  )
}

const pageSize = 25;
interface DataTableProps {
  documents: Document[]
  page: number
  count: number
  datasetId: string
  userId: string
}
const DataTable = ({ documents, page, count, datasetId, userId }: DataTableProps) => {
  const [activeDocument, setActiveDocument] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDocument, setModalDocument] = useState(null);
  const supabase = useSupabaseClient()
  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast('Copied to clipboard!')
  }
  const handleDoubleClick = (document) => {
    setActiveDocument((prevDocument) =>
      prevDocument && prevDocument.id === document?.id ? null : document
    );
  };
  const router = useRouter()
  const [isPublic, setIsPublic] = useState(documents[0]?.public === true);

  const onShareDataset = async () => {
    // if the user has no username, send him to /dashboard/account with a toast
    // explaining why

    let res = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single()

    if (res.error) {
      console.log(res.error);
      return toast.error(res.error.message);
    }

    if (!res.data.username) {
      console.log('no username');
      toast.error('You need to set a username before sharing datasets. Redirecting you to account page');
      // wait 2 sec and then push
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return router.push('/dashboard/account');
    }


    console.log(`making dataset ${userId}:${datasetId} ${!isPublic ? 'public' : 'private'}`);

    res = await supabase
      .from('documents')
      .update({ public: !isPublic })
      .eq('dataset_id', datasetId)
      .eq('user_id', userId)

    console.log(res);

    if (res.error) {
      console.log(res.error);
      return toast.error(res.error.message);
    }

    res = await supabase.from('datasets').update({ public: !isPublic })
      .eq('name', datasetId)
      .eq('owner', userId)
    console.log(res);

    if (res.error) {
      console.log(res.error);
      return toast.error(res.error.message);
    }

    setIsPublic(!isPublic);

    console.log(`dataset ${datasetId} is now ${!isPublic ? 'public' : 'private'}`);
    toast(`dataset ${datasetId} is now ${!isPublic ? 'public' : 'private'}`);
    return res;
  }
  const handleEditDocument = (document) => {
    setModalDocument(document);
    setIsModalOpen(true);
  };

  return (
    <div className="rounded-md px-4">
      <EditModal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        modalDocument={modalDocument}
        setModalDocument={setModalDocument}
        userId={userId}
      />
      <div className="flex justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          {/* previous */}
          <SecondaryButton
            className="flex gap-1"
            onClick={() =>
              router.push(`/dashboard/explorer/${datasetId}/?page=${page - 1}`)
            }
            disabled={page === 0}
          >
            <ArrowLeftCircleIcon className="h-5 w-5" />
            Previous
          </SecondaryButton>
          {/* next */}
          <SecondaryButton
            className="flex gap-1"
            onClick={() =>
              router.push(`/dashboard/explorer/${datasetId}/?page=${page + 1}`)
            }
            disabled={page * pageSize + pageSize >= count}
          >
            Next
            <ArrowRightCircleIcon className="h-5 w-5" />
          </SecondaryButton>
          {/* dispaly count */}
          <div className="text-gray-500">
            {page * pageSize} - {page * pageSize + pageSize} of {count}
          </div>
          {/* public or not */}
          <div>
            <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
              {
                isPublic ? 'Public' : 'Private'
              }
            </span>

          </div>
        </div>

        <div className="flex flex-col items-end justify-end">

          <SecondaryButton
            onClick={onShareDataset}
            // smaller on mobile
            className="gap-1 flex-1 sm:flex-none"
          >
            <ShareIcon height={18} width={18} />
            Make {
              isPublic ? 'Private' : 'Public'
            }
          </SecondaryButton>
          {/* show small message beneath explaining what it implies aligned to the end  */}
          <div className="text-gray-500 text-xs text-right sm:block hidden">
            {
              isPublic ?
                <p>This dataset is currently public. Anyone on the internet can read and search this dataset.<br /> Only you can add and write to this dataset.</p> :
                <p>This dataset is currently private.<br /> Only you can read and write to this dataset.</p>
            }
          </div>
        </div>
      </div>

      <table className="min-w-full">
        <tbody className="space-y flex flex-col space-y-4">
          {documents.map((document, index) => (
            <Fragment key={document.id}>
              <tr
                className="cursor-pointer rounded-lg border border-purple-700 border-opacity-25 bg-white"
                // TODO onDoubleClick does not work on mobile
                onDoubleClick={() => handleDoubleClick(document)}
              >
                <td className="px-4 py-2">
                  <SecondaryButton
                    // remove border
                    className="w-10 h-10 rounded-full border-0"
                    type="submit"
                    onClick={() => handleEditDocument(document)}>
                    <PencilIcon />
                  </SecondaryButton>
                </td>
                <td
                  className="select-none cursor-context-menu px-4 py-4 text-xs text-gray-500"
                  onClick={() => handleCopyToClipboard(document.id)}
                >
                  {document.id.slice(0, 10)}
                </td>
                <td>
                  <div className="select-none max-h-[100px] px-3 py-3.5 text-left text-sm text-gray-900">
                    {document.data.slice(0, 100)}...
                  </div>
                </td>
              </tr>
              {activeDocument && activeDocument.id === document.id && (
                <tr
                  onDoubleClick={() => handleDoubleClick(null)}
                >
                  <td colSpan={2}>
                    {/* <div className="px-3 py-3"> */}
                    {/* TODO: markdown incorrect crashes client */}
                    {/* <Markdown> */}
                    <div className="px-3 py-3.5 text-left text-sm text-gray-900 max-w-[80%] overflow-auto">
                      {activeDocument.data}
                      {/* </Markdown> */}
                    </div>
                    {/* </div> */}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>

    </div>
  )
}



export default function Index({ datasetId, documents, page, count, user }: {
  datasetId: string
  documents: any[],
  page: number,
  count: number,
  user: User,
}) {
  return (
    <Dashboard>
      <div className="py-8">
        <DataTable
          documents={documents}
          page={page}
          count={count}
          datasetId={datasetId}
          userId={user.id}
        />
      </div>
    </Dashboard>
  )
}

const getPagination = (page: number, size: number) => {
  const limit = size ? +size : 3
  const from = page ? page * limit : 0
  const to = page ? from + size : size

  return { from, to }
}

const getDatasets = async (apiKey: string) => {
  const { datasets } = await fetch(EMBEDBASE_CLOUD_URL + '/v1/datasets', {
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
  }).then((res) => res.json())
  const formattedDatasets = datasets.map((dataset: any) => ({
    id: dataset.dataset_id,
    documentsCount: dataset.documents_count,
  }))
  return formattedDatasets
}

export const getApiKeys = async (supabase: SupabaseClient, userId) => {
  const { data, status, error } = await supabase
    .from('api-keys')
    .select()
    .eq('user_id', userId)

  if (error && status !== 406) {
    throw error
  }

  // get the first api key
  const apiKey = data[0].api_key
  if (!apiKey) {
    throw new Error('No API key found')
  }
  return apiKey
}

const getDocuments = async (
  supabase: SupabaseClient,
  datasetId: string,
  userId: string,
  range: { from: number; to: number }
) => {
  const { from, to } = range

  const res = await supabase
    .from('documents')
    .select('*', { count: 'exact' })
    .eq('dataset_id', datasetId)
    .eq('user_id', userId)
    .order('id', { ascending: false })
    .range(from, to)

  if (res.error && res.status !== 406) {
    throw res.error
  }
  return res
}

export const getServerSideProps = async (ctx) => {
  // Create authenticated Supabase Client
  const supabase = createPagesServerClient(ctx)
  const { page = 0, size } = ctx.query
  const { from, to } = getPagination(page, pageSize)
  const datasetId = ctx?.query?.datasetId

  // Check if we have a session
  const {
    data: { session },
  } = await supabase.auth.getSession()


  let apiKey: string = ''
  let formattedDatasets: any = []

  let documents: any = []
  let count: number = 0
  try {
    const apiKey = await getApiKeys(supabase, session.user.id)
    formattedDatasets = await getDatasets(apiKey)
    const res = await getDocuments(supabase, datasetId, session.user.id, {
      from,
      to,
    })
    documents = res.data
    count = res.count
  } catch (error) {
    console.log(error)
  }

  return {
    props: {
      initialSession: session,
      user: session.user,
      apiKey,
      datasets: formattedDatasets,
      datasetId,
      documents,
      count: count,
      page: +page,
    },
  }
}
