import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { useApiKeys } from '../../../components/APIKeys'
import { PrimaryButton } from '../../../components/Button'
import Card, { CardTitle } from '../../../components/Card'
import Dashboard from '../../../components/Dashboard'
import { useAppStore } from '../../../lib/store'
import { EMBEDBASE_CLOUD_URL } from '../../../utils/constants'

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

export function DatasetList() {
  const datasets = useAppStore((state) => state.datasets)
  if (datasets?.length === 0) return <EmptyState />
  return (
    <div className="flex">
      <div className="grow">
        <div className="flex flex-wrap gap-4">
          {datasets.map((dataset) => (
            <Link key={dataset.id} href={`/dashboard/explorer/${dataset.id}`}>
              <Card className="flex h-[130px] w-[300px] max-w-xs flex-1 items-center justify-center rounded-md ">
                <CardTitle className="flex items-center text-lg font-normal text-gray-600">
                  {dataset.id}
                </CardTitle>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
export default function Index() {
  return (
    <Dashboard>
      <div className="min-h-[calc(100vh-100px)] rounded-2xl bg-gray-100 py-5 px-5">
        <h3 className="mb-6 text-lg font-medium text-gray-900">Datasets</h3>
        <DatasetList />
      </div>
    </Dashboard>
  )
}

export const getServerSideProps = async (ctx) => {
  // Create authenticated Supabase Client
  const supabase = createServerSupabaseClient(ctx)
  // Check if we have a session
  const {
    data: { session },
  } = await supabase.auth.getSession()



  let apiKey: string = ''
  let formattedDatasets: any = []

  try {
    const { data, status, error } = await supabase
      .from('api-keys')
      .select()
      .eq('user_id', session?.user?.id)

    if (error && status !== 406) {
      throw error
    }
    // get the first api key
    apiKey = data[0].api_key
    if (!apiKey) {
      throw new Error('No API key found')
    }

    const { datasets } = await fetch(EMBEDBASE_CLOUD_URL + '/v1/datasets', {
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
    }).then((res) => res.json())

    formattedDatasets = datasets.map((dataset: any) => ({
      id: dataset.dataset_id,
      documentsCount: dataset.documents_count,
    }))
  } catch (error) {
    console.log(error)
  }

  return {
    props: {
      initialSession: session,
      user: session.user,
      apiKey,
      datasets: formattedDatasets,
    },
  }
}
