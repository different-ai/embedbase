import * as React from 'react'
import { CheckIcon } from '@heroicons/react/24/outline'

export const tiers = [
  {
    id: 'test',
    name: 'Free',
    priceMonthly: 0,
    description:
      "For those who are just experiencing what it's like to connect your data to ChatGPT.",
    features: [
      'Unlimited requests per month',
      "5 daily messages in Embedbase Playground",
      'Limited to 5 datasets',
      'Community support',
    ],
    playgroundLimit: 5,
  },
  {
    id:
      process.env.NEXT_PUBLIC_PRO_PRICE_ID || 'price_1MtYAmFX2CGyoHQvSxdD0j8h',
    name: 'Pro',
    priceMonthly: 50,
    description:
      'The perfect plan to get your ChatGPT-powered app off localhost.',
    features: [
      'Unlimited requests per month',
      '50 daily messages in Embedbase Playground',
      'Limited to 100 datasets',
      'Email support',
      'Daily backups',
    ],
    playgroundLimit: 50,
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
