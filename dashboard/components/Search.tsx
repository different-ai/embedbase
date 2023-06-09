'use client'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from 'embedbase-js'
import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { useDataSetItemStore } from '../app/datasets/[id]/store'
import { getApiKeys } from '../pages/dashboard/explorer/[datasetId]'
import { PrimaryButton } from './Button'
import { Input } from './Input'

const SearchBar = () => {
  const [search, setSearch] = useState('')
  const datasetName = useDataSetItemStore((state) => state.name)
  const setQuery = useDataSetItemStore((state) => state.setQuery)
  const setDocuments = useDataSetItemStore((state) => state.setDocuments)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setQuery(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const supabase = createClientComponentClient()
    // check if session
    const {
      data: { session },
    } = await supabase.auth.getSession()
    // if no session
    if (!session) {
      toast.error('Please sign in to chat')
      return
    }

    const apiKey = await getApiKeys(supabase, session.user.id)

    const embedbase = createClient(
      'https://api.embedbase.xyz',
      apiKey
      //   '093d0aaf-11b2-4046-8f7f-5bd703b26957'
    )
    embedbase
      .dataset(datasetName)
      .search(search, {limit: 10})
      .then((res) => {
        console.log(res)
        setDocuments(res)
      })
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
      <PrimaryButton>Search</PrimaryButton>
    </form>
  )
}

export default SearchBar
