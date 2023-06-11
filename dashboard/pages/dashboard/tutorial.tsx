import { useAppStore } from '@/lib/store'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { useEffect } from 'react'
import { ReactMarkdown } from 'react-markdown/lib/react-markdown'
import remarkGfm from 'remark-gfm'
import { CreateAPIKey } from '../../components/APIKeys'
import Dashboard from '../../components/Dashboard'
import { PlaygroundAddToCollection } from '../../playgrounds/AddToCollection'
import { PlagroundSearchCollection } from '../../playgrounds/SearchCollection'
import { getApiKeys } from './explorer/[datasetId]'

const IntroText = `
Embedbase allows you to create amazing search experience using embeddings. 
You can do things like:
* [Replicate google](https://twitter.com/BorisMPower/status/1604096153263296512?s=20)
* [Organizing and visualizing big data sets](https://github.com/openai/openai-cookbook/blob/main/examples/Visualizing_embeddings_in_2D.ipynb)
* [Creating question answering systems](https://platform.openai.com/docs/tutorials/web-qa-embeddings)
`

interface MarkdownProps {
  children: string
}
export const Markdown = ({ children }: MarkdownProps) => {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
}

export default function Index({ apiKey }) {
  const setApiKey = useAppStore((state) => state.setApiKey)
  useEffect(() => {
    setApiKey(apiKey)
  }, [apiKey])
  return (
    <Dashboard>
      <div className="m-auto mt-6">
        <article className="prose m-auto max-w-6xl pb-36">
          <h1>Quickstart</h1>
          <Markdown>{IntroText}</Markdown>
          <h2>{`Let's Get Started`}</h2>
          <CreateAPIKey title="Generate an api key" className="mb-3" />
          <Markdown>
            {`Now you can start adding your own datasets! Try it out!
Add a couple things like:
* I love dogs
* I love cats
* Justin Bieber
`}
          </Markdown>
          <PlaygroundAddToCollection />
          <Markdown>{`You can also search anything you put in your dataset:`}</Markdown>
          <Markdown>{`Try typing "music"`}</Markdown>
          <PlagroundSearchCollection />
          <Markdown>
            {`That's a wrap! You can now use Embedbase to create your own search engine!`}
          </Markdown>
          <Markdown>
            {`Need some help? Join our [discord server](https://discord.gg/pMNeuGrDky) or reach out to us directly at ben@embedbase.xyz`}
          </Markdown>

          <Markdown>
            You can find our code
            [here](https://github.com/different-ai/embedbase). And we also help
            people deploy on premise.
          </Markdown>
          <a href="mailto=ben@embedbase.xyz">
            {' '}
            Contact us for custom on-premise deployments{' '}
          </a>
        </article>
      </div>
    </Dashboard>
  )
}

export const getServerSideProps = async (ctx) => {
  // Create authenticated Supabase Client
  const supabase = createPagesServerClient(ctx)

  // Check if we have a session
  const {
    data: { session },
  } = await supabase.auth.getSession()


  let apiKey: string = ''

  try {
    apiKey = await getApiKeys(supabase, session.user.id)
  } catch (error) {
    console.log(error)
  }

  return {
    props: {
      initialSession: session,
      user: session.user,
      apiKey,
    },
  }
}
