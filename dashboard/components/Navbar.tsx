import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { Input } from './Input'
import Image from 'next/image'
import Link from 'next/link'
import { AuthButtons } from './AuthButtons'

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
      <div className="max-w-7xl mx-auto h-[80px] px-4 py-8 sm:px-6 lg:px-8">
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
        <div className="flex flex-1 justify-end w-full">
          <AuthButtons />
        </div>
      </SimpleNavbar>
    </>
  )
}
