import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { Input } from './Input'
import Image from 'next/image'
import Link from 'next/link'
import { AuthButtons } from './AuthButtons'
import { CircleStackIcon } from '@heroicons/react/24/outline'

function Logo() {
  return (
    <Link href="/">
      <Image src="/logo-transparent.svg" alt="Logo" width={150} height={100} />
    </Link>
  )
}

export const SimpleNavbar = ({ children }) => {
  return (
    <>
      <div className="mx-auto h-[80px] max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="relative flex">
          <Logo />
          {children}
        </div>
      </div>
    </>
  )
}

export default function Navbar() {
  return (
    <>
      <SimpleNavbar>
        <div className="flex w-full flex-1 justify-end items-center">
          <Link href="/datasets">
            <div className="flex text-gray-600">
              <CircleStackIcon className="h-6 w-6 " />
              Community Hub
            </div>
          </Link>
          <AuthButtons />
        </div>
      </SimpleNavbar>
    </>
  )
}
