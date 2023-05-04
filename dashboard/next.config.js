// This file sets a custom webpack configuration to use your Next.js app
// with Sentry.
// https://nextjs.org/docs/api-reference/next.config.js/introduction
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/signup',
        permanent: false,
      },
    ]
  },
  experimental: {
    appDir: true,
  }

}

module.exports = withSentryConfig(
  module.exports,
  { silent: true },
  { hideSourcemaps: true },
);
