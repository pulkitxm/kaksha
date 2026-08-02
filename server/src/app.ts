import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";

import { getEnv } from "./env.js";
import { errorHandler, HttpError } from "./http.js";
import { catalogRouter } from "./routes/catalog.js";
import { healthRouter } from "./routes/health.js";
import { mutationRouter } from "./routes/mutations.js";
import { noteRouter } from "./routes/notes.js";
import { recordRouter } from "./routes/records.js";
import { timetableRouter } from "./routes/timetable.js";

export function createApp(): Express {
  const env = getEnv();
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin:
        env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(",").map((o) => o.trim()),
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.use("/api", healthRouter);
  app.use("/api", timetableRouter);
  app.use("/api", catalogRouter);
  app.use("/api", mutationRouter);
  app.use("/api", recordRouter);
  app.use("/api", noteRouter);

  app.get("/", (_request, response) => {
    response.json({ service: "kaksha-server", docs: "/api/health" });
  });

  app.use((request, _response, next) => {
    next(new HttpError(404, `No route for ${request.method} ${request.path}`));
  });

  app.use(errorHandler);

  return app;
}
