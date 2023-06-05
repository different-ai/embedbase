import { ArrowRightCircleIcon } from '@heroicons/react/20/solid'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from 'embedbase-js'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { PrimaryButton } from '@/components/Button'
import { CenteredLayout } from '@/components/Layout'
import { EMBEDBASE_CLOUD_URL, defaultDataset } from '@/utils/constants'

const Index = ({ apiKey }) => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const embedbase = createClient(EMBEDBASE_CLOUD_URL, apiKey)
  const handleNext = async () => {
    setLoading(true)
    await insertTestData()
    await router.push('/onboarding/create-username')
    setLoading(false)
  }
  const insertTestData = async () => {
    const dsId = 'test-amazon-product-reviews'
    const documents = defaultDataset.map((d: any) => ({ data: d.Text }))
    await embedbase.dataset(dsId).batchAdd(documents)
  }
  const isDisabled = loading

  return (
    <div>
      <CenteredLayout>
        <div className="text-center">
          <h3 className="mt-2 text-4xl font-semibold text-gray-900">
            Creating a dataset
          </h3>
          <p className="mt-1 text-gray-500">{`At Embedbase, everything starts with a dataset. Datasets are used to store your data. You can think of them as the source of a stream that pours your data into GPT. `}</p>
          <div className="mt-6">
            <PrimaryButton
              type="button"
              onClick={handleNext}
              disabled={isDisabled}
            >
              {loading && 'Loading...'}
              {!loading && 'Create a sample dataset'}
              <ArrowRightCircleIcon
                className="-mr-1 ml-1.5 h-5 w-5 "
                aria-hidden="true"
              />
            </PrimaryButton>
          </div>
        </div>
      </CenteredLayout>
    </div>
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
  } catch (error) {
    console.log(error)
  }

  return {
    props: {
      initialSession: session,
      user: session.user,
      apiKey,
    },
  }
}

export default Index
