import { ArrowRightCircleIcon } from '@heroicons/react/20/solid'
import { useRouter } from 'next/router'
import {  CreateAPIKeyV2 } from '../../components/APIKeys'
import { CenteredLayout } from '../../components/Layout'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'

const Index = () => {
  const router = useRouter()
  const handleNext = () => {
    router.push('/onboarding/create-dataset')
  }

  return (
    <div>
      <CenteredLayout>
        <div className="text-center">
          <h3 className="mt-2 text-4xl font-semibold text-gray-900">
            Welcome to Embedbase
          </h3>
          <p className="mt-1 text-gray-500">
            {`To get started let's create an API key.`}
          </p>
          <div className="mt-6">
            <CreateAPIKeyV2 onSuccess={handleNext}>
              Create an API Key
              <ArrowRightCircleIcon
                className="-mr-1 ml-1.5 h-5 w-5 "
                aria-hidden="true"
              />
            </CreateAPIKeyV2>
          </div>
        </div>
      </CenteredLayout>
    </div>
  )
}

export const getServerSideProps = async (ctx) => {
  // Create authenticated Supabase Client
  const supabase = createPagesServerClient(ctx)
  // Check if we have a session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const hasApiKey = async () => {
    try {
      const { data, status, error } = await supabase
        .from('api-keys')
        .select()
        .eq('user_id', session?.user?.id)
      if (error && status !== 406) {
        throw error
      }
      return data.length > 0
    } catch (e) {
      console.error(e)
      return false
    }
  }

  if (session) {
    const hasKey = await hasApiKey()
    if (!hasKey) return
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    }
  }

  return {
    props: {
      initialSession: session,
      user: session?.user ?? {},
    },
  }
}


export default Index
