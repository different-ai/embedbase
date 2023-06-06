import { SandPackCSS } from '@/components/sandpack-styles'

export default function DatasetLayout({
  // Layouts must accept a children prop.
  // This will be populated with nested layouts or pages
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <SandPackCSS />
      <div className="m-auto flex w-full ">
        <div className="w-full">{children}</div>
      </div>
    </>
  )
}

export const metadata = {
  title: 'Vector Hub',
  description:
    'This contains a list of public datasets, that you can use to start building your app, remix or just play around with.',
}
