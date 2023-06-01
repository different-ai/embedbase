import Navbar from '@/components/Navbar'

export default function ChatLayout({
  // Layouts must accept a children prop.
  // This will be populated with nested layouts or pages
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
    <div className="m-auto flex w-full max-w-5xl">
      {children}
    </div>
    </>
  )
}

export const metadata = {
  title: 'Vector Hub',
  description:
    'This contains a list of public datasets, that you can use to start building your app, remix or just play around with.',
}
