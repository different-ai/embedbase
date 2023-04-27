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
    <div className="flex flex-col gap-6">
      {/* a sheader for a section about api keys */}
      <div className="flex w-3/4 flex-col gap-6">
        <ApiKeyList />
      </div>
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
      <div className="flex flex-col gap-6 py-6">
        <div className="rounded-2xl bg-gray-100 py-4 px-5">
          <h3 className="mb-6 text-2xl font-semibold">API Key</h3>
          <APIKeySection />
        </div>
        <div className="rounded-2xl bg-gray-100 py-4 px-5">
          <h3 className="mb-6 text-2xl font-semibold">Dataset Importer</h3>
          <p className="text-gray-500 mb-3">
            Here you can easily import your data into Embedbase. You can either upload a file or import a Github repository.

          </p>
          <p className="text-gray-500 mb-3">
            For more complex use cases, check out our <a className="underline text-blue-700" href="https://docs.embedbase.xyz?search=how-to-import-data">docs</a> to learn how to import data programmatically.
          </p>
          <h3 className="mb-3 text-xl font-semibold">PDF Importer</h3>

          <FileDataLoader />
          <div className='text-gray-600 my-6'>or</div>
          <h3 className="mb-3 text-xl font-semibold">Github Importer</h3>

          <GithubDataLoader />
        </div>
        <h3 className="text-2xl font-semibold">Datasets</h3>
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
  // Check if we have a session
  if (!session) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    }
  }

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
