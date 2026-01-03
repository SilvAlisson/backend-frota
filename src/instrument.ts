const Sentry = require("@sentry/node");

Sentry.init({
    dsn: "https://337fb1cf0ad2de139cc75614043fe8c6@o4510641487609856.ingest.us.sentry.io/4510641520508928",
    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii: true,
});