---
description: Build a React app and publish (push) it to the Domo platform — checks proxyId, builds with yarn, and uploads with yarn upload. Use this skill whenever the user wants to publish, deploy, push, upload, or release a Domo app.
argument-hint: [project-folder]
allowed-tools: Bash, Read, Edit
---

# Publish a React App to Domo

## Autonomous Execution

Once Step 1's proxyId question is answered (or skipped because it doesn't exist), run Steps 2–4 to completion without asking for permission — never ask "should I build now?", "can I run yarn upload?", "is it ok to edit the manifest?", etc. Only stop for a hard blocker (build failure, upload error you can't auto-resolve).

## Step 1 — Check proxyId

Locate and read the manifest:

```bash
cat public/manifest.json 2>/dev/null || cat manifest.json 2>/dev/null || echo "NOT_FOUND"
```

Set `<manifest-path>` to whichever path exists (`public/manifest.json` or `manifest.json`).

Check the `proxyId` field:

- **If `proxyId` exists and is set to a real value** (not missing, not `"REPLACE_AFTER_FIRST_PUBLISH"`):
  Ask the user: "This app already has a `proxyId` set (`<existing-value>`). Do you want to change it?"
  - If **yes** → ask for the new `<HASH>`, edit `<manifest-path>` to set `"proxyId": "<new-HASH>"`, verify by reading the file back.
  - If **no** → continue.

- **If `proxyId` is missing or `"REPLACE_AFTER_FIRST_PUBLISH"`**:
  Tell the user: "`proxyId` does not exist yet — continuing." Continue to Step 2.

---

## Step 2 — Build the App

```bash
yarn run build
```

- **If `yarn` is not found**, install it then retry:

```bash
npm install -g yarn
yarn run build
```

- **If the build fails because you're not in the project folder**, cd into it and retry:

```bash
cd <project-folder> && yarn run build
```

If the build fails for any other reason, show the full error to the user and stop.

---

## Step 3 — Push to Domo

```bash
yarn upload
```

- **If it fails because you're not in the project folder**, cd into it and retry:

```bash
cd <project-folder> && yarn upload
```

- **If it fails with `X Error uploading assets in the upload all assets`**, this is a known `domo` CLI bug uploading the Geist variable font binary asset. Fix it by removing the font import from `src/index.css`:

  1. Edit `src/index.css` and delete the line `@import "@fontsource-variable/geist";`
  2. Retry: `yarn upload`

---

## Step 4 — proxyId Follow-Up

If `proxyId` was missing or `"REPLACE_AFTER_FIRST_PUBLISH"` (from Step 1), tell the user:

> 🔑 **Now that the app is published, I need your `proxyId` for local AppDB/Workflow development:**
>
> 1. In Domo, open the page and create a card using the new design
> 2. Right-click the card → **Inspect Element**
> 3. Find the `<iframe>` whose `src` looks like `//<HASH>.domoapps.prodX.domo.com?userId=...`
> 4. Copy `<HASH>` — that is your `proxyId`
>
> Reply with the `<HASH>` once you have it — I'll wait.

**Wait for the user's reply.** Once provided:

1. Edit `<manifest-path>`: `"proxyId": "<HASH>"`
2. Verify by reading the file back
3. Tell the user: "✅ `proxyId` set to `<HASH>` in `<manifest-path>`."

This is the end of the skill.
