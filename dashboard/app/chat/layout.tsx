export default function ChatLayout({
  // Layouts must accept a children prop.
  // This will be populated with nested layouts or pages
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="flex w-full max-w-4xl m-auto">{children}</div>
}

export const metadata = {
  title: 'Embedbase Chat',
  description: 'Welcome to Embedbase Chat',
}
