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


export default function Navbar() {
  return (
    <>
      <div className="mx-auto h-[100px] max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="relative flex justify-between ">
          <Logo />
          <div>
            <AuthButtons />
          </div>
        </div>
      </div>
    </>
  )
}
