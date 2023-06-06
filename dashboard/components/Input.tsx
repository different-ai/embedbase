'use client'
import { forwardRef } from 'react'
import { classNames } from '../lib/utils'

export const Input = forwardRef(function Input(
  { className, type = 'text', ...args }: any,
  ref
) {
  return (
    <input
      type={type}
      className={classNames(
        'border-1 rounded-md border-gray-300 py-2 pl-3 focus:border-gray-400 focus:outline-none focus:ring-0 focus:ring-transparent',
        className
      )}
      ref={ref}
      {...args}
    />
  )
})

export const TextArea = forwardRef(function Input(
  { className, type = 'text', rows = 8, ...args }: any,
  ref
) {
  return (
    <textarea
      type={type}
      className={
        classNames( 'border-1 rounded-md border-gray-300 py-2 pl-3 focus:border-gray-800 focus:outline-none focus:ring-0 focus:ring-transparent', className)
      }
      ref={ref}
      rows={rows}
      {...args}
    />
  )
})

export const Label = ({ className, children, optional = false }: any) => (
  <div className="flex justify-between ">
    <label className={classNames('block pb-1 text-sm font-medium ', className)}>
      {children}
    </label>
    {optional && <span className="text-sm text-gray-500">Optional</span>}
  </div>
)
