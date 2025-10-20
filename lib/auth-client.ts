import { nextCookies } from "better-auth/next-js";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient({
  // baseURL can be omitted if API base matches frontend origin
  plugins: [nextCookies()],
});

export default authClient;
