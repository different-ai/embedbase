'use client'
import { Menu, Transition } from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/20/solid'
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'
import { Fragment } from 'react'
import { classNames } from '../lib/utils'
import { useSubscription } from '../pages/dashboard/pricing'
import { tiers } from './PricingSection'

export function User() {
  const session = useSession()
  const user = session?.user
  const supabase = useSupabaseClient()
  const { subscription } = useSubscription()

  const subscriptionBadgeText =
    // price id matches pro "pro"
    // price id matches hobby "hobby"
    // else nothing
    subscription?.price_id === tiers.find((tier) => tier.name === 'Pro')?.id
      ? 'Pro'
      : subscription?.price_id ===
        tiers.find((tier) => tier.name === 'Hobby')?.id
      ? 'Hobby'
      : ''
  console.log(subscription, subscriptionBadgeText)

  const signOut = async () => {
    await supabase.auth.signOut()
    // router.push('/login')
  }

  return (
    <Menu as="div" className="relative inline-block px-3 text-left">
      <div>
        <Menu.Button className="group w-full rounded-md bg-gray-100 px-3.5 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-transparent focus:ring-offset-2 focus:ring-offset-gray-100">
          <span className="flex w-full items-center justify-between">
            <span className="flex min-w-0 items-center justify-between space-x-3">
              <span className="flex min-w-0 flex-1">
                <span className="truncate text-sm text-gray-700">
                  {user?.email}
                </span>
              </span>
              {subscriptionBadgeText && (
                <span className="inline-flex items-center rounded-full bg-gray-900 px-1.5 py-0.5 text-xs font-medium text-gray-100">
                  {subscriptionBadgeText}
                </span>
              )}
            </span>
            <ChevronUpDownIcon
              className="h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-gray-500"
              aria-hidden="true"
            />
          </span>
        </Menu.Button>
      </div>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 left-0 z-10 mx-3 mt-1 origin-top divide-y divide-gray-200 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            <Menu.Item>
              {({ active }) => (
                <a
                  href="mailto:ben@prologe.io"
                  className={classNames(
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                    'block px-4 py-2 text-sm'
                  )}
                >
                  Support
                </a>
              )}
            </Menu.Item>
          </div>
          <div className="py-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={signOut}
                  className={classNames(
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                    'block w-full px-4 py-2 text-left text-sm'
                  )}
                >
                  Logout
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  )
}
