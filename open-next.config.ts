import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // @ts-ignore
  edgeExternals: ["@libsql/isomorphic-ws"],
});
