import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: "../.env.local" });

const { createApp } = await import("./app.js");
const { getEnv } = await import("./env.js");

const env = getEnv();
const app = createApp();

app.listen(env.PORT, () => {
  process.stdout.write(`kaksha-server listening on http://localhost:${env.PORT}\n`);
});
