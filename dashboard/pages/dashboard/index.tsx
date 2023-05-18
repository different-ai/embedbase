import FileDataLoader from '@/components/FileDataLoader'
import { GithubDataLoader } from '@/components/GithubDataLoader'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { useEffect } from 'react'
import { ApiKeyList } from '../../components/APIKeys'
import Dashboard from '../../components/Dashboard'
import { Dataset } from '../../hooks/useDatasets'
import { useAppStore } from '../../lib/store'
import { EMBEDBASE_CLOUD_URL } from '../../utils/constants'
import { DatasetList } from './explorer'

export function APIKeySection() {
  return (
    // a left and right panel, left panel is the search bar, right panel is tips to add data
    <ApiKeyList />
  )
}

function DataImporter() {
  return (
    <div className="rounded-2xl bg-gray-50 py-4 px-5">
      <p className="mb-3 text-sm text-gray-500">
        The fastest way to import your data into Embedbase.{' '}
      </p>
      <p className="mb-3 text-sm text-gray-500">
        For more complex use cases, check out our{' '}
        <a
          className="text-blue-700 underline"
          href="https://docs.embedbase.xyz?search=how-to-import-data"
        >
          docs
        </a>{' '}
        to learn how to import data programmatically.
      </p>
      {/* <h3 className="">PDF Importer</h3> */}
      <FileDataLoader />
    </div>
  )
}


export default function Index({
  apiKey,
  datasets,
}: {
  apiKey: string
  datasets: Dataset[]
}) {
  const setApiKey = useAppStore((state) => state.setApiKey)
  const setDataset = useAppStore((state) => state.setDatasets)

  useEffect(() => {
    setApiKey(apiKey)
    setDataset(datasets)
  }, [apiKey, datasets, setApiKey, setDataset])

  return (
    <Dashboard>
      <div className="flex flex-col py-6">
        <h3 className="mb-3 font-semibold text-gray-700 ">Your API Keys</h3>
        <div className="w-full rounded-2xl bg-gray-50 py-4 px-5">
          <p className="mb-3 text-sm text-gray-500">
            Click on an API Key below to add it to your clipboard.
          </p>

          <APIKeySection />
        </div>
        <div className="col-span-6 mt-3">
          <h3 className="mb-3 font-semibold text-gray-700">Dataset Importer</h3>
          <DataImporter />
          <h3 className="my-3 font-semibold text-gray-700">Your Datasets</h3>
          <DatasetList />
        </div>
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
  // Check if we have a session
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
      user: session?.user ?? {},
      apiKey,
      datasets: formattedDatasets,
    },
  }
}
