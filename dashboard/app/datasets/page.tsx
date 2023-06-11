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
      <h3 className="text-2xl font-semibold text-purple-800">Welcome to Vector Hub</h3>
      <div className="rounded-2xl bg-purple-200 bg-opacity-[25%] py-5 px-5">
        <p className="text-purple-900">
          {`Here you'll find a list of public datasets, that you can use to start
          building your app, remix or just play around with.`}
        </p>
      </div>
      <div
        className="mx-auto grid w-full grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        style={{ minWidth: 200 }}
      >
        {datasets?.map((dataset) => (
          <Link key={dataset.id} href={`/datasets/${dataset.id}`}>
            <Card className="flex h-[130px] w-full hover:bg-purple-100 sm:max-w-xs">
              <CardTitle className="flex items-center text-lg font-semibold text-purple-800">
                {dataset.name}
              </CardTitle>
              <CardSubtitle className="flex gap-1 items-center font-normal ">
                <div className="text-xs text-gray-400"> by</div>
                <div className="text-gray-800 font-medium">{dataset.ownerUsername}</div>
              </CardSubtitle>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
