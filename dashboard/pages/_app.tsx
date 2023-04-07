import { usePostHog } from 'next-use-posthog'
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { MyUserContextProvider } from '../utils/useUser'
import '../styles/globals.css'


import { Toaster } from 'react-hot-toast'
import { useState, useEffect } from 'react'
import Head from 'next/head'
import { posthog } from 'posthog-js'

export default function App({ Component, pageProps }) {
  usePostHog('phc_plfzAimxHysKLaS80RK3NPaL0OJhlg983m3o5Zuukp', {
    api_host: 'https://app.posthog.com',
  })
  const [supabase] = useState(() => createBrowserSupabaseClient())

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.id) posthog.identify(session.user.id)
    })
  }, [supabase])

  return (
    <>
      <Head>
        <title>Embedbase | The glue between your data and ChatGPT</title>
      </Head>


      <SessionContextProvider supabaseClient={supabase} initialSession={pageProps.initialSession}>
        <MyUserContextProvider>
          <Component {...pageProps} />
          <Toaster />
        </MyUserContextProvider>
      </SessionContextProvider>

    </>

  )
}
