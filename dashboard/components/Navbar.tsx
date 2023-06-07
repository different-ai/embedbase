import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { Input } from './Input'
import { PrimaryButton, SecondaryButton } from './Button'
import Image from 'next/image'
import Link from 'next/link'

export default function Navbar() {
  return (
    <>
      {/* When the mobile menu is open, add `overflow-hidden` to the `body` element to prevent double scrollbars */}

      <>
        <div className="mx-auto h-[100px] max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="relative flex justify-between lg:gap-8 xl:grid xl:grid-cols-12">
            <div className="flex md:absolute md:inset-y-0 md:left-0 lg:static xl:col-span-2">
              <div className="flex flex-shrink-0 items-center">
                <Link href="/">
                  <Image
                    src="/logo-transparent.svg"
                    alt="Logo"
                    width={150}
                    height={100}
                  />
                </Link>
              </div>
            </div>
            <div className="flex items-center md:absolute md:inset-y-0 md:right-0 lg:hidden">
            </div>
            <div className="flex items-center justify-end xl:col-span-4">
              <Link href="/login">
                <SecondaryButton className="ml-3">Login</SecondaryButton>
              </Link>
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
