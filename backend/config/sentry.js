import * as Sentry from "@sentry/node";

export const initSentry = (app) => {
  if (process.env.NODE_ENV === "production" && process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 1.0,
    });

    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
  }
};

export const sentryErrorHandler = () => {
  return Sentry.Handlers.errorHandler();
};
