import { CheckIcon } from '@heroicons/react/24/outline'
import * as React from 'react'

export const tiers = [
  {
    id: 'test',
    name: 'Free',
    priceMonthly: 0,
    description:
      "",
    features: [
      '50k Requests per month',
      "150 Monthly Messages on the playground",
      'Limited to 5 datasets',
      'Community support',
    ],
    playgroundLimit: 150,
  },
  {
    id: 'price_1N6ZY1FX2CGyoHQvNtMwlUlY',
    name: 'Hobby',
    priceMonthly: 12.99,
    description:
      "Perfect for passion projects & simple AI apps.",
    features: [
      '500k Requests per month',
      '500k Monthly Messages on the playground',
      'Limited to 100 datasets',
      'Email support',
    ],
    playgroundLimit: 500000,
  },
  {
    id:
      process.env.NEXT_PUBLIC_PRO_PRICE_ID || 'price_1MtYAmFX2CGyoHQvSxdD0j8h',
    name: 'Pro',
    priceMonthly: 50,
    description:
      'Our best plans for startups. Scalable infrastructure for your AI applications.',
    features: [
      '10M Search Requests',
      '10M Monthly Messages on the Playground',
      'Unlimited Datasets, Email support, Daily backups',
      'Teams - Multiple Seat Support (coming mid-May)'
    ],
    playgroundLimit: 10000000,
  },
  {
    id: 'tier-enterprise',
    name: 'Enterprise',
    priceMonthly: 1000,
    description: 'For extensive applications handling substantial workloads.',
    features: ['On-premise support', 'Private Slack channel', 'SOC2 (pending)', 'Custom models (your data never leaves your product)'],
    playgroundLimit: 500,
  },
]
interface Planprops {
  tier: any
  children: React.ReactNode
}
export const Plan = ({ tier, children }: Planprops) => {
  return (
    <div
      key={tier.name}
      className="flex flex-col rounded-3xl bg-white ring-1 ring-black/10"
    >
      <div className="p-8 sm:p-10">
        <h3
          className="text-lg font-semibold leading-8 tracking-tight text-black"
          id={tier.id}
        >
          {tier.name}
        </h3>

        <div className="mt-4 flex items-baseline text-5xl font-bold tracking-tight text-gray-900">
          ${tier.priceMonthly}
          <span className="text-lg font-semibold leading-8 tracking-normal text-gray-500">
            /mo
          </span>
        </div>
        <p className="mt-6 text-base leading-7 text-gray-600">
          {tier.description}
        </p>
      </div>
      <div className="flex flex-1 flex-col p-2">
        <div className="flex flex-1 flex-col justify-between rounded-2xl bg-gray-50 p-6 sm:p-8">
          <ul role="list" className="space-y-6">
            {tier.features.map((feature) => (
              <li key={feature} className="flex items-start">
                <div className="flex-shrink-0">
                  <CheckIcon
                    className="h-6 w-6 text-black"
                    aria-hidden="true"
                  />
                </div>
                <p className="ml-3 text-sm leading-6 text-gray-600">
                  {feature}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
