import { ArrowRightCircleIcon, PlusIcon } from '@heroicons/react/20/solid'

export default function EmptyStateCreateAPIKey() {
  return (
    <div className="text-center">
      <h3 className="mt-2 text-3xl font-semibold text-gray-900">
        Welcome to Embedbase
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        {`To get started let's create an API key.`}
      </p>
      <div className="mt-6">
        <button
          type="button"
          className="inline-flex items-center rounded-md bg-black px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
        >
          Create an API Key
          <ArrowRightCircleIcon
            className="-mr-1 ml-1.5 h-5 w-5 "
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  )
}
