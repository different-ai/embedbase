// ignore ts linting for this file
// @ts-nocheck
import ReactMarkdown from 'react-markdown'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import tsx from 'react-syntax-highlighter/dist/cjs/languages/prism/tsx'
import typescript from 'react-syntax-highlighter/dist/cjs/languages/prism/typescript'
import python from 'react-syntax-highlighter/dist/cjs/languages/prism/python'
import scss from 'react-syntax-highlighter/dist/cjs/languages/prism/scss'
import bash from 'react-syntax-highlighter/dist/cjs/languages/prism/bash'
import markdown from 'react-syntax-highlighter/dist/cjs/languages/prism/markdown'
import json from 'react-syntax-highlighter/dist/cjs/languages/prism/json'
import html from 'react-syntax-highlighter/dist/cjs/languages/prism/markup'
import footnotes from 'remark-footnotes'

SyntaxHighlighter.registerLanguage('tsx', tsx)
SyntaxHighlighter.registerLanguage('typescript', typescript)
SyntaxHighlighter.registerLanguage('python', python)
SyntaxHighlighter.registerLanguage('scss', scss)
SyntaxHighlighter.registerLanguage('bash', bash)
SyntaxHighlighter.registerLanguage('markdown', markdown)
SyntaxHighlighter.registerLanguage('json', json)
SyntaxHighlighter.registerLanguage('markup', html)

import rangeParser from 'parse-numeric-range'
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'


const Markdown = ({ children }) => {
  const syntaxTheme = oneDark

  const MarkdownComponents: object = {
    a: ({ node, ...props }) => {
      // if content regex that match ^[number]
      if (props.children?.[0]?.match(/\^[0-9]/)) {
        props.children[0] = props.children[0].replace(/\^/, '')
        // add [ ] around the number
        props.children[0] = props.children[0].replace(/([0-9]+)/, '[$1]')
        return (
          <sup>
            <a {...props} target="_blank" rel="noopener noreferrer"
              // uplifted from
              className="ml-1 inline light text-xs font-bold tracking-widest font-mono leading-none uppercase text-zinc-500 selection:bg-super selection:text-white dark:selection:bg-opacity-50 selection:bg-opacity-70"
            />
          </sup>
        )
      } else {
        return <a {...props} target="_blank" rel="noopener noreferrer"
          // underline links
          className="underline"
        />
      }
    },
    // pre: Pre,
    code({ node, inline, className, ...props }) {
      const hasLang = /language-(\w+)/.exec(className || '')
      const hasMeta = node?.data?.meta

      const applyHighlights: object = (applyHighlights: number) => {
        if (hasMeta) {
          const RE = /{([\d,-]+)}/
          const metadata = node.data.meta?.replace(/\s/g, '')
          const strlineNumbers = RE?.test(metadata)
            ? RE?.exec(metadata)[1]
            : '0'
          const highlightLines = rangeParser(strlineNumbers)
          const highlight = highlightLines
          const data: string = highlight.includes(applyHighlights)
            ? 'highlight'
            : null
          console.log(data)
          return { data }
        } else {
          return {}
        }
      }

      return hasLang ? (
        <SyntaxHighlighter
          style={syntaxTheme}
          // language={hasLang[1]}
          PreTag="div"
          className="codeStyle"
          // showLineNumbers={true}
          wrapLines={hasMeta}
          useInlineStyles={true}
          lineProps={applyHighlights}
        >
          {props.children}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props} />
      )
    },
  }

  return (
    <ReactMarkdown plugins={[footnotes]}
      className="prose"
      components={MarkdownComponents}>{children}</ReactMarkdown>
  )
}

export default Markdown
