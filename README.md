# Kaksha

Server-rendered class timetable manager. All data lives as JSON tables in `data/`, joined by id at
request time and served through the app's own REST API.

```bash
bun dev      # or npm run dev
```

## Data model

The JSON files behave like database tables. Rows reference each other by id, so a teacher or
subject is renamed in exactly one place.

| File | Row | Notes |
| --- | --- | --- |
| `data/school.json` | school | Title and session shown in the header |
| `data/days.json` | day | `id` is the weekday code used inside cells (`1` = Monday) |
| `data/subjects.json` | subject | Global catalogue, shared across classes |
| `data/teachers.json` | teacher | Global catalogue, shared across classes |
| `data/classes.json` | class | Owns its own `periods` and `subjectIds` |
| `data/sections.json` | section | Scoped to a class via `classId` |
| `data/entries/<classId>.json` | entry | One file per class |

### Ids

Ids are prefixed by table: `sub_english`, `tch_renu-yadav`, `sec_6_a`, `ent_6_a_0_1`. Any
stable unique string works; the prefix is a convention, not a requirement.

### An entry

An entry is one block inside one grid cell: a section, a period, and the days it runs on.

```json
{
  "id": "ent_6_a_0_1",
  "classId": "6",
  "sectionId": "sec_6_a",
  "periodId": 0,
  "dayIds": [1, 2],
  "assignments": [{ "subjectId": "sub_english", "teacherId": "tch_renu-yadav" }],
  "note": "NIPUN"
}
```

`assignments` is a list because one slot can split across streams. The elective block below is
Sanskrit with Vandana, Punjabi with Jaswinder, and Urdu with Saba, all in period 4:

```json
{
  "id": "ent_6_a_4_2",
  "classId": "6",
  "sectionId": "sec_6_a",
  "periodId": 4,
  "dayIds": [2, 3, 4, 5, 6],
  "assignments": [
    { "subjectId": "sub_skt", "teacherId": "tch_vandana" },
    { "subjectId": "sub_pnb", "teacherId": "tch_jaswinder" },
    { "subjectId": "sub_urdu", "teacherId": "tch_saba" }
  ],
  "note": "Elective split"
}
```

### Per-class subjects

Every class carries its own `periods` and `subjectIds`, so class 9 can run ten periods and a
different subject list than class 6 without touching shared files. A subject used in an entry
but missing from the class list is still rendered, and shows up in `/api/health` as a warning
rather than breaking the page.

Classes 7 to 12 exist with empty entry files, ready to fill in.

### Adding a class

1. Set `active: true` and list `periods` and `subjectIds` in `data/classes.json`.
2. Add its sections to `data/sections.json` with the matching `classId`.
3. Fill `data/entries/<classId>.json`.

## API

Every route reads the JSON fresh, so an edit shows up on reload with no restart.

| Route | Purpose |
| --- | --- |
| `GET /api/timetable` | Joined timetable, stats and teacher load |
| `GET /api/classes` | Classes with section, period and entry counts |
| `GET /api/teachers` | Teachers with weekly load |
| `GET /api/subjects` | Subjects with weekly lecture counts |
| `GET /api/health` | Dangling ids and other integrity issues |

`/api/timetable` accepts `class`, plus repeatable or comma-joined `teacher`, `subject`,
`section`, `day`, `period`, `group` and a free-text `q`.

```bash
curl 'localhost:3000/api/timetable?class=6&teacher=tch_renu-yadav' | jq .teacherLoad
```

Filters are driven from the URL, so any filtered view is a shareable link.

## Reading the grid

Columns are periods, rows are sections. The number prefix inside a block is the day code, so
`1-6` runs all week and `3,4` runs Wednesday and Thursday only. Colours are per subject, and
the left rail lists each section's electives.
