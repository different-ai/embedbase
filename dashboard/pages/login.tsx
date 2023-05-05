import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import LoginForm from '../components/LoginForm'

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

function Login() {
  return (
    <>
      <div className="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Sign In
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link className="font-semibold text-black" href="/signup">
              create an account
            </Link>
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <LoginForm />
          </div>
        </div>
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

export default Login
