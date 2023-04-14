import React from 'react'
import { DocsThemeConfig, useConfig } from 'nextra-theme-docs'
import { SearchModal } from './components/Search'

const config: DocsThemeConfig = {
  logo: (
    <img
      src={'/embedbase-long.svg'}
      alt="Embedbase Logo"
      className="max-h-[60px]"
    />
  ),
  head: function useHead() {
    const config = useConfig<{ description?: string; image?: string }>()
    const description =
      config.frontMatter.description ||
      'Embedbase is a suite of open-source tools to help developers use ML embeddings.'
    const image = config.frontMatter.image || '/embedbasejs.png'
    return (
      <>
        {/* Favicons, meta */}

        <title>Embedbase Documentation</title>

        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon/favicon-32x32.png"
        />

        <meta name="msapplication-TileColor" content="#ffffff" />
        <meta httpEquiv="Content-Language" content="en" />
        <meta name="description" content={description} />
        <meta name="og:description" content={description} />
        <meta name="twitter:card" content="summary_large_image" />
        {/* <meta name="twitter:site" content="@embedbase" /> */}
        <meta name="twitter:image" content={image} />
        <meta name="og:title" content={`${config.title} – embedbase`} />
        <meta name="og:image" content={image} />
        <meta name="apple-mobile-web-app-title" content="embedbase" />
      </>
    )
  },
  project: {
    link: 'https://github.com/different-ai/embedbase'
  },
  chat: {
    link: 'https://discord.gg/pMNeuGrDky'
  },
  docsRepositoryBase: 'https://github.com/different-ai/embedbase-docs/tree/main',
  footer: {
    text: 'Embedbase Docs'
  },
  search: {
    component: <SearchModal />
  }
}

export default config
