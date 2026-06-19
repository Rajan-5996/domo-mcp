---
description: Set up Domo AppDB for a React app — creates the AppDB datastore and collection(s) directly via the Domo Datastores REST API (using an admin-generated developer access token), saves the returned datastore ID, then writes the collections block into manifest.json and guides through domo publish. Use this skill whenever the user wants to add a database, store data, create a collection, or use AppDB in a Domo app.
argument-hint: [collection-name] [--schema <json>]
allowed-tools: Bash, Read, Write, Edit, Glob
---

# Set Up Domo AppDB

You are helping the user add AppDB (application database) to a Domo React app.

## CRITICAL — Read Before Doing Anything

### How AppDB Creation Works

> **AppDB is created directly via the Domo Datastores REST API — BEFORE touching manifest.json.**
>
> Strict creation order — never deviate:
> 1. Ask the user for Domo instance URL and Developer Access Token
> 2. `POST /api/datastores/v1` → creates the datastore → **save the returned `id`**
> 3. `POST /api/datastores/v1/{datastoreId}/collections/` → creates the collection inside the datastore
> 4. Write the `collections` block into `manifest.json`
> 5. Run `domo publish` to deploy

### Column Type Rules — STRICT

Domo AppDB supports **exactly 6 column types**. Use only these. Never use any other type string.

| Type | Use for | Examples |
|---|---|---|
| `STRING` | Text of any kind — names, labels, IDs, URLs, JSON strings, enums, anything not numeric or date | `"title"`, `"status"`, `"userId"`, `"email"`, `"category"` |
| `LONG` | Whole integers only — counts, quantities, epoch timestamps in ms | `"count"`, `"createdAt"` (epoch ms), `"rank"`, `"quantity"` |
| `DECIMAL` | Exact fixed-point decimals — money, percentages, precise values where rounding matters | `"price"`, `"taxRate"`, `"percentage"` |
| `DOUBLE` | Floating-point — scientific values, averages, coordinates, imprecise real numbers | `"latitude"`, `"longitude"`, `"score"`, `"average"` |
| `DATE` | Date only, no time — ISO 8601 `YYYY-MM-DD` | `"dueDate"`, `"birthDate"`, `"startDate"` |
| `DATETIME` | Date + time — ISO 8601 `YYYY-MM-DDTHH:mm:ssZ` | `"createdAt"` (if storing full timestamp as string), `"scheduledAt"` |

**Type selection rules — follow these precisely:**
- `true`/`false` flags → **`STRING`** (store as `"true"` / `"false"`) — Domo AppDB has NO boolean type
- IDs, UUIDs, references to other documents → **`STRING`**
- Timestamps / dates you want to filter/sort by → **`LONG`** (epoch ms) or **`DATETIME`** (ISO string)
- Currency / money → **`DECIMAL`** (never `DOUBLE` for money)
- Counts, quantities, rankings → **`LONG`**
- Any free text → **`STRING`**
- Coordinates (lat/lng) → **`DOUBLE`**
- Enums (status, category, role) → **`STRING`**
- Arrays or objects → flatten into multiple `STRING` columns OR serialize to JSON string in a `STRING` column

**Never use**: `BOOLEAN`, `INT`, `INTEGER`, `NUMBER`, `FLOAT`, `TEXT`, `VARCHAR`, `TIMESTAMP`, `OBJECT`, `ARRAY` — these do not exist in Domo AppDB and will cause API errors.

### Nested Schema Rules

Domo AppDB schema columns are **flat** — there is no native nested object support at the schema level. Handle nested data with one of these patterns:

**Pattern A — Flatten** (preferred for simple nesting, filterable fields):
```
// Instead of: { address: { city, zip, country } }
{ "name": "addressCity",    "type": "STRING" }
{ "name": "addressZip",     "type": "STRING" }
{ "name": "addressCountry", "type": "STRING" }
```

**Pattern B — JSON String** (for deeply nested / variable-shape objects):
```
// Store the whole nested object as a serialized JSON string in a STRING column
{ "name": "metadata", "type": "STRING" }
// In app code: JSON.stringify(nestedObj) on write, JSON.parse(str) on read
```

**Pattern C — Related Collections** (for one-to-many relationships):
```
// Parent collection: tasks
{ "name": "id",    "type": "STRING" }
{ "name": "title", "type": "STRING" }

// Child collection: comments (reference parent by taskId STRING)
{ "name": "taskId",  "type": "STRING" }
{ "name": "body",    "type": "STRING" }
{ "name": "author",  "type": "STRING" }
```

Ask the user which pattern fits their data before designing the schema. Always suggest the right one based on their use case.

---

## Autonomous Execution — No Permission Prompts

All required inputs are gathered up front in Step 2. Once Step 2's questions are answered, **execute Steps 3–6 to completion without asking the user for permission or confirmation** — no "does this look right? (yes/no)", no "should I create this collection?", no "ok to proceed?". Show schemas/plans as informational summaries while continuing, not as gates. Only stop for a hard blocker (auth/API error, invalid column type rejected by the API).

## Secrets Handling — Developer Access Token

The Developer Access Token (Q2) must never be written into any project file or committed. Store it only in a temp directory outside the repo, read it from there for every API call below, and delete the directory once the skill finishes.

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

**Clean up at the end (Step 12) using whichever variant was used above.**

---

## Step 1 — Confirm Prerequisites

```bash
# Locate manifest.json — public/manifest.json for create-dovite, manifest.json for legacy CRA
cat public/manifest.json 2>/dev/null || cat manifest.json

# Confirm domo CLI
domo --version 2>&1 || echo "domo not found"

# Confirm curl
curl --version | head -1
```

Use whichever manifest path exists — call it `<manifest-path>` throughout.

If no manifest found, stop and tell the user:
> "Your project is not set up yet. Please run `/domo-create-react-app` first."

If `domo` is not found:
```bash
npm install -g ryuu@latest
```

---

## Step 2 — Gather Requirements (One at a Time, Always Suggest)

Ask each question one at a time. Wait for the answer. Never assume. Always give examples or suggestions.

Tell the user upfront:
> "I'll create your AppDB datastore and collection(s) directly in Domo via the Datastores REST API. I need a few details first."

---

**Q1 — Domo Instance Hostname**
> "What is your Domo instance hostname?
>
> **Example:** `gwcteq-partner.domo.com`
>
> Just the hostname — no `https://`, no trailing slash. Find it in your browser's address bar when logged into Domo."

After the user answers, internally set two derived values:
- `DOMO_INSTANCE_HOST` = the raw hostname (e.g. `gwcteq-partner.domo.com`)
- `DOMO_INSTANCE` = `https://<hostname>` (used as the base URL for all API calls)

These are used as:
- REST API base: `${DOMO_INSTANCE}/api/datastores/v1`
- CLI auth: `domo login -i ${DOMO_INSTANCE_HOST}` (hostname only, no https://)

---

**Q2 — Developer Access Token** *(always ask, never assume, never store in project files)*
> "Please provide your **Domo Developer Access Token**.
>
> To generate one: Domo → **Admin Settings → Authentication → Access Tokens** → Generate Token
>
> It looks like a long alphanumeric string. I'll use it only for this session's API calls, stored in a temp directory that's deleted when this skill finishes."

Never hardcode the token and never write it into a project file — store it in the temp secrets dir (see Secrets Handling above).

---

**Q3 — Datastore Name**
> "What should the AppDB **datastore** be called?
>
> Suggestions:
> - `TodoApp` — for a task/todo app
> - `SalesDashboard` — for a sales tracking app
> - `TeamTracker` — for team management
>
> Use PascalCase, no spaces. Or type your own."

---

**Q4 — Collection Name(s)**
> "What **collection(s)** should exist inside the datastore?
> A collection is like a table — it holds documents of one type.
>
> Examples:
> - `tasks` — for todo items
> - `comments` — for user comments
> - `users` — for user profiles
>
> You can have multiple collections. List them all."

---

**Q5 — Schema Design (Critical — Do This Carefully)**

For each collection, ask:
> "What fields does `<collection-name>` need?
>
> Tell me the field names and what kind of data they hold. I'll assign the correct Domo type for you.
>
> Example: 'title (text), completed (yes/no flag), dueDate (a calendar date), createdAt (timestamp), priority (high/medium/low)'"

**After the user describes fields, YOU assign the types** using the strict rules above. Show the user the full schema with types assigned, then continue immediately — this is informational, not a confirmation gate:

> "Here's the schema I'll create for `<collection-name>`:
>
> | Field | Type | Reason |
> |---|---|---|
> | title | STRING | free text |
> | completed | STRING | boolean stored as 'true'/'false' — Domo has no BOOLEAN type |
> | dueDate | DATE | calendar date only |
> | createdAt | LONG | epoch timestamp in ms |
> | priority | STRING | enum stored as text |"

---

**Q6 — Nested Data Check**
> "Do any of your fields contain nested objects or arrays? For example:
> - An `address` with `city`, `zip`, `country` inside it
> - A list of tags or items
> - Any JSON objects
>
> If yes, I'll help you decide the best way to handle them (flatten, JSON string, or separate collection)."

If yes, recommend a pattern (A, B, or C from the rules above) and show the resulting schema.

---

**Q7 — syncEnabled**
> "Should the collection be **shared** across all users on the Domo instance, or **private** per user?
>
> - `true` (shared) — all users see each other's documents *(default, most common)*
> - `false` (private) — each user only sees their own documents"

---

**Q8 — proxyId**
> "Do you already have a `proxyId` in your `manifest.json`?
> It's needed for AppDB to work during local development (`yarn dev`).
>
> If you have it, paste it here. If not, we'll add a placeholder and I'll tell you how to get it after publish."

---

Export credentials for the session:
```bash
# Hostname only — used for domo login -i
export DOMO_INSTANCE_HOST="gwcteq-partner.domo.com"   # replace with user's hostname

# Full URL — used as base for all REST API calls
export DOMO_INSTANCE="https://${DOMO_INSTANCE_HOST}"

# Developer Access Token — written to the temp secrets dir, not exported as a var
DOMO_SECRET_DIR=$(mktemp -d)
chmod 700 "$DOMO_SECRET_DIR"
printf '%s' "<token-from-user>" > "$DOMO_SECRET_DIR/dev_token"
```

**NEVER write these into any project file.**

---

## Step 3 — Create the Datastore (API Call 1)

> Creates the datastore in Domo. The response `id` is required for Step 4 — extract it immediately.

```bash
curl --silent --request POST "${DOMO_INSTANCE}/api/datastores/v1" \
  --header 'Content-Type: application/json' \
  --header "X-DOMO-Developer-Token: $(cat "$DOMO_SECRET_DIR/dev_token")" \
  --data '{
    "name": "<DATASTORE_NAME_FROM_USER>"
  }' | tee /tmp/datastore-response.json
```

### Expected response
```json
{
  "id": "ecd6268c-cb8d-4a9e-bbaa-281dbd6323cf",
  "name": "TodoApp",
  "customer": "yourcompany",
  "owner": 2030266985,
  "createdOn": "2026-06-11T12:49:56.679Z",
  "updatedOn": "2026-06-11T12:49:56.679Z",
  "updatedBy": 2030266985,
  "temporary": false
}
```

### Extract and save the datastore ID
```bash
export DATASTORE_ID=$(node -e "console.log(require('/tmp/datastore-response.json').id)")
echo "Datastore ID: ${DATASTORE_ID}"
```

**Checkpoint — do not proceed until:**
- Response is HTTP 200 with a JSON body containing `id`
- `DATASTORE_ID` is a non-empty UUID string

**Error handling:**
- `401 Unauthorized` → token invalid or expired — ask user to regenerate from Domo Admin end
- `403 Forbidden` → token user lacks admin privileges — must use an admin account's token
- Connection error → confirm instance URL is correct and reachable

---

## Step 4 — Create Collection(s) (API Call 2)

> Creates the actual collection inside the datastore. Use `DATASTORE_ID` in the URL path.
> Column types MUST be one of: `STRING`, `LONG`, `DECIMAL`, `DOUBLE`, `DATE`, `DATETIME` — no other values are accepted.

```bash
curl --silent --request POST "${DOMO_INSTANCE}/api/datastores/v1/${DATASTORE_ID}/collections/" \
  --header 'Content-Type: application/json' \
  --header "X-DOMO-Developer-Token: $(cat "$DOMO_SECRET_DIR/dev_token")" \
  --data '{
    "name": "<COLLECTION_NAME>",
    "schema": {
      "columns": [
        { "name": "title",       "type": "STRING" },
        { "name": "completed",   "type": "STRING" },
        { "name": "dueDate",     "type": "DATE" },
        { "name": "createdAt",   "type": "LONG" },
        { "name": "priority",    "type": "STRING" }
      ]
    },
    "syncEnabled": true
  }' | tee /tmp/collection-response.json
```

Replace `name`, `schema.columns`, and `syncEnabled` with values confirmed in Step 2.

**Before making this call, verify every column type is one of the 6 valid types.** If you assigned any other type, correct it now using the type rules in the CRITICAL section above.

### Multiple collections

Repeat the call once per collection, same `DATASTORE_ID`, different body each time.

### Checkpoint per collection
- Response returns HTTP 200/201 with the collection object
- Each call succeeded before moving to the next

**Error handling:**
- `400 Bad Request` with type error → a column has an invalid type. Check every `"type"` value against the 6 valid types. Common mistakes: `BOOLEAN` (use `STRING`), `INT` or `INTEGER` (use `LONG`), `FLOAT` or `NUMBER` (use `DOUBLE` or `DECIMAL`), `TEXT` (use `STRING`), `TIMESTAMP` (use `LONG` or `DATETIME`)
- `404 Not Found` → `DATASTORE_ID` is wrong or empty — re-extract from `/tmp/datastore-response.json`

---

## Step 5 — Read the Current manifest.json

```bash
cat <manifest-path>
```

Note:
- Whether `collections` array already exists (create-dovite scaffolds `"collections": []`) → merge into it
- Whether `proxyId` is already present
- Current `version` field → bump it after changes

---

## Step 6 — Write the `collections` Block into manifest.json

Edit `<manifest-path>` directly. Collection names MUST exactly match (case-sensitive) the names used in the Step 4 API calls.

### Single collection
```json
"collections": [
  {
    "name": "tasks",
    "schema": {
      "columns": [
        { "name": "title",     "type": "STRING" },
        { "name": "completed", "type": "STRING" },
        { "name": "dueDate",   "type": "DATE" },
        { "name": "createdAt", "type": "LONG" },
        { "name": "priority",  "type": "STRING" }
      ]
    },
    "syncEnabled": true
  }
]
```

### Editing rules
- If `collections` already exists → add new objects to the existing array, do NOT remove existing ones
- If `collections` does not exist → add after `mapping`
- Collection name must be unique and match the API-created name exactly
- Never add `id` manually — Domo manages collection IDs
- Never write the developer token or datastore credentials into manifest.json

---

## Step 7 — Add or Verify `proxyId`

`proxyId` routes AppDB calls during local dev. The collection already exists in Domo from Steps 3–4.

### If user has proxyId
```json
"proxyId": "abc123def456"
```

### If no proxyId yet
```json
"proxyId": "REPLACE_AFTER_FIRST_PUBLISH"
```

After publish, tell user:
> 1. In Domo, create a card from the new design
> 2. Right-click the card → Inspect Element
> 3. Find the `<iframe>` src: `//<HASH>.domoapps.prodX.domo.com?userId=...`
> 4. Copy `<HASH>` — that is your `proxyId`
> 5. Edit `<manifest-path>`: `"proxyId": "<HASH>"`
> 6. Republish: `yarn upload` (create-dovite) or `npm run domo:publish` (legacy CRA)

---

## Step 8 — Bump the Version

Edit `<manifest-path>` directly:

| Bump | When |
|---|---|
| `PATCH` 1.0.**x** | Schema fix, typo |
| `MINOR` 1.**x**.0 | New collection or column |
| `MAJOR` **x**.0.0 | Column removed or type changed |

---

## Step 9 — AppDB Client Usage

**create-dovite apps**: Use `DomoApi` from `src/API/domoAPI.ts` — already wired, no new file needed.

```tsx
import DomoApi from "@/API/domoAPI"

// List
const tasks = await DomoApi.ListDocuments('tasks')

// Create — store booleans as strings, timestamps as epoch ms
await DomoApi.CreateDocument('tasks', {
  title: 'New task',
  completed: 'false',        // STRING — not boolean
  dueDate: '2026-07-01',     // DATE — ISO YYYY-MM-DD string
  createdAt: Date.now(),     // LONG — epoch ms
  priority: 'high',          // STRING — enum as text
})

// Update
await DomoApi.UpdateDocument('tasks', id, { completed: 'true' })

// Delete
await DomoApi.DeleteDocument('tasks', id)
```

**Type conversion reminders in app code:**
- Reading `completed`: `doc.content.completed === 'true'` (string comparison, not boolean)
- Reading `createdAt` (LONG): `new Date(doc.content.createdAt)` to convert epoch ms to Date
- Reading `dueDate` (DATE): `new Date(doc.content.dueDate)` — parses ISO date string

**Legacy CRA apps** (no `src/API/domoAPI.ts`): use raw fetch against `/domo/datastores/v1/collections/<name>/documents/`.

---

## Step 10 — Validate manifest.json

```bash
cat <manifest-path>

node -e "
const m = require('<manifest-path>');
const VALID_TYPES = ['STRING','LONG','DECIMAL','DOUBLE','DATE','DATETIME'];
const errs = [];
if (!m.name)    errs.push('missing name');
if (!m.version) errs.push('missing version');
if (!m.size)    errs.push('missing size');
if (!Array.isArray(m.mapping) && !Array.isArray(m.datasetsMapping)) errs.push('missing mapping array');
if (!Array.isArray(m.collections)) errs.push('missing collections array');
if (Array.isArray(m.collections)) {
  m.collections.forEach((c, i) => {
    if (!c.name)   errs.push('collections['+i+'] missing name');
    if (!c.schema) errs.push('collections['+i+'] missing schema');
    if (Array.isArray(c.schema?.columns)) {
      c.schema.columns.forEach((col, j) => {
        if (!VALID_TYPES.includes(col.type))
          errs.push('collections['+i+'].columns['+j+'] invalid type: '+col.type+' — must be one of '+VALID_TYPES.join(', '));
      });
    } else {
      errs.push('collections['+i+'] schema.columns must be an array');
    }
  });
}
if (errs.length) { console.error('Errors:\\n' + errs.map(e=>'  - '+e).join('\\n')); process.exit(1); }
else console.log('manifest.json OK — collections:', m.collections.map(c=>c.name).join(', '));
"
```

**This validation script explicitly checks every column type against the 6 valid types.** If it reports any `invalid type` error, fix the column type in manifest.json and re-run before publishing.

---

## Step 11 — Publish

> The datastore and collection(s) already exist in Domo (created in Steps 3–4). Publishing deploys your app so it can connect to them.

```bash
# create-dovite / Vite
yarn upload
# or: yarn build && domo publish --build-dir ./dist

# legacy CRA
npm run build && domo publish --build-dir ./build
```

After publish, verify in DevTools → Network tab: a call to `/domo/datastores/v1/collections/<name>/documents/` returns `200`.

---

## Step 12 — Clean Up Secrets and Summarize

Delete the temp secrets directory created in Step 2 (use the variant matching the shell used to create it):

```bash
rm -rf "$DOMO_SECRET_DIR"
```
```powershell
Remove-Item -Recurse -Force $DOMO_SECRET_DIR
```

Print:
1. **Datastore created**: name + UUID `id`
2. **Collections created**: for each — name, full schema (field → type → reason), `syncEnabled`
3. **Nested data handling**: which pattern was used (A/B/C) if applicable
4. **manifest.json updated**: path + collections block written
5. **proxyId**: set or placeholder (with instructions)
6. **Version bumped**: new version number
7. **Next step**: `yarn upload` or `npm run domo:publish`
8. **Security**: Developer Access Token was stored only in a temp directory, never written to a project file — the temp directory has been deleted

---

## Reference

### The 6 Valid Domo AppDB Column Types (repeat for emphasis)

```
STRING   — any text, enums, booleans-as-string, JSON-as-string, IDs
LONG     — integers, epoch timestamps in ms, counts
DECIMAL  — exact fixed-point numbers, money, percentages
DOUBLE   — floating-point, coordinates, averages
DATE     — date only, YYYY-MM-DD
DATETIME — date + time, ISO 8601
```

**These are the ONLY valid types. Nothing else exists in Domo AppDB.**

### Common Type Mistakes to Avoid

| Wrong type | Correct type | Reason |
|---|---|---|
| `BOOLEAN` | `STRING` | Domo has no BOOLEAN — store `"true"`/`"false"` |
| `INT` or `INTEGER` | `LONG` | Only `LONG` for integers |
| `FLOAT` or `NUMBER` | `DOUBLE` or `DECIMAL` | Use `DECIMAL` for money, `DOUBLE` for floats |
| `TEXT` or `VARCHAR` | `STRING` | Only `STRING` for text |
| `TIMESTAMP` | `LONG` or `DATETIME` | Use `LONG` for epoch ms, `DATETIME` for ISO string |
| `OBJECT` or `ARRAY` | `STRING` | Serialize to JSON string |

### API Calls Cheat Sheet

| Step | Method | URL | Headers |
|---|---|---|---|
| Create datastore | `POST` | `{instance}/api/datastores/v1` | `Content-Type: application/json`, `X-DOMO-Developer-Token: <token>` |
| Create collection | `POST` | `{instance}/api/datastores/v1/{datastoreId}/collections/` | same |

### AppDB Runtime API (from app code)

| Operation | Method | URL |
|---|---|---|
| List documents | `GET` | `/domo/datastores/v1/collections/<name>/documents/` |
| Get document | `GET` | `/domo/datastores/v1/collections/<name>/documents/<id>` |
| Create document | `POST` | `/domo/datastores/v1/collections/<name>/documents/` |
| Update document | `PUT` | `/domo/datastores/v1/collections/<name>/documents/<id>` |
| Delete document | `DELETE` | `/domo/datastores/v1/collections/<name>/documents/<id>` |
| Bulk create | `POST` | `/domo/datastores/v1/collections/<name>/documents/bulk` |

### Document shape
```json
{
  "id": "507f1f77bcf86cd799439011",
  "content": { "title": "My task", "completed": "false" },
  "owner": 12345678,
  "createdOn": 1718000000000,
  "updatedOn": 1718000100000,
  "syncEnabled": true
}
```

---

## Troubleshooting

**`400 Bad Request` on collection creation**
Almost always a bad column type. Check every `"type"` value — it must be one of: `STRING`, `LONG`, `DECIMAL`, `DOUBLE`, `DATE`, `DATETIME`. Common culprits: `BOOLEAN`, `INT`, `FLOAT`, `TEXT`, `TIMESTAMP`.

**`401 Unauthorized`**
Token invalid or expired. Regenerate from Domo → Admin Settings → Authentication → Access Tokens.

**`403 Forbidden`**
Token was generated from a non-admin account. Must use an admin-level token.

**`404 Not Found` on collection creation**
`DATASTORE_ID` is wrong or empty. Re-extract: `node -e "console.log(require('/tmp/datastore-response.json').id)"`

**AppDB calls 404 in local dev**
- `proxyId` missing or still placeholder — get from card iframe src and update manifest
- Session expired: `domo login -i ${DOMO_INSTANCE_HOST}` (hostname only, no https://)
- `@domoinc/ryuu-proxy` not installed: `npm list @domoinc/ryuu-proxy`

**AppDB calls 404 in production**
- Collection name in fetch URL doesn't match manifest.json name (case-sensitive)
- App not republished after manifest.json change

**`completed` field always reads as string**
Expected — Domo has no BOOLEAN. In app code: `doc.content.completed === 'true'`

**Can't change column type after collection has documents**
Create a new collection with the correct schema (new API call), migrate data manually, update manifest.json, republish. Adding new columns is always safe.

**`syncEnabled` wrong after creation**
Locked at creation time. To change: create a new collection via API with the correct `syncEnabled`, migrate data, update manifest.json.