export const isProductionEnvironment =
  process.env.NEXT_PUBLIC_NODE_ENV === "production";

export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT
);

export const BLOB_FILE_PREFIX = "sparka-ai/files/";

export const ANONYMOUS_SESSION_COOKIES_KEY = "anonymous-session";
