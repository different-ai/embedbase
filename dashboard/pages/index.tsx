import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'

const Index = () => {
  return (
    <div>
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
    console.log('hasKey', hasKey)
    return {
      redirect: {
        destination: !hasKey ? '/onboarding/create-api-key' : '/dashboard',
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
