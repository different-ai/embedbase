import React, { FC, ReactNode } from 'react'

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

interface CardProps {
  className?: string
  children: ReactNode
}

const Card = ({ className, children }: CardProps): JSX.Element => {
  return (
    <div
      className={`overflow-hidden bg-white sm:rounded-lg ${className} border border-gray-200`}
    >
      <div className="bg-white px-4 py-5 sm:px-6">{children}</div>
    </div>
  )
}

export default Card
