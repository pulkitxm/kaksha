import { Router } from "express";
import { EMPTY_FILTERS } from "@kaksha/core";

import { getClasses } from "../db/queries.js";
import { asHandler } from "../http.js";
import { getTimetable } from "../query.js";

export const healthRouter: Router = Router();

healthRouter.get("/health", (request, response) => {
  response.json({ ok: true, service: "kaksha-server", host: request.hostname });
});

healthRouter.get(
  "/health/data",
  asHandler(async (_request, response) => {
    const classes = await getClasses();

    const perClass = await Promise.all(
      classes.map(async (record) => {
        const data = await getTimetable(record.id, EMPTY_FILTERS);
        return data.issues.map((issue) => ({ ...issue, classId: record.id }));
      }),
    );

    const issues = perClass.flat();

    response.json({
      ok: issues.every((issue) => issue.level !== "error"),
      errors: issues.filter((issue) => issue.level === "error").length,
      warnings: issues.filter((issue) => issue.level === "warning").length,
      issues,
    });
  }),
);
