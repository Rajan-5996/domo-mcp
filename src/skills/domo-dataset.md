---
description: Connects a Domo dataset to an existing Domo app by updating the manifest's datasetsMapping and generating a typed TypeScript Data API client. Trigger this skill whenever the user wants to wire up a Domo dataset, add or update a datasetsMapping in manifest.json, integrate the Domo Data API into a TypeScript app, or generate typed query helpers using domo.get/domo.post. Also trigger when the user says things like "connect dataset", "add dataset to my Domo app", "wire up Domo data", or references a dataSetId.
argument-hint: [dataset-id]
allowed-tools: Bash, Read, Write, Edit, Glob
---

# Domo Dataset Integration Skill

Wire a Domo dataset into an existing Domo app in three focused steps:
1. Ask for the dataset ID, then fetch its metadata (name + columns) from the Domo API.
2. Update `manifest.json` with a typed `datasetsMapping` entry, letting the user pick which columns to map.
3. Generate (or extend) a typed TypeScript Data API module — **zero `any` types**.

---

## Autonomous Execution — No Permission Prompts

All required inputs are gathered up front in Steps 1–4 (dataset ID, instance hostname, developer token, column/alias choices, file paths). Once Step 4 is answered, **execute Steps 5–8 to completion without asking the user for permission or confirmation** — no "does this look right? (yes/no)", no "should I write this file?", no "ok to proceed?". Show the manifest entry and generated types as informational summaries while continuing, not as gates. Only stop for a hard blocker: an auth/API error (401/403/404), invalid JSON, or a TypeScript error.

## Secrets Handling — Developer Access Token

The Developer Access Token (Step 2) must never be written into any project file or committed. Store it only in a temp directory outside the repo, read it from there for the API call in Step 2, and delete the directory once the skill finishes.

First, detect the shell available to the Bash/terminal tool (`echo $SHELL` or try `mktemp --version`). Use whichever variant matches:

**macOS / Linux / Git Bash / WSL (bash, sh):**
```bash
DOMO_SECRET_DIR=$(mktemp -d)
chmod 700 "$DOMO_SECRET_DIR"
printf '%s' "<token-from-user>" > "$DOMO_SECRET_DIR/dev_token"
```
Read it with `$(cat "$DOMO_SECRET_DIR/dev_token")` wherever `${DOMO_DEV_TOKEN}` appears below. Cleanup: `rm -rf "$DOMO_SECRET_DIR"`

**Native Windows (PowerShell, no bash available):**
```powershell
$DOMO_SECRET_DIR = Join-Path $env:TEMP ([System.Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $DOMO_SECRET_DIR | Out-Null
Set-Content -Path "$DOMO_SECRET_DIR\dev_token" -Value "<token-from-user>" -NoNewline
```
Read it with `Get-Content "$DOMO_SECRET_DIR\dev_token"` wherever `${DOMO_DEV_TOKEN}` appears below — e.g. `curl.exe ... --header "X-DOMO-Developer-Token: $(Get-Content "$DOMO_SECRET_DIR\dev_token")"`. Cleanup: `Remove-Item -Recurse -Force $DOMO_SECRET_DIR`

**At the end of the skill (Step 8), clean up the temp dir using whichever variant was used above.**

---

## Step 1 — Ask for the dataset ID first

**Before anything else**, ask the user for the Domo dataset ID and nothing
else. Do not proceed, do not ask other questions, do not touch any files until
the dataset ID is provided.

```
What is the Domo dataset ID you want to connect?
(It looks like: 5168da8d-1c72-4e31-ba74-f609f73071dd)
```

If the dataset ID was already given in the conversation, skip this and move on.

---

## Step 2 — Fetch dataset metadata from the Domo API

Once the dataset ID is provided, ask the user for two more things needed to
make the API call — and nothing else yet:

- **Domo instance hostname** — e.g. `example.domo.com`
- **Developer token** — from Domo's developer portal (used as
  `X-DOMO-Developer-Token` header)

Store the token using the **Secrets Handling** steps above, then make this call:

```bash
curl --silent --request GET \
  --url https://<hostname>/api/data/v3/datasources/<datasetId> \
  --header "X-DOMO-Developer-Token: $(cat "$DOMO_SECRET_DIR/dev_token")"
```

The response looks like:

```json
{
  "id": "dataset-uuid",
  "name": "dataset name",
  "displayType": "webform",
  "status": "SUCCESS",
  "rowCount": 2,
  "columnCount": 3,
  "columns": [
    { "name": "Sales Amount",            "type": "DOUBLE"  },
    { "name": "Client Name",             "type": "STRING"  },
    { "name": "Contract Initiation Date","type": "DATE"    }
  ]
}
```

**Important:** The `columns` array is the authoritative list of column names
in this dataset. Use it in the next step to let the user choose what to map.

If the response has no `columns` key, display the other metadata (name,
rowCount, columnCount) and ask the user to supply column names manually.

**Error handling:**
- `401 Unauthorized` / `403 Forbidden` → tell the user the token is invalid or expired; ask them to generate a new one from Domo's developer portal
- `404 Not Found` → dataset ID doesn't exist or the user doesn't have access; ask them to verify the ID
- Connection error / no curl → ask the user to paste the raw JSON response themselves

---

## Step 3 — Confirm which columns to include and choose aliases

Display the columns returned by the API in a table, then ask the user:

1. Which columns do they want to include in the mapping? (default: all)
2. For each included column, what camelCase `alias` should it get in the app?
   Suggest a sensible default derived from the column name (e.g.
   `"Sales Amount"` → `amount`, `"Contract Initiation Date"` → `startDate`).

Example prompt to show the user:

```
Found 3 columns in "Sales Data":

  #  Column Name                  Suggested alias
  1  Sales Amount                 amount
  2  Client Name                  name
  3  Contract Initiation Date     startDate

Which columns do you want to include? (hit Enter for all)
Any alias changes?
```

This is the last gathering step before autonomous execution — wait for this answer.

---

## Step 4 — Gather file paths

After column aliases are confirmed, ask for:

| Question | Default |
|----------|---------|
| Path to `manifest.json` | `manifest.json` |
| Path to the Data API module | `src/API/dataApi.ts` |
| Alias for the dataset itself (camelCase, used in the app and as the manifest alias) | derived from dataset name |

**Once this is answered, execute Steps 5–8 to completion without further questions or confirmations** (see Autonomous Execution above).

---

## Step 5 — Update `manifest.json`

Read the current `manifest.json`. If a `datasetsMapping` array already exists,
append the new entry; otherwise add the key.

**Target shape (no deviations):**

```json
{
  "datasetsMapping": [
    {
      "alias": "<alias>",
      "dataSetId": "<uuid>",
      "fields": [
        { "alias": "<fieldAlias>", "columnName": "<Exact Column Name>" }
      ]
    }
  ]
}
```

Rules:
- Preserve every existing key in `manifest.json` — only add/extend
  `datasetsMapping`.
- Do **not** duplicate an alias that already exists; update it instead.
- Write the file back with 2-space indentation.

Show the resulting `datasetsMapping` entry as an informational summary, then continue immediately — this is not a confirmation gate.

---

## Step 6 — Generate the typed TypeScript Data API module

Read the existing file at the Data API path (e.g. `src/API/dataApi.ts`).
Extend it — never replace it wholesale unless it is empty.

### 6a. Derive types from the manifest fields

For each field in the mapping, infer a TypeScript type. Prefer the Domo
column `type` from the API response when available; fall back to alias
heuristics otherwise.

**From Domo column type (preferred):**

| Domo type | TS type |
|-----------|---------|
| `DOUBLE`, `LONG`, `DECIMAL` | `number` |
| `DATE`, `DATETIME` | `string` (ISO date string) |
| `STRING` | `string` |

**Alias heuristics (fallback):**

| Heuristic | TS type |
|-----------|---------|
| alias ends with `Date`, `At`, `On`, `Time` | `string` |
| alias starts/ends with `amount`, `qty`, `count`, `total`, `price`, `rate` | `number` |
| alias is `id`, ends with `Id` | `string` |
| everything else | `string` |

Generate a **result row interface** named `<PascalAlias>Row`:

```ts
export interface SalesRow {
  amount: number;
  name: string;
  startDate: string;
}
```

### 6b. Write typed query helpers using the Data API

Use `domo.get` (already imported in Domo apps) with explicit generic return
types. **Never use `any`.**

Pattern to follow:

```ts
// ── Query operators supported by the Domo Data API ────────────────────────
type OrderDir = 'ascending' | 'descending';
type DateGrainUnit = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface <PascalAlias>QueryOptions {
  fields?: (keyof <PascalAlias>Row)[];
  filter?: string;
  limit?: number;
  offset?: number;
  orderby?: `${string & keyof <PascalAlias>Row} ${OrderDir}`;
  groupby?: (keyof <PascalAlias>Row)[];
  sum?: (keyof <PascalAlias>Row)[];
  count?: (keyof <PascalAlias>Row)[];
  avg?: (keyof <PascalAlias>Row)[];
  dategrain?: `${string} by ${DateGrainUnit}`;
}

/** Fetch rows from the "<alias>" dataset. */
export async function get<PascalAlias>(
  options: <PascalAlias>QueryOptions = {},
): Promise<<PascalAlias>Row[]> {
  const params = buildParams(options);
  return domo.get<<PascalAlias>Row[]>(`/data/v1/<alias>${params}`);
}
```

Also add a `buildParams` helper (add only once even with multiple datasets):

```ts
function buildParams(options: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(options)) {
    if (val === undefined) continue;
    const v = Array.isArray(val) ? val.join(',') : String(val);
    parts.push(`${key}=${encodeURIComponent(v)}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}
```

### 6c. Add a SQL API helper (optional but recommended)

```ts
/** Run a raw SQL query against the "<alias>" dataset. */
export async function query<PascalAlias>(sql: string): Promise<<PascalAlias>Row[]> {
  const result = await domo.post<{ rows: <PascalAlias>Row[] }>(
    '/sql/v1/<alias>',
    sql,
    { contentType: 'text/plain' },
  );
  return result.rows;
}
```

Note for the user: the SQL API does **not** support page filters.

### 6d. Beast mode support

If the user asks for beast mode columns, add `useBeastMode=true` to the URL
and remind them:
- They must explicitly provide aggregation operators when using `groupby`.
- They cannot `filter` on beast mode columns that contain aggregate functions.

---

## Step 7 — Show a usage example

After writing the files, print a short usage snippet so the user can verify
everything is wired up correctly:

```ts
import { getSales } from './API/dataApi';

// Fetch top 10 sales over $1000, newest first
const rows = await getSales({
  filter: 'amount > 1000',
  orderby: 'startDate descending',
  limit: 10,
});

console.log(rows[0].name, rows[0].amount);
```

---

## Step 8 — Clean Up Secrets and Summarize

Delete the temp secrets directory created in Step 2 (use the variant matching the shell used to create it):

```bash
rm -rf "$DOMO_SECRET_DIR"
```
```powershell
Remove-Item -Recurse -Force $DOMO_SECRET_DIR
```

Print:
1. **Dataset**: name, dataset ID, columns mapped
2. **datasetsMapping written**: alias + fields (alias → columnName)
3. **Files created/edited**: `<manifest-path>`, `<data-api-path>`
4. **Generated types/functions**: `<PascalAlias>Row`, `get<PascalAlias>`, `query<PascalAlias>` (if added)
5. **Usage example**: shown above
6. **Security**: Developer Access Token was stored only in a temp directory, never written to a project file — the temp directory has been deleted

---

## TypeScript rules (mandatory)

- **No `any`** — use explicit generics, `unknown`, or derived union types.
- Prefer `keyof <RowType>` for field/column references so typos are caught at
  compile time.
- All functions must have explicit return types.
- Use `async/await`; do not use `.then()` chains in generated code.
- Export every public type and function; keep internal helpers unexported.

---

## Edge cases

| Situation | Handling |
|-----------|----------|
| API call returns 401/403 | Tell the user the token is invalid or expired; ask them to generate a new one from Domo's developer portal |
| API call returns 404 | Dataset ID doesn't exist or the user doesn't have access; ask them to verify the ID |
| Response has no `columns` key | Show available metadata (name, rowCount, columnCount) and ask the user to supply column names and types manually |
| API call cannot be made (no curl/network) | Ask the user to paste the raw JSON response themselves |
| `manifest.json` doesn't exist yet | Create it with `{ "datasetsMapping": [...] }` |
| Alias already exists in manifest | Overwrite that entry, warn the user |
| Data API file doesn't exist | Create it from scratch with the full boilerplate |
| Multiple datasets in one session | Repeat Steps 2–7 for each; `buildParams` is written only once |
| User wants aggregation without groupby | Remind them a single aggregated row is returned |
| User wants `dategrain` | Warn about the extra calendar column (e.g. `CalendarMonth`) |

---

## Reference

See `references/data-api.md` for the full Domo Data API operator reference
(filter syntax, aggregation rules, date grain column names, beast mode
constraints). Load it if the user asks about a specific operator or error.
