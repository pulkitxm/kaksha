import { Router } from "express";

import { asHandler } from "../http.js";
import {
  getDatabase,
  getDataset,
  getTimetable,
  parseClassId,
  parseFilters,
} from "../query.js";
import type { ParamSource } from "../query.js";

export const timetableRouter: Router = Router();

timetableRouter.get(
  "/snapshot",
  asHandler(async (_request, response) => {
    response.json(await getDatabase());
  }),
);

timetableRouter.get(
  "/dataset",
  asHandler(async (request, response) => {
    const query = request.query as ParamSource;
    const dataset = await getDataset(parseClassId(query));
    response.json(dataset);
  }),
);

timetableRouter.get(
  "/timetable",
  asHandler(async (request, response) => {
    const query = request.query as ParamSource;
    const data = await getTimetable(parseClassId(query), parseFilters(query));
    response.json(data);
  }),
);
