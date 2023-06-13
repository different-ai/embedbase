import { ReactNode } from 'react'

interface CardTitleProps {
  className?: string
  children: ReactNode
}

export const CardTitle = ({
  className,
  children,
}: CardTitleProps): JSX.Element => {
  return (
    <h3
      className={`text-base font-semibold leading-6 text-gray-900 ${className}`}
    >
      {children}
    </h3>
  )
}

interface CardSubtitleProps {
  className?: string
  children: ReactNode
}

export const CardSubtitle = ({
  className,
  children,
}: CardSubtitleProps): JSX.Element => {
  return (
    <div className={`mt-1 max-w-2xl text-sm text-gray-500 ${className}`}>
      {children}
    </div>
  )
}

interface CardProps {
  className?: string
  children: ReactNode
}

const Card = ({ className, children }: CardProps): JSX.Element => {
  return (
    <div
      className={`overflow-hidden rounded-lg bg-white ${className} relative border border-purple-700 border-opacity-25`}
    >
      <div className="px-4 py-5 sm:px-6">{children}</div>
    </div>
  )
}

export default Card
