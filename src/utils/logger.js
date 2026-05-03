const isProd = import.meta.env.PROD;

export const logger = {
  log: (...args) => { if (!isProd) console.log(...args); },
  warn: (...args) => { if (!isProd) console.warn(...args); },
  error: (...args) => { console.error(...args); }, // always log errors
};
