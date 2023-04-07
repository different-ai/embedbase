// @ts-nocheck
import {
  CodeEditor,
  SandpackFileExplorer,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  SandpackReactContext,
  SandpackStack,
} from '@codesandbox/sandpack-react'
import { useAppStore } from '../lib/store'

const Sandbox = () => {
  const store = useAppStore()
  store.currentSandboxCode

  const files = store.currentSandboxCode
  if (!store.showSandbox) return

  return (

    <div className='py-12'>
      <h2 className="mt-12">Experimental Code Sandbox</h2>
      <SandpackProvider files={files} theme="light" template="vanilla">
        <SandpackReactContext>
          {({
            files,
            updateFile,
          }: {
            files: { code }[]
            updateFile: (fileKey: string, newCode: string) => void
          }) => {
            const fileListValues = Object.values(files)
            const fileListKeys = Object.keys(files)

            return (
              <SandpackLayout>
                <SandpackFileExplorer />

                <SandpackStack style={{ padding: '10px 0' }}>
                  <CodeEditor
                    code={fileListValues[2].code}
                    filePath={fileListKeys[0]}
                    onCodeUpdate={(newCode) =>
                      updateFile(fileListKeys[2], newCode)
                    }
                    initMode={'immediate'}
                  />
                </SandpackStack>

                <SandpackStack style={{ padding: '10px 0' }}>
                  <CodeEditor
                    code={fileListValues[1]?.code}
                    filePath={fileListKeys[1]}
                    onCodeUpdate={(newCode) =>
                      updateFile(fileListKeys[1], newCode)
                    }
                    initMode={'immediate'}
                  />
                </SandpackStack>

                <SandpackPreview />
              </SandpackLayout>
            )
          }}
        </SandpackReactContext>
      </SandpackProvider>
    </div>
  )

}

export default Sandbox
