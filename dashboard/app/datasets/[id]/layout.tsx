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
      <div className="rounded-2xl bg-purple-200 bg-opacity-[25%] py-5 px-5 mb-6">
        <p className="text-purple-900 ">{`Utilize the search function to find and select relevant documents.
The chosen data will be automatically inputted into the chat prompt on the right.`}</p>
      </div>

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
