import Navbar from '@/components/Navbar'
import './globals.css'

export default function RootLayout({
  // Layouts must accept a children prop.
  // This will be populated with nested layouts or pages
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="">{children}</body>
    </html>
  )
}

export const metadata = {
  title: 'Embedbase | Missing link between your data an LLMs',
  description: 'Welcome to [embed]base',
}
