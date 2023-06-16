const commonFiles = {
  '/styles.css': {
    hidden: true,
    code: `body {
    font-family: sans-serif;
    -webkit-font-smoothing: auto;
    -moz-font-smoothing: auto;
    -moz-osx-font-smoothing: grayscale;
    font-smoothing: auto;
    text-rendering: optimizeLegibility;
    font-smooth: always;
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
  }
  
  h1 {
    font-size: 1.5rem;
  }`,
  },
}

export const NEXTJS_TEMPLATE = {
  files: {
    ...commonFiles,
    '/app/page.js': {
      hidden: true,
      active: true,
      code: `export default function Home() {
  return (
    <div>
      <h1>Hello </h1>
    </div>
  );
}
`,
    },
    '/next.config.js': {
      hidden: true,
      code: `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig
`,
    },
    '/package.json': {
      hidden: true,
      code: JSON.stringify({
        name: 'my-app',
        version: '0.1.0',
        private: true,
        scripts: {
          dev: 'NEXT_TELEMETRY_DISABLED=1 next dev',
          build: 'next build',
          start: 'next start',
          lint: 'next lint',
        },
        dependencies: {
          next: '13.4.4', // @todo: update to the latest version
          react: '18.2.0',
          'react-dom': '18.2.0',
          '@next/swc-wasm-nodejs': '12.1.6',
        },
      }),
    },
  },
  main: '/app/page.js',
  environment: 'node',
}
