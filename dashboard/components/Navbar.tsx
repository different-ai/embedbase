import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { Input } from './Input'
import { PrimaryButton } from './Button'
import Image from 'next/image'
import Link from 'next/link'

export default function Navbar() {
  return (
    <>
      {/* When the mobile menu is open, add `overflow-hidden` to the `body` element to prevent double scrollbars */}

      <>
        <div className="mx-auto h-[70px] max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative flex justify-between lg:gap-8 xl:grid xl:grid-cols-12">
            <div className="flex md:absolute md:inset-y-0 md:left-0 lg:static xl:col-span-2">
              <div className="flex flex-shrink-0 items-center">
                <a href="#">
                  <Image
                    src="/logo-transparent.svg"
                    alt="Logo"
                    width={150}
                    height={100}
                  />
                </a>
              </div>
            </div>
            <div className="min-w-0 flex-1 md:px-8 lg:px-0 xl:col-span-6">
              <div className="flex items-center px-6 py-4 md:mx-auto md:max-w-3xl lg:mx-0 lg:max-w-none xl:px-0">
                {/* hidden for now */}
                <div className="hidden w-full">
                  <label htmlFor="search" className="sr-only">
                    Search
                  </label>
                  <div className="relative hidden md:block">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <MagnifyingGlassIcon
                        className="h-5 w-5 text-gray-400"
                        aria-hidden="true"
                      />
                    </div>
                    <Input className="w-full pl-10 " />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center md:absolute md:inset-y-0 md:right-0 lg:hidden">
              {/* Mobile menu button */}
            </div>
            <div className="flex items-center justify-end xl:col-span-4">
              <Link href="/signup">
                <PrimaryButton className="ml-3">New App</PrimaryButton>
              </Link>
            </div>
          </div>
        </div>
      </>
    </>
  )
}
