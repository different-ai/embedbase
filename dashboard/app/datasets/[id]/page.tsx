import {
  SupabaseClient,
  createServerComponentClient,
} from '@supabase/auth-helpers-nextjs'
import { cookies, headers } from 'next/headers'
import DataTable from './DataTable'
import { UseInSdkButton } from './UseInSdkModal'

import { NewChat } from './NewChat'
import SearchBar from '@/components/Search'
const pageSize = 25

export default async function Index(context) {
  const supabase = createServerComponentClient({ cookies })
  const { page = 0, size } = context.searchParams || {}
  const { from, to } = getPagination(page, pageSize)
  const datasetId = context?.params?.id

  const {
    documents,
    datasetName,
    count,
    datasetOwnerUsername,
  }: {
    documents: any[]
    datasetName: string
    count: number
    datasetOwnerUsername: string
  } = await getDocuments(supabase, datasetId, {
    from,
    to,
  })

  return (
    <div className="flex flex-col justify-between gap-3 sm:grid sm:grid-cols-9">
      <div className="flex flex-col gap-3 sm:col-span-6">
        <SearchBar />
        <DataTable
          documents={documents}
          page={parseInt(page)}
          count={count}
          datasetName={datasetName}
          datasetOwnerUsername={datasetOwnerUsername}
          datasetId={datasetId}
        />
      </div>

      <div className="flex flex-col gap-3 sm:col-span-3">
        <UseInSdkButton datasetName={datasetName} />
        <div className="rounded-md border border-purple-700 border-opacity-25">
          <div className="flex items-center justify-between">
            <h3 className="p-4 text-lg font-semibold text-gray-700">
              Chat Playground
            </h3>
          </div>
          <NewChat />
        </div>
      </div>
    </div>
  )
}

const getPagination = (page: number, size: number) => {
  const limit = size ? +size : 3
  const from = page ? page * limit : 0
  const to = page ? from + size : size

  return { from, to }
}

const getDocuments = async (
  supabase: SupabaseClient,
  datasetId: string,
  range: { from: number; to: number }
) => {
  const { from, to } = range
  console.log(from, to)

  const res = await getDataset(supabase, datasetId)
  const {documents, count} = await getDatasetDocuments(
    supabase,
    res.data.name,
    res.data.owner,
    from,
    to
  )

  return {
    documents: documents,
    count: count,
    datasetName: res.data.name,
    datasetOwner: res.data.owner,
    datasetOwnerUsername: res.data.owner_username,
  }
}

const getDataset = async (supabase: SupabaseClient, datasetId: string) => {
  const res = await supabase
    .from('public_dataset_view')
    .select('name,owner, owner_username')
    .eq('id', datasetId)
    .single()

  if (res.error) {
    console.log(datasetId, res)
    throw res.error
  }

  return res
}
// Define type aliases for better readability
type DatasetName = string;
type DatasetOwner = string;

const getDatasetDocuments = async (
  supabase: SupabaseClient,
  datasetName: DatasetName,
  datasetOwner: DatasetOwner,
  from: number,
  to: number
) => {
  // Use descriptive variable names instead of generic ones like 'res2'
  console.log('hello')
  console.log(from, to)
  console.log('datasetName', datasetName)
  const { data: documents, error, status, count } = await supabase
    .from('documents')
    // Use named parameters instead of chaining multiple 'eq' calls
    .select('*', { count: 'exact' })
    .eq('dataset_id', datasetName)
    .eq('user_id', datasetOwner)
    // Remove unnecessary comment
    .eq('public', true)
    .order('created_date', { ascending: false })
    .range(from, to);

  // Handle error with a descriptive error message
  if (error && status !== 406) {
    console.error(`Error fetching documents for dataset ${datasetName} owned by ${datasetOwner}:`, error);
    throw error;
  }

  // Return the fetched documents
  return {documents, count};
}