type CenteredLayoutProps = {
  children: React.ReactNode
}
export const CenteredLayout = ({ children }: CenteredLayoutProps) => {
  return (
    <div className="m-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-screen">
      {/* We've used 3xl here, but feel free to try other max-widths based on your needs */}
      <div className="m-auto h-screen max-w-3xl flex justify-center items-center">{children}</div>
    </div>
  )
}
