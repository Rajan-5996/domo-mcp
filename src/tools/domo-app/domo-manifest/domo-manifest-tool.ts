import { z } from "zod";
import { editManifest } from "./domo-manifest.js";

const fieldSchema = z.object({
    alias: z.string(),
    columnName: z.string(),
});

const datasetMappingSchema = z.object({
    alias: z.string().describe("Name used in code to refer to this DataSet, e.g. data/v1/<alias>"),
    dataSetId: z.string().describe("The DataSet's UUID, taken from its Domo URL"),
    fields: z.array(fieldSchema).optional().describe(
        "Column alias -> columnName mappings. Omit/empty to return all columns as-is."
    ),
});

const collectionSchema = z.object({
    name: z.string().describe("AppDB collection name"),
    schema: z
        .object({
            columns: z.array(z.object({ name: z.string(), type: z.string() })),
        })
        .optional(),
    syncEnabled: z.boolean().optional(),
});

const workflowMappingSchema = z.object({
    alias: z.string(),
    parameters: z.array(z.any()).optional(),
});

const packageMappingSchema = z.object({
    alias: z.string(),
    parameters: z.array(z.any()).optional(),
    output: z.any().optional(),
});

const inputSchema = z.object({
    root_dir: z.string().describe(
        "Absolute path to the app project root (the folder containing public/, src/, package.json)."
    ),
    name: z.string().optional().describe("App Design name"),
    version: z.string().optional().describe("Semantic version, e.g. 0.0.1"),
    fullpage: z.boolean().optional().describe("Whether the app should render in full-page mode"),
    size: z
        .object({
            width: z.number().min(0.5).max(6),
            height: z.number().min(0.5).max(6),
        })
        .optional()
        .describe("App card size on Domo's 1-6 grid scale"),
    datasetsMapping: z.array(datasetMappingSchema).optional().describe(
        "DataSets the app needs. Entries are merged by `alias` into any existing list."
    ),
    collections: z.array(collectionSchema).optional().describe(
        "AppDB collections the app needs. Entries are merged by `name`."
    ),
    workflowMapping: z.array(workflowMappingSchema).optional().describe(
        "Workflows the app needs. Entries are merged by `alias`."
    ),
    packageMapping: z.array(packageMappingSchema).optional().describe(
        "Code Engine packages the app needs. Entries are merged by `alias`."
    ),
    ignore: z.array(z.string()).optional().describe("Glob patterns for `domo publish` to ignore"),
    proxyId: z.string().optional().describe("Card proxyId, required for AppDB/Workflows/Code Engine"),
    replace_arrays: z.boolean().optional().describe(
        "If true, array fields (datasetsMapping/collections/workflowMapping/packageMapping) " +
        "fully replace the existing list instead of merging entry-by-entry. Default: false (merge)."
    ),
});

export const manifestEditTool = {
    name: "edit_manifest",
    definition: {
        title: "Edit Manifest",
        description:
            "Finds manifest.json inside an App Design's public/ folder (falling back to a recursive " +
            "search if it isn't there) and updates it with the given fields. Array properties " +
            "(datasetsMapping, collections, workflowMapping, packageMapping) are merged by their " +
            "natural key (alias/name) rather than overwritten, unless replace_arrays is set. " +
            "Writes a .bak backup of the original file before saving.",
        inputSchema,
    },
    /**
     * @agent
     *   COLLECT FROM USER BEFORE INVOKING:
     *   - `root_dir`         — the app project root, if not already known from context
     *   - whichever manifest fields the user actually wants changed; don't ask about
     *     fields they haven't mentioned, just omit them so they're left untouched
     *
     *   NOTES:
     *   - For datasetsMapping, ask for the DataSet's URL or ID if the user only names it,
     *     since `dataSetId` is required and isn't guessable.
     *   - collections/workflowMapping/packageMapping all require a `proxyId` in the
     *     manifest — if the user is adding one of these for the first time and no
     *     proxyId exists yet, flag that it'll be needed (see manifest skill: "Getting a proxyId").
     *   - Never invent a dataSetId, alias, or proxyId — ask if missing.
     */
    handler: async (args: z.infer<typeof inputSchema>) => {
        const { root_dir, replace_arrays, ...updates } = args;

        const result = await editManifest(root_dir, {
            ...updates,
            mergeArrays: !replace_arrays,
        });

        return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
    },
} as const;
