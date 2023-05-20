import { forwardRef } from 'react'

export interface TextFieldProps {
  value?: string
  onChange?: (e: any) => void
  autoFocus?: boolean
  placeholder?: string
  onClick?: () => void
  className?: string
}

// eslint-disable-next-line react/display-name
const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ value, onChange, autoFocus, placeholder, onClick, className }, ref) => {
    return (
      <input
        ref={ref}
        autoFocus={autoFocus || false}
        placeholder={placeholder || 'Search...'}
        onClick={onClick}
        type="text"
        value={value}
        onChange={onChange}
        className={className+" w-full rounded-md border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"}
      />
    )
  }
)

export default TextField
