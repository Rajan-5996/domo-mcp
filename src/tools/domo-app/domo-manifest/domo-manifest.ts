import { promises as fs } from 'fs';
import path from 'path';

/**
 * Represents the standard response format for all manifest edit operations.
 */
export interface ManifestEditResult {
    success: boolean;
    manifestPath?: string;
    manifest?: Record<string, any>;
    changedKeys?: string[];
    backupPath?: string;
    error?: string;
    stage?: string;
}

/** Shape of the partial updates a caller can request. */
export interface ManifestUpdates {
    name?: string;
    version?: string;
    fullpage?: boolean;
    size?: { width: number; height: number };
    datasetsMapping?: Array<{
        alias: string;
        dataSetId: string;
        fields?: Array<{ alias: string; columnName: string }>;
    }>;
    collections?: Array<{
        name: string;
        schema?: { columns: Array<{ name: string; type: string }> };
        syncEnabled?: boolean;
    }>;
    workflowMapping?: Array<{ alias: string; parameters?: any[] }>;
    packageMapping?: Array<{ alias: string; parameters?: any[]; output?: any }>;
    ignore?: string[];
    proxyId?: string;
    /**
     * If true (default), array-valued properties (datasetsMapping, collections,
     * workflowMapping, packageMapping) are merged entry-by-entry using their
     * natural key (`alias` or `name`) instead of being wholesale replaced.
     */
    mergeArrays?: boolean;
}

const MERGE_KEY_BY_PROPERTY: Record<string, 'alias' | 'name'> = {
    datasetsMapping: 'alias',
    collections: 'name',
    workflowMapping: 'alias',
    packageMapping: 'alias',
};

/**
 * Locates manifest.json for a Domo App Design.
 *
 * Per the Domo App Framework spec, manifest.json belongs in the base
 * directory of the App Design. In a Vite/React scaffold (todo-app/ with a
 * public/ folder), that resolves to `<root>/public/manifest.json`. If it
 * isn't there, falls back to a shallow recursive search so the tool still
 * works against non-standard layouts instead of failing outright.
 *
 * @param rootDir - Project root (e.g. the todo-app/ directory containing public/, src/, package.json)
 */
export async function findManifestFile(rootDir: string): Promise<ManifestEditResult> {
    const expectedPath = path.join(rootDir, 'public', 'manifest.json');

    try {
        await fs.access(expectedPath);
        return { success: true, manifestPath: expectedPath };
    } catch {
        // Not in the expected location — fall back to a bounded recursive search.
    }

    try {
        const found = await searchForManifest(rootDir, 4);
        if (found) {
            return { success: true, manifestPath: found };
        }
        return {
            success: false,
            stage: 'locate',
            error: `manifest.json not found in ${path.join(rootDir, 'public')} or anywhere under ${rootDir} (searched 4 levels deep).`,
        };
    } catch (error) {
        return { success: false, stage: 'locate', error: (error as Error).message };
    }
}

async function searchForManifest(dir: string, depthRemaining: number): Promise<string | null> {
    if (depthRemaining < 0) return null;

    let entries;
    try {
        entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
        return null;
    }

    for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        if (entry.isFile() && entry.name === 'manifest.json') {
            return path.join(dir, entry.name);
        }
    }

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        const nested = await searchForManifest(path.join(dir, entry.name), depthRemaining - 1);
        if (nested) return nested;
    }

    return null;
}

/** Reads and parses manifest.json from a known path. */
export async function readManifest(manifestPath: string): Promise<ManifestEditResult> {
    try {
        const raw = await fs.readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(raw);
        return { success: true, manifestPath, manifest };
    } catch (error) {
        return { success: false, manifestPath, stage: 'read', error: (error as Error).message };
    }
}

/**
 * Merges `updates` into `current`. Scalar/object properties (name, version,
 * size, fullpage, proxyId) overwrite. Array properties merge entry-by-entry
 * by their natural key unless `mergeArrays` is explicitly false.
 */
export function mergeManifest(
    current: Record<string, any>,
    updates: ManifestUpdates
): { manifest: Record<string, any>; changedKeys: string[] } {
    const next = { ...current };
    const changedKeys: string[] = [];
    const mergeArrays = updates.mergeArrays !== false;

    const scalarKeys = ['name', 'version', 'fullpage', 'size', 'proxyId', 'ignore'] as const;
    for (const key of scalarKeys) {
        if (updates[key] !== undefined) {
            next[key] = updates[key];
            changedKeys.push(key);
        }
    }

    for (const arrayKey of Object.keys(MERGE_KEY_BY_PROPERTY) as Array<keyof typeof MERGE_KEY_BY_PROPERTY>) {
        const incoming = (updates as any)[arrayKey] as any[] | undefined;
        if (!incoming) continue;

        if (!mergeArrays) {
            next[arrayKey] = incoming;
            changedKeys.push(arrayKey);
            continue;
        }

        const keyField = MERGE_KEY_BY_PROPERTY[arrayKey];
        const existing: any[] = Array.isArray(next[arrayKey]) ? [...next[arrayKey]] : [];

        for (const incomingEntry of incoming) {
            const idx = existing.findIndex((e) => e[keyField] === incomingEntry[keyField]);
            if (idx >= 0) {
                existing[idx] = { ...existing[idx], ...incomingEntry };
            } else {
                existing.push(incomingEntry);
            }
        }

        next[arrayKey] = existing;
        changedKeys.push(arrayKey);
    }

    return { manifest: next, changedKeys };
}

/** Writes the manifest back to disk, pretty-printed, with an optional .bak backup. */
export async function writeManifest(
    manifestPath: string,
    manifest: Record<string, any>,
    makeBackup = true
): Promise<ManifestEditResult> {
    try {
        if (makeBackup) {
            const backupPath = `${manifestPath}.bak`;
            await fs.copyFile(manifestPath, backupPath);
            const written = JSON.stringify(manifest, null, 2) + '\n';
            await fs.writeFile(manifestPath, written, 'utf-8');
            return { success: true, manifestPath, manifest, backupPath };
        }

        const written = JSON.stringify(manifest, null, 2) + '\n';
        await fs.writeFile(manifestPath, written, 'utf-8');
        return { success: true, manifestPath, manifest };
    } catch (error) {
        return { success: false, manifestPath, stage: 'write', error: (error as Error).message };
    }
}

/**
 * Full end-to-end flow: locate -> read -> merge -> write.
 *
 * @param rootDir - App project root (contains public/, src/, package.json)
 * @param updates - Partial manifest fields to add/update
 */
export async function editManifest(
    rootDir: string,
    updates: ManifestUpdates
): Promise<ManifestEditResult> {
    const located = await findManifestFile(rootDir);
    if (!located.success || !located.manifestPath) {
        return located;
    }

    const read = await readManifest(located.manifestPath);
    if (!read.success || !read.manifest) {
        return read;
    }

    const { manifest, changedKeys } = mergeManifest(read.manifest, updates);

    if (changedKeys.length === 0) {
        return {
            success: false,
            manifestPath: located.manifestPath,
            stage: 'merge',
            error: 'No recognized manifest fields were present in the requested updates.',
        };
    }

    const written = await writeManifest(located.manifestPath, manifest, true);
    if (!written.success) {
        return written;
    }

    return {
        success: true,
        manifestPath: located.manifestPath,
        manifest: written.manifest,
        changedKeys,
        backupPath: written.backupPath,
    };
}
