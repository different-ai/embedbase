import Link from 'next/link'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'
import SignupForm from '../components/SignupForm'

export const WideButton = ({ children, ...props }) => {
  return (
    <button
      className="rounded bg-blue-500 py-2 px-4 font-bold text-white hover:bg-blue-700"
      {...props}
    >
      {children}
    </button>
  )
}

function Registration() {
  return (
    <>
      <div className="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Sign up for Embedbase
          </h2>
          <p className="mt-3 text-center text-sm text-gray-600">
            Embedbase is makes it easy to hook your data to LLMs.
          </p>
          <p className="mt-2 text-center text-sm text-gray-900">
            Or{' '}
            <a
              className="font-semibold "
              href="https://cal.com/potato/20min?duration=20"
            >
              schedule a demo
            </a>
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <SignupForm />
          </div>
        </div>
        <p className="mt-2 text-center text-sm text-gray-600">
          Already have an account?
          <Link className="font-semibold" href="/login">
            {' '}
            Sign in
          </Link>
        </p>
      </div>
    </>
  )
}

export const getServerSideProps = async (ctx) => {
  // Create authenticated Supabase Client
  const supabase = createServerSupabaseClient(ctx)
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
    return {
      redirect: {
        destination: 
          !hasKey ?
          '/onboarding/create-api-key' :
          '/dashboard',
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

export default Registration
