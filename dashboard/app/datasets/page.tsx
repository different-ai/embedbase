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
      <div className="rounded-2xl bg-[#912ee8] bg-opacity-[75%] py-5 px-5">
        <p className="text-white">
          {`Here you'll find a list of public datasets, that you can use to start
          building your app, remix or just play around with.`}
        </p>
      </div>
      <div
        className="mx-auto grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 w-full"
        style={{ minWidth: 200 }}
      >
        {datasets?.map((dataset) => (
          <Link key={dataset.id} href={`/datasets/${dataset.id}`}>
            <Card className="flex h-[130px] max-w-xs">
              <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
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
