import { HomeIcon } from '@heroicons/react/20/solid'
import Link from 'next/link'
import { useRouter } from 'next/router'

export default function Breadcrumbs() {
  const router = useRouter()

  const pages = []

  // Get current path
  const currentPath = router.asPath.split('/')

  // Build pages array using forEach loop
  currentPath.forEach((path, index) => {

    // Ignore empty strings
    if (path !== '') {
      // Build page object
      const page = {
        name: path.charAt(0).toUpperCase() + path.slice(1),
        href: '/' + currentPath.slice(0, index + 1).join('/'),
        current: index === currentPath.length - 1,
      }
      // Push page object into pages array
      // remove everything after ? in the url
      // Dashboard#access_token=eyJhbGciOiJIUzI1NiIsInR5cCI…sh_token=z8Izv7fmMoGTWZUe120KIQ&token_type=bearer
      // Or Playground?ofkofr3k
      // regex to remove everywtihng after dashboarrd
      const regex = /Dashboard.*/g
      const newPage = page.name.replace(regex, 'Dashboard').replace(/\?.*/g, '')
      page.name = newPage
      pages.push(page)
    }
  })
  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol role="list" className="flex items-center space-x-4">
        <li>
          <div>
            <a href="/" className="text-gray-400 hover:text-gray-500">
              <HomeIcon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              <span className="sr-only">Home</span>
            </a>
          </div>
        </li>
        {pages.map((page) => (
          <li key={page.name}>
            <div className="flex items-center">
              <svg
                className="h-5 w-5 flex-shrink-0 text-gray-300"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
              </svg>
              <Link
                href={page.href}
                className={
                  page.current
                    ? 'ml-4 text-sm font-medium text-gray-500'
                    : 'ml-4 text-sm font-medium text-gray-500 hover:text-gray-700'
                }
                aria-current={page.current ? 'page' : undefined}
              >
                {page.name}
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  )
}
