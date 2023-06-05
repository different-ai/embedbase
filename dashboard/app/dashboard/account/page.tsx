import Account from '@/components/Account'
import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export default async function Dashboard(ctx) {
  const supabase = createServerActionClient({ cookies })
  const {
    data: { session },
    error: errorSession,
  } = await supabase.auth.getSession()
  const user = session?.user

  const profile = await getProfile()

  async function getProfile() {

    try {
      if (!user) throw new Error('No user')

      let { data, error, status } = await supabase
        .from('profiles')
        .select(`username, website, avatar_url`)
        .eq('id', user.id)
        .single()

      if (error && status !== 406) {
        throw error
      }

      return data
    } catch (error) {
      console.log(error)
    }
  }

  async function updateProfile({
    username,
    // website,
    // avatar_url,
  }: {
    username: string
    // website: string
    // avatar_url: string
  }) {
    'use server'
    try {
      const supabase = createServerActionClient({ cookies })

      // setLoading(true)
      if (!user) throw new Error('No user')

      // check that this username is available

      let { data, error } = await supabase.from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', user.id)

      console.log(data)
      if (error) return error.message

      if (data && data.length > 0) {
        return 'username not available'
      }

      const updates = {
        id: user.id,
        username,
        // website,
        // avatar_url,
        updated_at: new Date().toISOString(),
      }

      let { error: error2 } = await supabase.from('profiles').upsert(updates)
      if (error2) return error2.message
      // alert('Profile updated!')
    } catch (error) {
      // alert('Error updating the data!')
      console.log(error)
      return error.message
    } finally {
      // setLoading(false)
    }
  }

  return (
    <div className="mt-10 w-full">
      <Account user={user} profile={profile} updateProfile={updateProfile} />
    </div>
  )
}

