import { NextResponse } from "next/server";

import { getClasses, getEntries, getSections } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const classes = await getClasses();

  const withCounts = await Promise.all(
    classes.map(async (record) => {
      const [sections, entries] = await Promise.all([
        getSections(record.id),
        getEntries(record.id),
      ]);
      return {
        id: record.id,
        name: record.name,
        shortName: record.shortName,
        active: record.active,
        periodCount: record.periods.length,
        sectionCount: sections.length,
        entryCount: entries.length,
        subjectCount: record.subjectIds.length,
      };
    }),
  );

  return NextResponse.json(
    { classes: withCounts },
    { headers: { "Cache-Control": "no-store" } },
  );
}
