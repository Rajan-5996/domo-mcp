import { z } from "zod";
import { alterDatasetSchema } from "./alter-dataset-schema.js";

const columnSchema = z.object({
    name: z.string().describe("Column name"),
    type: z.enum(["STRING", "LONG", "DOUBLE", "DATE", "DATETIME"]).describe("Column data type"),
    id: z.string().optional().describe("Column ID — should match an existing column's id when modifying it, to avoid creating a duplicate"),
    visible: z.boolean().optional().describe("Whether the column is visible. Defaults to true."),
    order: z.number().optional().describe("Display order of the column"),
});

export const alterDatasetSchemaTool = {
    name: "alter_dataset_schema",
    definition: {
        title: "Alter Dataset Schema",
        description: "Modifies the schema of an existing Domo dataset by adding or altering columns. This replaces the dataset's schema wholesale — columns omitted from the request may be dropped. Always fetch the current schema with get_dataset_schema_latest first and merge it with the requested changes before calling this tool, to avoid accidentally deleting existing columns.",
        inputSchema: z.object({
            domo_api_token: z.string().describe("Domo Developer/Session Token"),
            datasetId: z.string().describe("ID of the existing dataset whose schema to alter"),
            columns: z.array(columnSchema).min(1).describe("Full desired end-state array of column definitions. Should include both unchanged existing columns and new/altered ones — this is not a partial patch."),
        })
    },
    handler: async ({ domo_api_token, datasetId, columns }: any) => {
        const result = await alterDatasetSchema(domo_api_token, datasetId, columns);
        return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }]
        };
    }
} as const;