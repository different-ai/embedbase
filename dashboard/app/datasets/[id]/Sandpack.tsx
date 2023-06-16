'use client'
import React from 'react'
import { Sandpack } from '@codesandbox/sandpack-react'
import { NEXTJS_TEMPLATE } from '@/utils/template'

export default function SandpackClient(props) {
  return (
    <Sandpack
      theme={'dark'}
      template="nextjs"
      customSetup={{
        dependencies: {
          'embedbase-js': 'latest',
        },
      }}
      // files={NEXTJS_TEMPLATE.files}
      // customSetup={{
      //   entry: NEXTJS_TEMPLATE.main,
      //   environment: 'node',
      // }}
    />
  )
}
