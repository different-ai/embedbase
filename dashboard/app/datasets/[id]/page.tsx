import {
  SupabaseClient,
  createServerActionClient,
  createServerComponentClient,
} from '@supabase/auth-helpers-nextjs'
import { cookies, headers } from 'next/headers'
import DataTable from './DataTable'
import { UseInSdkButton } from './UseInSdkModal'
import { Sandpack } from '@codesandbox/sandpack-react'

import { NewChat } from './NewChat'
import { CONSOLE_LEVELS } from '@sentry/utils'
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
  }: { documents: any[]; datasetName: string; count: number } =
    await getDocuments(supabase, datasetId, {
      from,
      to,
    })


  return (
    <div className="flex flex-col justify-between gap-3 sm:grid sm:grid-cols-9">
      <div className="sm:col-span-6">
        <DataTable
          documents={documents}
          page={parseInt(page)}
          count={count}
          datasetName={datasetName}
          datasetId={datasetId}
        />
      </div>

      <div className="flex flex-col gap-3 sm:col-span-3">
        <div className="rounded-md border border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="p-4 text-lg font-semibold text-gray-700">
              Chat Playground
            </h3>
            <UseInSdkButton datasetName={datasetName} />
          </div>
          <NewChat />
        </div>
      </div>
    </div>
  )
}

const getApiKeys = async (supabase: SupabaseClient, userId) => {
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

  const res = await getDataset(supabase, datasetId)
  const res2 = await getDatasetDocuments(
    supabase,
    res.data.name,
    res.data.owner,
    from,
    to
  )

  return {
    documents: res2.data,
    count: res2.count,
    datasetName: res.data.name,
    datasetOwner: res.data.owner,
  }
}

const getDataset = async (supabase: SupabaseClient, datasetId: string) => {
  const res = await supabase
    .from('public_dataset_view')
    .select('name,owner')
    .eq('id', datasetId)
    .single()

  if (res.error) {
    console.log(datasetId, res)
    throw res.error
  }

  return res
}

const getDatasetDocuments = async (
  supabase: SupabaseClient,
  datasetName: string,
  datasetOwner: string,
  from: number,
  to: number
) => {
  const res2 = await supabase
    .from('documents')
    .select('*', { count: 'exact' })
    .eq('dataset_id', datasetName)
    .eq('user_id', datasetOwner)
    // HACK: unnecessary I think - even if someone tries to use private id policy will fail
    // .eq('public', true)
    .range(from, to)

  if (res2.error && res2.status !== 406) {
    console.log(res2)
    throw res2.error
  }
  return res2
}
