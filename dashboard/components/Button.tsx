import { classNames } from '../lib/utils'

export const PrimaryButton = ({
  children,
  className = '',
  disabled = false,
  ...props
}) => {
  return (
    <button
      type="button"
      className={classNames(
        'inline-flex items-center rounded-md border border-transparent bg-[#912EE8] px-3 py-2 text-sm font-medium leading-4 text-white shadow-sm transition-opacity	duration-500 hover:brightness-150 focus:outline-none focus:ring-2 focus:ring-offset-2	disabled:opacity-25',
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

export const SecondaryButton = ({
  children,
  className = '',
  disabled = false,
  ...props
}) => {
  return (
    <button
      type="button"
      className={classNames(
        'inline-flex items-center rounded-md border border-[#912ee8] bg-white px-3 py-2 text-sm font-medium leading-4 text-[#912EE8] shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-0 focus:ring-offset-2 disabled:opacity-50 border-opacity-25',
        className || ''
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
