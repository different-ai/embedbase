import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { HomeIcon } from '@heroicons/react/24/outline'

function cleanPath(path) {
  return path.replace(/\/\//g, '/')
}
function Breadcrumbs() {
  const router = useRouter()

  // Get current path
  const currentPath = router.asPath.split('/')

  // Build pages array using forEach loop
  const pages = currentPath
    .filter((path) => path !== '')
    .map((path, index) => {
      // Build page object
      const name = path.charAt(0).toUpperCase() + path.slice(1)
      const href = cleanPath('/' + currentPath.slice(0, index + 1).join('/'))

      const current = index === currentPath.length - 1

      // Remove everything after ? in the url
      // regex to remove everywtihng after dashboarrd
      const regex = /Dashboard.*/g
      const formattedName = name
        .replace(regex, 'Dashboard')
        .replace(/\?.*/g, '')

      return {
        name: formattedName,
        href,
        current,
      }
    })

  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol role="list" className="flex items-center space-x-4">
        <li>
          <div>
            <Link
              href="/dashboard"
              className="text-gray-400 hover:text-gray-500"
            >
              <HomeIcon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              <span className="sr-only">Home</span>
            </Link>
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
                className={`ml-4 text-sm font-medium text-gray-500 ${
                  page.current ? 'underline' : 'hover:text-gray-700'
                }`}
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

export default Breadcrumbs
