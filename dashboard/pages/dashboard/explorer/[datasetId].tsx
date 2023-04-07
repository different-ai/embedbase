import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'
import Dashboard from '../../../components/Dashboard'
import { PrimaryButton, SecondaryButton } from '../../../components/Button'
import { useApiKeys } from '../../../components/APIKeys'
import TextField from '../../../components/TextField'
import Card from '../../../components/Card'
import { EMBEDBASE_CLOUD_URL } from '../../../utils/constants'
import { useRouter } from 'next/router'
import {
  ArrowLeftCircleIcon,
  ArrowRightCircleIcon,
} from '@heroicons/react/24/outline'

const url = 'https://api.embedbase.xyz'

interface DatasetsProps {
  selectedDataset: string
  setSelectedDataset: (dataset: string) => void
}
interface Dataset {
  id: string
  documentsCount: number
}

interface Similarity {
  data: string
  score: number
}
interface SearchResponse {
  similarities: Similarity[]
}

const DataTable = ({ documents, page, count, datasetId }) => {
  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast('Copied to clipboard!')
  }
  const router = useRouter()

  return (
    <div className="rounded-md px-4">
      <div className="mb-3 flex items-center gap-3">
        {/* previous */}
        <SecondaryButton
          className="flex gap-1"
          onClick={() =>
            router.push(`/dashboard/explorer/${datasetId}/?page=${page - 1}`)
          }
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
        >
          Next
          <ArrowRightCircleIcon className="h-5 w-5" />
        </SecondaryButton>
        {/* dispaly count */}
        <div className="text-gray-500">
          {page * 10} - {page * 10 + 10} of {count}
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
                onClick={() => handleCopyToClipboard(document.id)}
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

export function SearchSection({ datasetId }) {
  const { apiKeys } = useApiKeys()
  const firstApiKey = apiKeys?.length > 0 && apiKeys[0].id

  const [searchResults, setSearchResults] = useState<SearchResponse>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const search = async (searchInput: string, datasetId: string) => {
    setIsLoading(true)
    const p = fetch(url + '/v1/' + datasetId + '/search', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + firstApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchInput,
      }),
    })

    toast.promise(p, {
      loading: 'Searching...',
      success: <b>Search results!</b>,
      error: <b>Could not search.</b>,
    })
    p.then((res) => res.json())
      .then((data) => {
        setSearchResults(data)
        return data
      })
      .finally(() => setIsLoading(false))
  }
  const handleSubmit = (e) => {
    e.preventDefault()
    // get value from inputref
    const query = searchInputRef.current.value
    search(query, datasetId)
  }

  return (
    // a left and right panel, left panel is the search bar, right panel is tips to add data
    <div className="flex w-full flex-row gap-6">
      {/* vertical list, left panel, minimum 70% width */}

      <div className="flex w-3/4 flex-col gap-6">
        <div className="w-full rounded-2xl bg-gray-100 py-5 px-5">
          <div className="mt-6">
            <div>
              <div className="mb-6 gap-6 space-y-1">
                <h1 className="mb-5 text-2xl font-medium leading-6 text-gray-900">
                  Explorer
                </h1>
                <p className="mb-3 max-w-2xl text-sm text-gray-500">
                  Hi! This is the Embedbase dataset explorer. You can use it to
                  search your datasets. If you want to know how to create a
                  dataset look at the tutorial
                  <Link href="/dashboard/tutorial" className="mx-1 underline">
                    here.
                  </Link>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <form
              className="flex flex-row items-end gap-6"
              onSubmit={handleSubmit}
            >
              <div className="flex w-full flex-col">
                <label
                  htmlFor="query"
                  className="block text-sm font-medium text-gray-700"
                >
                  Search something inside your dataset
                </label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <TextField
                    placeholder="e.g. Breakfast food"
                    ref={searchInputRef}
                  />
                </div>
              </div>
              {/* a search button aligned on the bottom */}
              <div className="flex h-full flex-col">
                <PrimaryButton
                  type="submit"
                  disabled={
                    isLoading || !datasetId || !searchInputRef?.current?.value
                  }
                  className="min-h-[42px] w-full px-8 font-bold"
                >
                  Search
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex flex-col justify-around">
            <div className="mt-1">
              <div className="flex flex-col space-y-6 rounded-md text-sm text-gray-500 shadow-sm">
                {searchResults?.similarities?.map((similarity, i) => {
                  return (
                    <ul key={i} role="list" className="">
                      <Card>{similarity.data}</Card>
                    </ul>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* a vertical line separating left and right panels */}
    </div>
  )
}

export default function Index({ datasetId, documents, page, count }) {
  return (
    <Dashboard>
      <div className="py-8">
        <SearchSection datasetId={datasetId} />
        <DataTable
          documents={documents}
          page={page}
          count={count}
          datasetId={datasetId}
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

export const getApiKeys = async (supabase: any, userId) => {
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
  supabase: any,
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
    // .order('id', { ascending: true })
    .range(from, to)

  if (res.error && res.status !== 406) {
    throw res.error
  }
  return res
}

export const getServerSideProps = async (ctx) => {
  // Create authenticated Supabase Client
  const supabase = createServerSupabaseClient(ctx)
  const { page = 1, size } = ctx.query
  const { from, to } = getPagination(page, 25)
  const datasetId = ctx?.query?.datasetId

  // Check if we have a session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session)
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    }

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
