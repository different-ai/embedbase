import { camelize } from '@/utils/helpers'

import Card, { CardSubtitle, CardTitle } from '@/components/Card'
import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Link from 'next/link'

export default async function Index() {
  const supabase = createServerActionClient({ cookies })

  // Check if we have a session
  // const {
  //     data: { session },
  // } = await supabase.auth.getSession()

  let { data, status, error } = await supabase
    .from('public_dataset_view')
    .select('*')

  if (error) {
    console.log(error)
  }

  const datasets: any[] = camelize(data)


  return (
    <div className="mt-6 flex w-full flex-col gap-3">
      <h3 className="text-2xl font-semibold">Datasets</h3>
      <div className="rounded-2xl bg-gray-50 py-5 px-5">
        <p className="mb-3 text-gray-500">
          {`Here you'll find a list of public datasets, that you can use to start
          building your app, remix or just play around with.`}
        </p>
      </div>
      <div className="flex w-full flex-wrap gap-3">
        {datasets?.map((dataset) => (
          <Link key={dataset.id} href={`/datasets/${dataset.id}`}>
            <Card className="flex h-[130px] w-[300px] max-w-xs flex-1 items-center justify-center rounded-md ">
              <CardTitle className="flex items-center text-lg font-normal text-gray-600">
                {dataset.name}
              </CardTitle>
              <CardSubtitle className="flex items-center text-sm font-normal text-gray-400">
                {dataset.ownerUsername}
              </CardSubtitle>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
