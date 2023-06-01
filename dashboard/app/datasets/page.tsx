import { camelize } from '@/utils/helpers'

import Card, { CardTitle } from '@/components/Card'
import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies, headers } from 'next/headers'
import Link from 'next/link'

export default async function Index() {
  const supabase = createServerActionClient({ cookies })

  // Check if we have a session
  // const {
  //     data: { session },
  // } = await supabase.auth.getSession()

  let { data, status, error } = await supabase
    .from('datasets')
    .select('*')
    .eq('public', true)

  if (error) {
    console.log(error)
  }

  const datasets: any[] = camelize(data)

  // console.log(data, session.user.id)

  return (
    <div className="mt-6 flex w-full flex-col gap-3">
      <h3 className="text-2xl font-semibold">
        Datasets{' '}
        <span className="text-md text-gray-500">{datasets?.length || 0}</span>
      </h3>
      <div className="rounded-2xl bg-gray-50 py-5 px-5">
        <p className="mb-3 text-gray-500">You can use public datasets here.</p>
      </div>
      <div className="w-full flex flex-wrap gap-3">
        {datasets?.map((dataset) => (
          <Link key={dataset.id} href={`/datasets/${dataset.id}`}>
            <Card className="flex h-[130px] w-[300px] max-w-xs flex-1 items-center justify-center rounded-md ">
              <CardTitle className="flex items-center text-lg font-normal text-gray-600">
                {dataset.name}
              </CardTitle>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
