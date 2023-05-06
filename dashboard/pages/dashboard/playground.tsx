import Banner from '@/components/Banner'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Dashboard from '../../components/Dashboard'
import SmartChat, { useSmartChatStore } from '../../components/SmartChat'
import { Dataset } from '../../hooks/useDatasets'
import { useAppStore } from '../../lib/store'
import { EMBEDBASE_CLOUD_URL } from '../../utils/constants'

import ShareModal from '@/components/ShareModal'
import { PrimaryButton, SecondaryButton } from '@/components/Button'
import { ShareIcon } from '@heroicons/react/24/outline'

export function Playground() {
  const router = useRouter()
  const addToSetDatasetIds = useSmartChatStore(
    (state) => state.addToSetDatasetIds
  )
  const clearSelectedDatasetId = useSmartChatStore(
    (state) => state.clearSelectedDatasetId
  )

  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  useEffect(() => {
    if (router.query.datasetId) {
      clearSelectedDatasetId()
      addToSetDatasetIds(router.query.datasetId as string)
    }
  }, [router.query.datasetId])

  return (
    <>
      <ShareModal open={isShareModalOpen} setOpen={setIsShareModalOpen} />

      <div>
        <div className="mt-6">
          {router.query.new === 'true' && (
            <Banner
              className="mb-6"
              title={`Your dataset is loading`}
              text={`You can start asking questions.
                This can take up to 5 minutes.`}
            />
          )}
          <div className="mb-6 gap-6 space-y-1">
            <div className="flex w-full justify-between">
              <h3 className="mb-6 text-2xl font-semibold text-gray-900">
                Playground{' '}
              </h3>
              <div>
                <SecondaryButton
                  onClick={() => setIsShareModalOpen(true)}
                  className="flex max-w-max gap-2"
                >
                  <ShareIcon height={18} width={18} />
                  Share this Playground
                </SecondaryButton>
              </div>
            </div>

            <div className="rounded-2xl bg-gray-50 py-5 px-5">
              <p className="text-sm text-gray-500">
                {`The playground simplifies prototyping. On the left you can
                select an embedbase "dataset". The playground will automatically
                get information from this dataset and add it inside the ChatGPT
                prompt. You can share this playground with anyone by clicking on the "Share this Playground" button. `}
              </p>
            </div>
          </div>

          <SmartChat />
        </div>
      </div>
    </>
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
      <Playground />
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

  if (!session)
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
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
      user: session.user,
      apiKey,
      datasets: formattedDatasets,
    },
  }
}
