import {
  SupabaseClient,
  createServerActionClient,
} from '@supabase/auth-helpers-nextjs'
import { cookies, headers } from 'next/headers'
import DataTable, { UseInSdkButton } from './DataTable'
import { DisabledChatSkelton } from './DisabledChatSkelton'
const pageSize = 25

export default async function Index(ctx) {
  const supabase = createServerActionClient({ cookies })
  const { page = 0, size } = ctx.searchParams || {}
  const { from, to } = getPagination(page, pageSize)
  const datasetId = ctx?.params?.id

  let documents: any = []
  let count: number = 0
  let datasetName = ''
  try {
    const {
      documents: d,
      datasetName: n,
      datasetOwner,
      count: c,
    } = await getDocuments(supabase, datasetId, {
      from,
      to,
    })
    datasetName = n
    documents = d
    count = c
  } catch (error) {
    console.log(error)
  }
  return (
    <div className="flex">
      <DataTable
        documents={documents}
        page={parseInt(page)}
        count={count}
        datasetId={datasetId}
      />

      {/* hide on mobile */}
      <div className="flex flex-col items-center justify-center gap-3">
        <UseInSdkButton datasetName={datasetName} />
        <DisabledChatSkelton />
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

  const res = await supabase
    .from('datasets')
    .select('name,owner')
    .eq('id', datasetId)
    .single()

  if (res.error) {
    console.log(datasetId, res)
    throw res.error
  }

  const res2 = await supabase
    .from('documents')
    .select('*', { count: 'exact' })
    .eq('dataset_id', res.data.name)
    .eq('user_id', res.data.owner)
    .eq('public', true)
    .range(from, to)

  if (res2.error && res2.status !== 406) {
    console.log(res2)
    throw res2.error
  }
  return {
    documents: res2.data,
    count: res2.count,
    datasetName: res.data.name,
    datasetOwner: res.data.owner,
  }
}
