import { ArrowRightCircleIcon } from '@heroicons/react/20/solid'
import { NextPageContext } from 'next'
import Image from 'next/image'
import { CenteredLayout } from '../../components/Layout'

export default async function Index({ searchParams }) {
  const email = searchParams['email']
  return (
    <div>
      <CenteredLayout>
        <div>
          <div className="text-center">
            <h3 className="mt-2 text-4xl font-semibold text-gray-900">
              Almost there
            </h3>
            <p className="mt-1 text-gray-500">{email}</p>
            <div className="mt-6 flex items-center justify-center">
              Check your inbox
            </div>
          </div>
        </div>
      </CenteredLayout>
    </div>
  )
}
