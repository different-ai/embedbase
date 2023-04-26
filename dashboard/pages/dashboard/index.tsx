import Dashboard from '../../components/Dashboard'
import { ApiKeyList, CreateAPIKey } from '../../components/APIKeys'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { DatasetList } from './explorer'
import { EMBEDBASE_CLOUD_URL } from '../../utils/constants'
import { useAppStore } from '../../lib/store'
import { useEffect } from 'react'
import { Dataset } from '../../hooks/useDatasets'
import { DataLoader } from '@/components/DataLoader'

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
        <h3 className="text-2xl font-semibold">Datasets</h3>
        <DataLoader />
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
