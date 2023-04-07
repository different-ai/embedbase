import { classNames } from "../lib/utils";

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
        "inline-flex items-center rounded-md border border-transparent bg-black px-3 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-gray-800	focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-25 transition-opacity	duration-500",
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

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
        "inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-0 focus:ring-offset-2 disabled:opacity-50",
        className || ""
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
