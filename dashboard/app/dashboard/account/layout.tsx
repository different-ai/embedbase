import Navbar from '@/components/Navbar'


export default function AccountLayout({
  // Layouts must accept a children prop.
  // This will be populated with nested layouts or pages
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      <div className="m-auto flex w-full max-w-4xl">{children}</div>
    </>
  )
}

export const metadata = {
  title: 'Embedbase Account',
  description: 'Edit your account settings',
}
