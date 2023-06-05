import Navbar from '@/components/Navbar'

export default function DatasetsLayout({
  // Layouts must accept a children prop.
  // This will be populated with nested layouts or pages
  children,
}: {
  children: React.ReactNode
}) {
  console.log(children)
  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
    </>
  )
}

export const metadata = {
  title: 'Vector Hub',
  description:
    'This contains a list of public datasets, that you can use to start building your app, remix or just play around with.',
}
