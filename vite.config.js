import { defineConfig, loadEnv } from "vite";
import { createHandler } from "./lib/invitations.js";
export default defineConfig(({ mode }) => ({
  plugins: [
    {
      name: "local-rsvp",
      configureServer(server) {
        const env = { ...process.env, ...loadEnv(mode, process.cwd(), "") };
        const handler = createHandler({ env });
        server.middlewares.use("/api/invitations", async (req, res) => {
          let raw = "";
          for await (const chunk of req) {
            raw += chunk;
            if (raw.length > 10000) {
              res.statusCode = 413;
              res.end("Payload too large");
              return;
            }
          }
          req.body = raw;
          res.status = (status) => {
            res.statusCode = status;
            return res;
          };
          res.json = (data) => {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(data));
          };
          await handler(req, res);
        });
      },
    },
  ],
}));
