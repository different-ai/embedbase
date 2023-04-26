// This file configures the initialization of Sentry on the browser.
// The config you add here will be used whenever a page is visited.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.ENVIRONMENT || process.env.NEXT_PUBLIC_ENVIRONMENT;
ENVIRONMENT === 'production' && Sentry.init({
  dsn: SENTRY_DSN || 'https://1e6e06fb6e9740b8b9d66e782516631a@o4505073433706496.ingest.sentry.io/4505073435082752',
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0.1,
  // ...
  // Note: if you want to override the automatic release value, do not set a
  // `release` value here - use the environment variable `SENTRY_RELEASE`, so
  // that it will also get attached to your source maps
  defaultIntegrations: false,
  // integrations: [
  //   new Sentry.Integrations.GlobalHandlers({
  //     onunhandledrejection: false,
  //     onerror: false
  //   })
  // ],
});
