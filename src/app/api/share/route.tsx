import { ImageResponse } from "next/og";

import { getTimetable, parseClassId, parseFilters } from "@/lib/query";
import {
  buildShareModel,
  SHARE_THEMES,
  type ShareCell,
  type ShareTheme,
} from "@/lib/share";
import { themeParamSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const WIDTH = 1200;
const PAD = 48;
const PERIOD_COL = 92;
const CELL_HEIGHT = 44;
const ROW_PAD = 18;

function CellBlock({
  cell,
  width,
  theme,
  dark,
}: {
  cell: ShareCell;
  width: number;
  theme: ShareTheme;
  dark: boolean;
}) {
  const accent = dark ? cell.color : cell.deepColor;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        width,
        height: 38,
        borderRadius: 8,
        border: `1px solid ${cell.color}${theme.cellBorderAlpha}`,
        backgroundColor: `${cell.color}${theme.cellBgAlpha}`,
        paddingLeft: 8,
        paddingRight: 8,
        marginBottom: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 20,
          height: 20,
          borderRadius: 5,
          backgroundColor: accent,
          color: theme.badgeText,
          fontSize: 12,
          fontWeight: 700,
          marginRight: 7,
        }}
      >
        {cell.sectionName}
      </div>
      <div style={{ display: "flex", fontSize: 15, fontWeight: 600, color: accent }}>
        {cell.subjectCode}
      </div>
    </div>
  );
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const data = await getTimetable(parseClassId(params), parseFilters(params));
  const model = buildShareModel(data);
  const dark = themeParamSchema.parse(params.get("theme") ?? "dark") !== "light";
  const theme = dark ? SHARE_THEMES.dark : SHARE_THEMES.light;

  const dayCount = Math.max(model.days.length, 1);
  const gridWidth = WIDTH - PAD * 2;
  const dayColWidth = Math.floor((gridWidth - PERIOD_COL) / dayCount);
  const cellWidth = dayColWidth - 8;

  const rowHeights = model.rows.map((row) => {
    let busiest = 1;
    for (const day of model.days) {
      busiest = Math.max(busiest, (row.byDay[day.id] ?? []).length);
    }
    return busiest * CELL_HEIGHT + ROW_PAD;
  });

  const headerHeight = model.footnote ? 168 : 142;
  const bodyHeight = rowHeights.reduce((sum, value) => sum + value, 0);
  const height = Math.min(
    6000,
    Math.round(headerHeight + 46 + Math.max(bodyHeight, 140) + 70),
  );

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: WIDTH,
          height,
          backgroundColor: theme.bg,
          color: theme.fg,
          paddingTop: PAD,
          paddingBottom: PAD,
          paddingLeft: PAD,
          paddingRight: PAD,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingBottom: 22,
            borderBottom: `1px solid ${theme.line}`,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>
              {model.title || "Kaksha"}
            </div>
            <div style={{ display: "flex", fontSize: 20, color: theme.muted, marginTop: 10 }}>
              {model.subtitle}
            </div>
            {model.footnote ? (
              <div style={{ display: "flex", fontSize: 16, color: theme.muted, marginTop: 8 }}>
                {model.footnote}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              borderRadius: 12,
              border: `1px solid ${theme.line}`,
              backgroundColor: theme.panel,
              paddingTop: 12,
              paddingBottom: 12,
              paddingLeft: 20,
              paddingRight: 20,
            }}
          >
            <div style={{ display: "flex", fontSize: 38, fontWeight: 700 }}>
              {String(model.lectures)}
            </div>
            <div style={{ display: "flex", fontSize: 13, color: theme.muted, marginTop: 6 }}>
              LECTURES / WEEK
            </div>
          </div>
        </div>

        {model.rows.length === 0 ? (
          <div
            style={{
              display: "flex",
              height: 200,
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              color: theme.muted,
            }}
          >
            No lectures match this selection
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 22 }}>
            <div style={{ display: "flex", height: 46, alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  width: PERIOD_COL,
                  fontSize: 12,
                  color: theme.muted,
                }}
              >
                PERIOD
              </div>
              {model.days.map((day) => (
                <div
                  key={day.id}
                  style={{
                    display: "flex",
                    width: dayColWidth,
                    fontSize: 16,
                    fontWeight: 600,
                    color: theme.muted,
                  }}
                >
                  {day.short}
                </div>
              ))}
            </div>

            {model.rows.map((row, index) => (
              <div
                key={row.periodId}
                style={{
                  display: "flex",
                  height: rowHeights[index],
                  borderTop: `1px solid ${theme.line}`,
                  paddingTop: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    width: PERIOD_COL,
                  }}
                >
                  <div style={{ display: "flex", fontSize: 26, fontWeight: 700 }}>
                    {row.periodLabel}
                  </div>
                  {row.periodName ? (
                    <div style={{ display: "flex", fontSize: 12, color: theme.muted, marginTop: 5 }}>
                      {row.periodName}
                    </div>
                  ) : null}
                </div>

                {model.days.map((day) => {
                  const cells = row.byDay[day.id] ?? [];
                  return (
                    <div
                      key={day.id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        width: dayColWidth,
                      }}
                    >
                      {cells.length === 0 ? (
                        <div style={{ display: "flex", fontSize: 16, color: theme.empty }}>-</div>
                      ) : (
                        cells.map((cell, cellIndex) => (
                          <CellBlock
                            key={`${day.id}-${cellIndex}`}
                            cell={cell}
                            width={cellWidth}
                            theme={theme}
                            dark={dark}
                          />
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingTop: 18,
            borderTop: `1px solid ${theme.line}`,
            fontSize: 14,
            color: theme.muted,
          }}
        >
          <div style={{ display: "flex" }}>
            {String(model.slots)} slots · {data.currentClass.name}
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", marginRight: 6 }}>Kaksha</div>
            <div style={{ display: "flex" }}>· {data.school.session}</div>
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
