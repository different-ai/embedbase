'use client'
import { getRedirectURL } from '@/lib/redirectUrl'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createExperimentalClient } from 'embedbase-js'
import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { useDataSetItemStore } from '../app/datasets/[id]/store'
import { getApiKeys } from '../pages/dashboard/explorer/[datasetId]'
import { PrimaryButton } from './Button'
import { Input } from './Input'
import Spinner from './Spinner'

const SearchBar = () => {
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const datasetName = useDataSetItemStore((state) => state.name)
  const setQuery = useDataSetItemStore((state) => state.setQuery)
  const setDocuments = useDataSetItemStore((state) => state.setDocuments)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setQuery(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    if (!search.trim()) return
    if (true) return
    const supabase = createClientComponentClient()
    // check if session
    const {
      data: { session },
    } = await supabase.auth.getSession()
    // if no session
    if (!session) {
      toast.error('Please sign in to search')
      return
    }

    const apiKey = await getApiKeys(supabase, session.user.id)

    const embedbase = createExperimentalClient(
      'https://api.embedbase.xyz',
      apiKey
    )

    // const augmentedQuery = await augmentSearchQuery(search)

    embedbase
      .dataset(datasetName)
      .search(search, {
        limit: 10,
        url: `${getRedirectURL()}api/search`,
      })
      .then((res) => {
        console.log(res)
        const relevant = res.filter((item) => item.score >= 0.7)
        setDocuments(relevant)
      })
      .finally(() => setLoading(false))
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <Input
        className="w-full"
        type="text"
        placeholder="Search any data"
        value={search}
        onChange={handleChange}
      />
      {loading && (
        <PrimaryButton disabled className="flex gap-3">
          Loading <Spinner />
        </PrimaryButton>
      )}

      {!loading && <PrimaryButton type="submit">Search</PrimaryButton>}
    </form>
  )
}

export default SearchBar
