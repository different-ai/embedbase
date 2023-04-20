

// a react component that displays the plan usage

import { ArrowDownIcon, ArrowUpIcon } from '@heroicons/react/20/solid'



function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}

/**
 * 
{
  id: 97,
  planId: '...',
  userId: '...',
  usage: 1,
  createdAt: '2023-04-20T09:15:48.338376+00:00',
  updatedAt: '2023-04-20T09:15:48.338376+00:00'
}
*/

export interface UsageItem {
    id: number
    planId: string
    userId: string
    usage: number
    createdAt: string
    updatedAt: string
}

// const stats = [
//     { name: 'Daily Playground Usage', stat: '3', previousStat: '7', change: '42%', changeType: 'decrease' },
//     { name: 'Avg. Open Rate', stat: '58.16%', previousStat: '56.14%', change: '2.02%', changeType: 'increase' },
//     { name: 'Avg. Click Rate', stat: '24.57%', previousStat: '28.62%', change: '4.05%', changeType: 'decrease' },
// ]

const convertUsageToStats = (usage: UsageItem[]) => {
    // sum over daily usage by creating a map of
    // date -> usage
    const dailyPlaygroundUsage = usage.reduce((acc, item) => {
        const date = new Date(item.createdAt).toLocaleDateString()
        if (acc[date]) {
            acc[date] += item.usage
        } else {
            acc[date] = item.usage
        }
        return acc
    }, {})
    // get the total usage
    // const totalPlaygroundUsage = Object.values(dailyPlaygroundUsage).reduce((acc, item) => acc + item, 0)
    const keys = Object.keys(dailyPlaygroundUsage);
    const today = keys.length > 0 ? dailyPlaygroundUsage[keys[keys.length - 1]] : 0
    const yesterday = keys.length > 1 ? dailyPlaygroundUsage[keys[keys.length - 2]] : 0
    const changeInPercentage = ((today - yesterday) / (yesterday || 1)) * 100
    return [{
        name: 'Daily Playground Usage',
        stat: today,
        previousStat: yesterday,
        change: `${changeInPercentage}%`,
        changeType: changeInPercentage > 0 ? 'increase' : 'decrease'
    }]
}


interface UsageProps {
    usage: UsageItem[]
}

export default function Example({ usage }: UsageProps) {
    const stats = convertUsageToStats(usage)
    return (
        <div>
            <h3 className="text-base font-semibold leading-6 text-gray-900">Your usage</h3>
            <dl className="mt-5 grid grid-cols-1 divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow md:grid-cols-3 md:divide-x md:divide-y-0">
                {stats.map((item) => (
                    <div key={item.name} className="px-4 py-5 sm:p-6">
                        <dt className="text-base font-normal text-gray-900">{item.name}</dt>
                        <dd className="mt-1 flex items-baseline gap-4 md:block lg:flex">
                            <div className="flex items-baseline text-2xl font-semibold text-indigo-600">
                                {item.stat}
                                <span className="ml-2 text-sm font-medium text-gray-500">from {item.previousStat}</span>
                            </div>

                            <div
                                className={classNames(
                                    item.changeType === 'increase' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
                                    'inline-flex items-baseline rounded-full px-2.5 py-0.5 text-sm font-medium md:mt-2 lg:mt-0'
                                )}
                            >
                                {item.changeType === 'increase' ? (
                                    <ArrowUpIcon
                                        className="-ml-1 mr-0.5 h-5 w-5 flex-shrink-0 self-center text-green-500"
                                        aria-hidden="true"
                                    />
                                ) : (
                                    <ArrowDownIcon
                                        className="-ml-1 mr-0.5 h-5 w-5 flex-shrink-0 self-center text-red-500"
                                        aria-hidden="true"
                                    />
                                )}

                                <span> {item.changeType === 'increase' ? 'Increased' : 'Decreased'} by </span>
                                {item.change}
                            </div>
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    )
}
