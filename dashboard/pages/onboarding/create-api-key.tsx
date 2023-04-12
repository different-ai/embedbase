import { ArrowRightCircleIcon } from '@heroicons/react/20/solid'
import { useRouter } from 'next/router'
import {  CreateAPIKeyV2 } from '../../components/APIKeys'
import { CenteredLayout } from '../../components/Layout'

const Index = () => {
  const router = useRouter()
  const handleNext = () => {
    router.push('/onboarding/create-dataset')
  }

  return (
    <div>
      <CenteredLayout>
        <div className="text-center">
          <h3 className="mt-2 text-4xl font-semibold text-gray-900">
            Welcome to Embedbase
          </h3>
          <p className="mt-1 text-gray-500">
            {`To get started let's create an API key.`}
          </p>
          <div className="mt-6">
            <CreateAPIKeyV2 onSuccess={handleNext}>
              Create an API Key
              <ArrowRightCircleIcon
                className="-mr-1 ml-1.5 h-5 w-5 "
                aria-hidden="true"
              />
            </CreateAPIKeyV2>
          </div>
        </div>
      </CenteredLayout>
    </div>
  )
}

export default Index
