// const withNextra = require('nextra')({
//   theme: 'nextra-theme-docs',
//   themeConfig: './theme.config.tsx',
// })

// /**
//  * @type {import('next').NextConfig}
//  */
// const nextConfig = {
//   ...withNextra(),
// }

// nextConfig.webpack = (config, options) => {
//   // Apply your custom Webpack configuration here.
//   // For example, set the module type for files that transpile to WebAssembly:
//   config.module.rules.push({
//     test: /\.wasm$/,
//     type: 'webassembly/async',
//   });

//   // Enable Webpack experiments:
//   config.experiments = {
//     ...config.experiments,
//     asyncWebAssembly: true,
//     layers: true,
//   };

//   // Return the modified Webpack configuration.
//   return config;
// }

// module.exports = nextConfig;

const withNextra = require('nextra')({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
})

module.exports = withNextra()
