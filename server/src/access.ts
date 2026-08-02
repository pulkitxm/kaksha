import { createHash, timingSafeEqual } from "node:crypto";

import { ACCESS_HEADER } from "@kaksha/core";
import type { RequestHandler } from "express";

import {
  forgetOldFailures,
  MAX_ATTEMPTS,
  recentFailures,
  recordFailure,
  WINDOW_MINUTES,
} from "./db/attempts.js";
import { getEnv } from "./env.js";
import { HttpError } from "./http.js";

const OPEN_PATHS = new Set(["/health"]);

function clientOf(request: { ip?: string; get: (name: string) => string | undefined }) {
  const forwarded = request.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first && first.length > 0 ? first : (request.ip ?? "unknown");
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function matches(offered: string, expected: string): boolean {
  return timingSafeEqual(digest(offered), digest(expected));
}

export function requireKnownHost(): RequestHandler {
  const { ALLOWED_HOSTS } = getEnv();

  return (request, _response, next) => {
    if (ALLOWED_HOSTS.length === 0) {
      next();
      return;
    }

    if (ALLOWED_HOSTS.includes(request.hostname.toLowerCase())) {
      next();
      return;
    }

    next(new HttpError(404, `No Kaksha here for ${request.hostname}`));
  };
}

export function requireAccessCode(): RequestHandler {
  const { ACCESS_CODE } = getEnv();

  return (request, _response, next) => {
    if (request.method === "OPTIONS" || OPEN_PATHS.has(request.path)) {
      next();
      return;
    }

    const offered = request.get(ACCESS_HEADER);

    if (offered && matches(offered, ACCESS_CODE)) {
      next();
      return;
    }

    const client = clientOf(request);

    void (async () => {
      try {
        const failures = await recentFailures(client);

        if (failures >= MAX_ATTEMPTS) {
          next(
            new HttpError(
              429,
              `Too many wrong codes. Wait ${String(WINDOW_MINUTES)} minutes and try again.`,
            ),
          );
          return;
        }

        await recordFailure(client);
        if (failures === 0) await forgetOldFailures();
      } catch {
        next(new HttpError(401, "This device is not set up to use Kaksha"));
        return;
      }

      next(new HttpError(401, "This device is not set up to use Kaksha"));
    })();
  };
}
