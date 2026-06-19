---
description: Fetch a Domo Workflow (v2) definition by workflow ID + version number, write its required start inputs into manifest.json's workflowMapping block, and wire a trigger (button or automatic/condition-based) into a React app that calls the workflow's start-message API. Use this skill whenever the user wants to add a Domo workflow, automation, or process trigger to their app.
argument-hint: [workflow-id] [version-number]
allowed-tools: Bash, Read, Write, Edit, Glob
---

# Integrate a Domo Workflow into a React App

You are wiring an existing Domo Workflow (Workflow v2 model) into a React app (create-dovite or legacy CRA), based on its published definition.

## GOLDEN RULES — Never Break These

- **Never hardcode the workflow definition into the app.** Fetch it live from the API, use it to derive `workflowMapping` and the trigger payload.
- **Never write the Developer Access Token into any project file.** Keep it in a temp secrets dir (see Secrets Handling) — never in the repo.
- **Never guess the workflow's required inputs.** Read them from the **rootNode**'s `data.input` array in the fetched definition — that is the authoritative list of what the workflow needs to start.
- **Never use inline styles or raw HTML controls** — use shadcn/ui components already installed in the project (check `src/components/ui/` first; install with `npx shadcn@latest add <component>` if missing).
- **Always ask the user how the trigger should fire** (button vs automatic/condition) before writing any trigger code.
- **Always read `manifest.json` before editing it** — merge into existing `workflowMapping`, never overwrite.
- **`workflowMapping` is the correct manifest key** (as confirmed by the official Domo manifest docs). Each entry MUST include `alias`, `startName`, and `parameters`. Missing `startName` causes a `{"status":404,"statusReason":"Not Found","toe":"..."}` error at runtime even when the workflow exists and the alias is correct — this is a known Domo proxy behaviour.
- **Never remove the stray `fileName` field check** — the Domo CLI sometimes injects `"fileName": "manifest.json"` into the manifest which must be removed before publishing.

---

## Autonomous Execution — No Permission Prompts

All required inputs are gathered up front in Step 2 (and the workflow definition is fetched and parsed in Steps 3–4). Once Step 2's questions are answered, **execute Steps 3–13 to completion without asking the user for permission or confirmation** — no "does this look right? (yes/no)", no "should I write this file?", no "ok to proceed?". Show the parsed inputs/`startName`/`workflowMapping` as an informational summary while continuing, not as a gate. Only stop for a hard blocker: an auth/API error, a 404 you can't resolve via the troubleshooting steps, or a TypeScript error.

## Secrets Handling — Developer Access Token

The Developer Access Token (Q2) must never be written into any project file or committed. Store it only in a temp directory outside the repo, read it from there for the API calls in this skill, and delete the directory once the skill finishes.

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

**At the end of the skill (Step 13), clean up the temp dir using whichever variant was used above.**

---

## Step 1 — Confirm Prerequisites

```bash
# Locate manifest.json — public/manifest.json for create-dovite, manifest.json for legacy CRA
cat public/manifest.json 2>/dev/null || cat manifest.json || echo "NOT_FOUND"

# Confirm curl
curl --version | head -1
```

If `NOT_FOUND`, stop and tell the user:
> "Your project is not set up yet. Please run `/domo-create-react-app` first."

Set `<manifest-path>` to whichever file exists.

**Also check for the stray `fileName` field now** — if the manifest contains `"fileName": "manifest.json"`, remove it immediately before making any other edits:
```bash
node -e "
const fs = require('fs');
const p = fs.existsSync('public/manifest.json') ? 'public/manifest.json' : 'manifest.json';
const m = JSON.parse(fs.readFileSync(p, 'utf8'));
if (m.fileName) {
  delete m.fileName;
  fs.writeFileSync(p, JSON.stringify(m, null, 2));
  console.log('✅ Removed stray fileName field from', p);
} else {
  console.log('✅ No stray fileName field found');
}
"
```

---

## Step 2 — Gather Requirements (One at a Time, Always Suggest)

Ask each question one at a time. Wait for the answer. Never assume.

**Once all questions below are answered, execute Steps 3–13 to completion without further questions or confirmations** (see Autonomous Execution above). Only interrupt for a hard blocker (auth error, failed API call, TypeScript error).

---

**Q1 — Domo Instance Hostname**
> "What is your Domo instance hostname?
>
> **Example:** `gwcteq-partner.domo.com`
>
> Just the hostname — no `https://`, no trailing slash."

Set internally:
```bash
export DOMO_INSTANCE_HOST="<hostname-from-user>"
export DOMO_INSTANCE="https://${DOMO_INSTANCE_HOST}"
```

---

**Q2 — Developer Access Token** *(stored only in a temp dir, never in the repo)*
> "Please provide your **Domo Developer Access Token**.
>
> To generate one: Domo → **Admin Settings → Authentication → Access Tokens** → Generate Token
>
> Used only for this session's API calls — stored in a temp directory and deleted when this skill finishes."

```bash
DOMO_SECRET_DIR=$(mktemp -d)
chmod 700 "$DOMO_SECRET_DIR"
printf '%s' "<token-from-user>" > "$DOMO_SECRET_DIR/dev_token"
```

---

**Q3 — Workflow ID**
> "What is the **Workflow ID** (model ID) of the workflow you want to integrate?
>
> Find it in the Domo Workflows URL:
> `https://gwcteq-partner.domo.com/workflows/models/<workflowId>/...`"

```bash
export WORKFLOW_ID="<workflowId-from-user>"
```

---

**Q4 — Version Number**
> "Which **version number** of this workflow should be used?
>
> Find it in the workflow's version history tab (e.g. `1.0.0`, `1.0.5`)."

```bash
export VERSION_NUMBER="<versionNumber-from-user>"
```

---

## Step 3 — Fetch the Workflow Definition

```bash
curl --silent --request GET \
  "${DOMO_INSTANCE}/api/workflow/v2/models/${WORKFLOW_ID}/versions/${VERSION_NUMBER}/definition" \
  --header "Content-Type: application/json;charset=utf-8" \
  --header "X-DOMO-Developer-Token: $(cat "$DOMO_SECRET_DIR/dev_token")" \
  | tee /tmp/workflow-definition.json
```

Then parse the rootNode and extract the `startName` and inputs:

```bash
node -e "
const fs = require('fs');
const raw = fs.readFileSync('/tmp/workflow-definition.json', 'utf8');
let j;
try { j = JSON.parse(raw); } catch(e) { console.error('NOT JSON:', raw.slice(0,300)); process.exit(1); }

const root = (j.designElements || []).find(el => el.type === 'rootNode' || el.id === 'rootNode');
if (!root) { console.error('rootNode not found in definition'); process.exit(1); }

console.log('=== WORKFLOW DEFINITION ===');
console.log('rootNode.data.title (startName):', root.data?.title ?? '(not found)');
console.log('rootNode inputs:', JSON.stringify(root.data?.input ?? [], null, 2));
"
```

**Error handling:**
- `401 Unauthorized` → token invalid/expired — ask user to regenerate from Domo Admin
- `403 Forbidden` → token user lacks access to this workflow
- `404 Not Found` → wrong `workflowId` or `versionNumber` — re-confirm with user
- Non-JSON response → print raw body, stop and show the user

**Checkpoint — do not proceed until:**
- `/tmp/workflow-definition.json` is valid JSON
- `rootNode` element is found
- `rootNode.data.title` is extracted — this becomes `startName`

---

## Step 4 — Parse the rootNode and Extract startName

### startName — CRITICAL

The `rootNode.data.title` value is the **`startName`** — the exact string that must go into the `workflowMapping` entry in `manifest.json`. This is how Domo's proxy matches the trigger to the correct Start node in the workflow.

**Missing or wrong `startName` → 404 with `toe` trace ID at runtime**, even when:
- The workflow exists in Domo ✅
- The alias is correct ✅
- The manifest is otherwise valid ✅
- The same payload works via direct API call with a developer token ✅

This is a known Domo proxy behaviour — the `startName` field is undocumented in most guides but required.

The `startName` is typically `"Start <WorkflowName>"` by default. Read it from `rootNode.data.title` — never guess it.

### Input parameters

For each entry in `rootNode.data.input` where `flag === "input"`:
- `required === true` or `value === null` → app must supply this value
- `value` is non-null → has a default, optional to override

Show the user a summary, then continue immediately — this is informational, not a confirmation gate:

```
=== WORKFLOW SUMMARY ===
startName (rootNode.data.title): "Start StoryTeller"

Required start inputs:
  | paramName | dataType | isList | required |
  |-----------|----------|--------|----------|
  | story     | text     | false  | true     |

Writing workflowMapping with startName: "Start StoryTeller" to manifest.json.
```

If `rootNode.data.input` is empty, tell the user:
> "This workflow's Start node takes no inputs — it will be triggered with an empty `data: {}` payload."

---

## Step 5 — Write `workflowMapping` into manifest.json

### Field: `workflowMapping` (singular — matches official Domo manifest docs)

The correct manifest key is **`workflowMapping`** (singular) as shown in the official Domo manifest documentation. Each entry requires:
- `alias` — internal reference name used in `domo.post('/domo/workflow/v1/models/<alias>/start', ...)`
- `startName` — **must exactly match `rootNode.data.title`** from Step 3/4 — this is what prevents the 404
- `parameters` — input parameter definitions

Ask the user for an alias:
> "What alias should this workflow be referenced by in the app?
>
> **Suggestions:**
> - `workflow1` — generic first workflow
> - `storyTeller` — descriptive of this workflow's purpose
> - Use camelCase, no spaces"

Map each `rootNode.data.input` entry using this type conversion table:

| Definition `dataType` | manifest `type` |
|---|---|
| `text` | `string` |
| `number` | `number` |
| `boolean` | `boolean` |
| `object` | `object` |
| `date` / `datetime` | `date` |

Read `<manifest-path>` first, then edit it directly to add (or merge into existing) `workflowMapping`:

```json
"workflowMapping": [
  {
    "alias": "<alias-from-user>",
    "startName": "<rootNode.data.title — exact string>",
    "parameters": [
      {
        "aliasedName": "story",
        "type": "string",
        "list": false,
        "children": null
      }
    ]
  }
]
```

### Editing rules
- **`workflowMapping`** (singular) is the correct key per official Domo manifest docs
- **`startName` is mandatory** — never omit it, never guess it — always use `rootNode.data.title` from the fetched definition
- If `workflowMapping` already exists → append a new entry, do NOT remove existing ones
- If `workflowMapping` does not exist → add it as a top-level key alongside `datasetsMapping`, `collections`, etc.
- Never invent extra parameters — only those present in `rootNode.data.input`
- Never write the developer token or workflow credentials into the manifest

### Also remove stray `fileName` field if present
```bash
node -e "
const fs = require('fs');
const p = fs.existsSync('public/manifest.json') ? 'public/manifest.json' : 'manifest.json';
const m = JSON.parse(fs.readFileSync(p, 'utf8'));
if (m.fileName) { delete m.fileName; fs.writeFileSync(p, JSON.stringify(m, null, 2)); console.log('Removed stray fileName'); }
else console.log('No stray fileName');
"
```

---

## Step 6 — Ask How the Workflow Should Be Triggered

Ask:
> "How should this workflow be triggered in the app?
>
> **A) Manual — Button** *(recommended for user-initiated actions)*
> A button the user clicks. Shows a loading state and toast on success/failure.
>
> **B) Automatic — On Page Load**
> Fires once when the relevant component mounts.
>
> **C) Automatic — Condition-Based**
> Fires when a value crosses a threshold or state changes (e.g. 'when priority changes to urgent', 'when issueCount > 20').
>
> **D) Automatic — Interval**
> Fires on a recurring timer (e.g. every 5 minutes)."

If **C**, ask:
> "Describe the exact condition — which value to watch, what comparison, and the threshold."

If **D**, ask:
> "What interval? (e.g. 30 seconds, 5 minutes, 1 hour)"

---

## Step 7 — Map Required Inputs to App Data

For each required input from Step 4:
> "The workflow needs: `<paramName: dataType>`. Where does this value come from in the app — an existing state field, a form the user fills in, or a fixed constant?"

If no clear source exists, propose adding a small form using installed shadcn components (`input`, `textarea`, `select` — install if missing).

---

## Step 8 — Create the Workflow API Helper

Create `src/API/workflowAPI.ts`:

```ts
// src/API/workflowAPI.ts
// MESSAGE_NAME must exactly match rootNode.data.title from the workflow definition.
// Wrong or missing MESSAGE_NAME → 404 with toe trace ID at runtime.
const WORKFLOW_ALIAS = "<alias-from-user>";
const MESSAGE_NAME = "<rootNode.data.title — exact string from definition>";

export interface WorkflowStartData {
  // Replace index signature with explicit fields once inputs are known:
  // story: string;
  [key: string]: string | number | boolean;
}

const WorkflowApi = {
  /**
   * Start the workflow. Resolves on HTTP 200 — there is no execution-status
   * polling. A 200 response means "workflow run success".
   * The proxy rewrites /domo/workflow/v1/models/<alias>/start → Domo backend,
   * injecting auth automatically. The alias must match workflowMapping in manifest.json.
   */
  async start(data: WorkflowStartData): Promise<void> {
    const response = await fetch(
      `/domo/workflow/v1/models/${WORKFLOW_ALIAS}/start`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Workflow start failed (${response.status}): ${body}`);
    }
  },
};

export default WorkflowApi;
```

**Notes:**
- The trigger endpoint is `/domo/workflow/v1/models/<alias>/start` — uses the **alias** from `workflowMapping`, not the workflow ID
- `MESSAGE_NAME` is documented here for reference but the `/models/<alias>/start` endpoint uses the `startName` from the manifest to route internally — you do not pass `messageName` in the POST body for this endpoint
- The proxy requires `proxyId` to be set in manifest.json and the app to be published at least once before this endpoint works locally
- **No execution-status polling.** A `200` response from `/start` is treated as "workflow run success" — show that to the user immediately. Do not call any `/domo/workflow/v2/executions*` endpoint; it is not in the app proxy's allowlist and always 404s.

### Verify with curl before wiring UI

```bash
# Test start — body is just the input data object, no messageName/modelId needed
# A 200 response means the workflow run succeeded — nothing further to check.
curl --silent --request POST \
  "${DOMO_INSTANCE}/api/workflow/v1/models/${WORKFLOW_ALIAS}/start" \
  --header "Content-Type: application/json" \
  --header "X-DOMO-Developer-Token: $(cat "$DOMO_SECRET_DIR/dev_token")" \
  --data '{ "story": "test story value" }'
```

If the start call returns 404 with a `toe` trace ID:
1. Check `startName` in `workflowMapping` matches `rootNode.data.title` exactly
2. Check the manifest key is `workflowMapping` (singular)
3. Check `proxyId` is set and app has been published
4. Check the card has been wired to the workflow in the Domo wiring screen

---

## Step 9 — Implement the Chosen Trigger

### A) Manual — Button

```tsx
// src/components/<Feature>/WorkflowButton.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import WorkflowApi from "@/API/workflowAPI";
import type { WorkflowStartData } from "@/API/workflowAPI";

interface WorkflowButtonProps {
  data: WorkflowStartData;
  label?: string;
}

export function WorkflowButton({ data, label = "Run Workflow" }: WorkflowButtonProps) {
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = async () => {
    setIsRunning(true);
    try {
      await WorkflowApi.start(data);
      toast.success("Workflow run success");
    } catch (err) {
      toast.error("Failed to start workflow");
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Button onClick={handleRun} disabled={isRunning}>
      {isRunning ? "Running..." : label}
    </Button>
  );
}
```

### B) Automatic — On Page Load

```tsx
useEffect(() => {
  WorkflowApi.start(data).catch((err) => console.error("Workflow start failed:", err));
}, []); // empty deps — fires once on mount
```

### C) Automatic — Condition-Based

Create `src/hooks/useWorkflowTrigger.ts`:

```ts
import { useEffect, useRef } from "react";
import WorkflowApi, { type WorkflowStartData } from "@/API/workflowAPI";

/**
 * Fires the workflow once each time `condition` transitions from false → true.
 * Uses a ref to avoid re-firing on every render.
 */
export function useWorkflowTrigger(condition: boolean, data: WorkflowStartData) {
  const wasTrue = useRef(false);

  useEffect(() => {
    if (condition && !wasTrue.current) {
      WorkflowApi.start(data).catch((err) =>
        console.error("Workflow trigger failed:", err)
      );
    }
    wasTrue.current = condition;
  }, [condition]); // only re-run when condition changes
}
```

Usage:
```tsx
// Fires when issue priority becomes "urgent"
useWorkflowTrigger(issue.priority === "urgent", { story: issue.description });
```

### D) Automatic — Interval

Create `src/hooks/useWorkflowInterval.ts`:

```ts
import { useEffect, useRef } from "react";
import WorkflowApi, { type WorkflowStartData } from "@/API/workflowAPI";

export function useWorkflowInterval(
  getData: () => WorkflowStartData,
  intervalMs: number,
  enabled = true
) {
  const getDataRef = useRef(getData);
  getDataRef.current = getData;

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      WorkflowApi.start(getDataRef.current()).catch((err) =>
        console.error("Workflow interval failed:", err)
      );
    }, intervalMs);
    return () => clearInterval(id); // cleanup on unmount
  }, [intervalMs, enabled]);
}
```

---

## Step 10 — Wire Into the App and Wiring Screen

Place the new component/hook where the user specified. Keep files within 150–200 lines — split if needed.

### After publishing — complete the Domo Wiring Screen

> ⚠️ **Required step after publishing:** The workflow must be wired to the card in Domo's wiring screen or it will 404 at runtime.
>
> 1. Publish the app: `yarn upload`
> 2. In Domo, open the card → Edit → Wiring
> 3. Under **Workflows**, you will see the alias from `workflowMapping`
> 4. Click **Select Workflow** and choose the workflow
> 5. Choose the correct version
> 6. Map the input parameters
> 7. Click **Save and Finish**

Without completing the wiring screen, Domo doesn't know which actual workflow instance the alias refers to — the proxy call will 404 even with a correct manifest.

---

## Step 11 — Validate manifest.json

```bash
node -e "
const fs = require('fs');
const p = fs.existsSync('public/manifest.json') ? 'public/manifest.json' : 'manifest.json';
let m;
try { m = JSON.parse(fs.readFileSync(p, 'utf8')); }
catch(e) { console.error('❌ Invalid JSON:', e.message); process.exit(1); }

const errs = [];
const warns = [];

if (!m.name)    errs.push('missing name');
if (!m.version) errs.push('missing version');
if (!m.size)    errs.push('missing size');
if (m.fileName) warns.push('stray fileName field present — remove it');

const wf = m.workflowMapping;
if (!Array.isArray(wf) || wf.length === 0) {
  errs.push('workflowMapping is empty or missing');
} else {
  wf.forEach((w, i) => {
    if (!w.alias)     errs.push('workflowMapping['+i+'] missing alias');
    if (!w.startName) errs.push('workflowMapping['+i+'] missing startName — this WILL cause a 404 toe error at runtime');
    if (!Array.isArray(w.parameters)) errs.push('workflowMapping['+i+'] missing parameters array');
    console.log('workflowMapping['+i+']: alias='+w.alias+' startName='+w.startName);
  });
}

if (!m.proxyId || m.proxyId === 'REPLACE_AFTER_FIRST_PUBLISH')
  warns.push('proxyId missing or placeholder — workflow local dev will not work until proxyId is set');

if (errs.length) { console.error('❌ Errors:\\n' + errs.map(e=>'  • '+e).join('\\n')); process.exit(1); }
warns.forEach(w => console.warn('⚠️  ' + w));
console.log('✅ manifest.json OK');
"
```

**If `startName` is missing**, re-fetch the definition (Step 3) and copy `rootNode.data.title` exactly.

---

## Step 12 — Type-Check and Smoke Test

```bash
npx tsc --noEmit 2>&1 | head -50
yarn dev
```

Confirm:
- No TypeScript errors
- `manifest.json` valid with `workflowMapping` containing `startName`
- Trigger component renders or hook compiles cleanly
- No `Cannot find module` errors

If the workflow endpoint can't be verified locally, tell the user:
> "The trigger is wired up. It requires `proxyId` to be set and the card wired in Domo's wiring screen before it will work. Run `/domo-publish` to deploy, then complete the wiring screen."

---

## Step 13 — Clean Up Secrets and Summarize

Delete the temp secrets directory created in Step 2 (use the variant matching the shell used to create it):

```bash
rm -rf "$DOMO_SECRET_DIR"
```
```powershell
Remove-Item -Recurse -Force $DOMO_SECRET_DIR
```

Print:
1. **Workflow**: `rootNode.data.title` (= `startName`), workflow ID, version
2. **workflowMapping written**: alias + startName + parameters
3. **Required inputs mapped**: paramName → data source
4. **Trigger type**: A/B/C/D and file/component location
5. **Files created/edited**: `<manifest-path>`, `src/API/workflowAPI.ts`, any hooks/components
6. **Wiring screen reminder**: must wire the card in Domo after publish
7. **Next step**: `yarn upload` → complete wiring screen → test
8. **Security**: Developer Access Token was stored only in a temp directory, never written to a project file — the temp directory has been deleted

---

## Reference

### manifest.json workflowMapping — complete example

```json
"workflowMapping": [
  {
    "alias": "storyTeller",
    "startName": "Start StoryTeller",
    "parameters": [
      {
        "aliasedName": "story",
        "type": "string",
        "list": false,
        "children": null
      }
    ]
  }
]
```

**`startName` is the single most important field.** It must match `rootNode.data.title` exactly — character for character, including capitalisation and spaces.

### Trigger endpoint

```
POST /domo/workflow/v1/models/<alias>/start
Body: { "story": "value" }   ← just the input data, no messageName/modelId
```

The proxy maps `<alias>` → the wired workflow using `workflowMapping` + `startName` + the wiring screen configuration.

### No execution-status polling

A `200` response from `/domo/workflow/v1/models/<alias>/start` is treated as **"workflow run success"** — show that to the user immediately, nothing further to check. Do not call `/domo/workflow/v2/executions*` (single or list) — neither is in the app proxy's allowlist and both 404.

---

## Troubleshooting

**`{"status":404,"statusReason":"Not Found","toe":"..."}` from `/domo/workflow/v1/models/<alias>/start`**

This is the most common error. Work through this checklist in order:

1. ✅ `workflowMapping` key is spelled correctly (singular, not `workflowsMapping`)
2. ✅ `startName` is present in the manifest entry — this is the #1 cause of 404 toe errors
3. ✅ `startName` exactly matches `rootNode.data.title` from the definition API (capital letters, spaces, all)
4. ✅ `proxyId` is set in manifest.json and is not a placeholder
5. ✅ App has been published at least once after the manifest was last edited
6. ✅ The card has been wired to the workflow in the Domo wiring screen
7. ✅ `stray "fileName"` field has been removed from manifest.json

If all 7 are confirmed and it still 404s — re-fetch the definition and confirm `rootNode.data.title` hasn't changed (it changes if the workflow's Start node was renamed).

**`401 Unauthorized` fetching definition**
Regenerate token from Domo Admin → Authentication → Access Tokens.

**`404 Not Found` fetching definition**
Wrong `workflowId` or `versionNumber` — copy directly from the Workflows URL.

**TypeScript error on `WorkflowStartData`**
Replace the index signature with explicit named fields matching the workflow's `paramName`s:
```ts
export interface WorkflowStartData {
  story: string;  // replace with actual param names from rootNode.data.input
}
```