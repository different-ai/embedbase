import { XMarkIcon } from "@heroicons/react/24/outline"
import { useState } from "react"

interface BannerProps {
    className?: string
    title: string
    text: string
}

export default function Example({ className, title, text }: BannerProps) {
    const [dismissed, setDismissed] = useState(false)
    return (
        dismissed ? null :
        <div className={className + " flex items-center gap-x-6 px-6 py-2.5 sm:px-3.5 sm:before:flex-1 bg-gray-900 "}>
            <p className="text-sm leading-6 text-white">
                {/* <a href="#"> */}
                <strong className="font-semibold">{title}</strong>
                <svg viewBox="0 0 2 2" className="mx-2 inline h-0.5 w-0.5 fill-current" aria-hidden="true">
                    <circle cx={1} cy={1} r={1} />
                </svg>
                {text}
                {/* </a> */}
            </p>
            <div className="flex flex-1 justify-end">
                <button
                    onClick={() => setDismissed(true)}
                    type="button" className="-m-3 p-3 focus-visible:outline-offset-[-4px]">
                    <span className="sr-only">Dismiss</span>
                    <XMarkIcon className="h-5 w-5 text-white" aria-hidden="true" />
                </button>
            </div>
        </div>
    )
}