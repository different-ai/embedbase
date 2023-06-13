'use client'
import React from 'react'
import { Sandpack } from '@codesandbox/sandpack-react'

export default function SandpackClient(props) {
  return (
    <Sandpack
      theme={'dark'}
      {...props}
      customSetup={{
        dependencies: {
          'embedbase-js': 'latest',
        },
      }}
    />
  )
}
