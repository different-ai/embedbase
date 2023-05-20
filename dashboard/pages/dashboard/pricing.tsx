import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Dashboard from '../../components/Dashboard'
import { Plan, tiers } from '../../components/PricingSection'
import Spinner from '../../components/Spinner'

import { camelize, postData } from '@/utils/helpers'
import { getStripe } from '@/utils/stripe-client'

import { PrimaryButton } from '@/components/Button'
import Usage, { UsageItem } from '@/components/Usage'
import { Price } from '@/utils/types'
import { User, createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'

const FreePlan = () => {
  return <Plan tier={tiers[0]}>{ }</Plan>
}

interface Subscription {
  cancel_at: null | Date
  cancel_at_period_end: boolean
  canceled_at: null | Date
  created: string
  current_period_end: string
  current_period_start: string
  ended_at: null | Date
  id: string
  metadata: Record<string, unknown>
  price_id: string
  quantity: number
  status:
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'unpaid'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  trial_end: null | Date
  trial_start: null | Date
  user_id: string
}

export const useSubscription = (): {
  user: User | null
  subscription: Subscription | null
} => {
  const user = useUser()
  const supabase = useSupabaseClient()
  const [subscription, setSubscription] = useState(null)
  useEffect(() => {
    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user?.id)
      .order('created', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        setSubscription(data)
      })
  }, [user])

  return { user, subscription }
}

const HobbyPlan = () => {
  const router = useRouter()
  const [priceIdLoading, setPriceIdLoading] = useState<string>()
  const { subscription } = useSubscription()

  const handleCheckout = async (price: Price) => {
    setPriceIdLoading(price.id)
    if (subscription) {
      return router.push('/dashboard')
    }

    try {
      const { sessionId } = await postData({
        url: '/api/create-checkout-session',
        data: { price },
      })

      const stripe = await getStripe()
      stripe?.redirectToCheckout({ sessionId })
    } catch (error) {
      return alert((error as Error)?.message)
    } finally {
      setPriceIdLoading(undefined)
    }
  }
  return (
    <Plan tier={tiers[1]}>
      <PrimaryButton
        onClick={() => handleCheckout(tiers[1])}
        className="flex w-full items-center justify-center gap-3 py-3 font-semibold"
      >
        {priceIdLoading ?
          <>
            Upgrading...
            <Spinner />
          </> :
          // plan is pro
          (!priceIdLoading && subscription?.status === 'active' &&
            subscription?.price_id === tiers.find((t) => t.name == "Hobby").id) ?
            'Manage plan' :
            // plan is pro
            (!priceIdLoading && subscription?.status === 'active' &&
              subscription?.price_id === tiers.find((t) => t.name == "Pro").id) ?
              'Downgrade' : "Upgrade"
        }
      </PrimaryButton>
    </Plan>
  )
}

const ProPlan = () => {
  const router = useRouter()
  const [priceIdLoading, setPriceIdLoading] = useState<string>()
  const { subscription } = useSubscription()

  const handleCheckout = async (price: Price) => {
    setPriceIdLoading(price.id)
    if (subscription) {
      return router.push('/dashboard')
    }

    try {
      const { sessionId } = await postData({
        url: '/api/create-checkout-session',
        data: { price },
      })

      const stripe = await getStripe()
      stripe?.redirectToCheckout({ sessionId })
    } catch (error) {
      return alert((error as Error)?.message)
    } finally {
      setPriceIdLoading(undefined)
    }
  }
  return (
    <Plan tier={tiers[2]}>
      <PrimaryButton
        onClick={() => handleCheckout(tiers[2])}
        className="flex w-full items-center justify-center gap-3 py-3 font-semibold"
      >
        {priceIdLoading ?
          <>
            Upgrading...
            <Spinner />
          </> :
          // plan is pro
          (!priceIdLoading && subscription?.status === 'active' &&
            subscription?.price_id === tiers.find((t) => t.name == "Pro").id) ?
            'Manage plan' :
            // plan is free or hobby
            'Upgrade'
        }
      </PrimaryButton>
    </Plan>
  )
}

const EnterprisePlan = () => {
  return (
    <Plan tier={tiers[3]}>
      <a
        href="https://cal.com/potato/20min?duration=20"
        target="_blank"
        rel="noreferrer"
      >
        <PrimaryButton className="flex w-full items-center justify-center gap-3 py-3 font-semibold">
          Contact us
        </PrimaryButton>
      </a>
    </Plan>
  )
}

export default function Index({ usage }: { usage: UsageItem[] }) {
  const { subscription } = useSubscription()
  const limit =
    (subscription?.price_id &&
      tiers.find((t) => t.id == subscription?.price_id)?.playgroundLimit) ||
    50

  return (
    <Dashboard>
      <div className="mt-6 flex flex-col gap-3">
        <h3 className="text-2xl font-semibold">Account</h3>
        <div className="rounded-2xl bg-gray-50 py-5 px-5">
          {/* add info text about pricing page somehting like hi wleocme to pcicing page you can downgrad e ugprade or you can manage your account here */}
          <p className="mb-3 text-gray-500">
            You can manage you subscription here. Easily upgrade, downgrade or
            cancel your subscription.
          </p>

          {subscription?.status === 'active' && (
            <a
              href={process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL}
              target="_blank"
              rel="noreferrer"
            >
              <PrimaryButton className="mx-auto flex w-1/4 items-center justify-center min-w-max font-normal">
                Manage my subscription
              </PrimaryButton>
            </a>
          )}
        </div>
        <Usage usage={usage} limit={limit} />

        <div className="mx-auto grid max-w-md grid-cols-1 gap-2 lg:max-w-7xl lg:grid-cols-4 lg:gap-4">
          <FreePlan />
          <HobbyPlan />
          <ProPlan />
          <EnterprisePlan />
        </div>
      </div>
    </Dashboard>
  )
}

export const getServerSideProps = async (ctx) => {
  const supabase = createServerSupabaseClient(ctx)

  // Check if we have a session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session)
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    }

  // todo limit to 30 days
  let { data, status, error } = await supabase
    .from('plan_usages')
    .select('*')
    .eq('user_id', session.user.id)

  if (error) {
    console.log(error)
  }

  data = camelize(data)

  console.log(data, session.user.id)

  return {
    props: {
      initialSession: session,
      user: session.user,
      usage: data,
    },
  }
}
