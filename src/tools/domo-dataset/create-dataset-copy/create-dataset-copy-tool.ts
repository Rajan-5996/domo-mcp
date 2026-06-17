import { z } from "zod";
import { createDatasetCopy } from "./create-dataset-copy.js";

const columnSchema = z.object({
    name: z.string().describe("Column name"),
    type: z.enum(["STRING", "LONG", "DOUBLE", "DATE", "DATETIME"]).describe("Column data type"),
    id: z.string().optional().describe("Optional column ID, typically carried over when copying from an existing dataset's schema"),
    visible: z.boolean().optional().describe("Whether the column is visible. Defaults to true."),
    order: z.number().optional().describe("Display order of the column"),
});

export const createDatasetCopyTool = {
    name: "create_dataset_copy",
    definition: {
        title: "Create Dataset Copy",
        description: "Creates a new Domo dataset by defining a column schema, typically copied from an existing dataset's structure (via get_dataset_schema_latest) or defined fresh. The new dataset is created empty and independent of any source dataset — it must be loaded with rows and indexed before it can be queried.",
        inputSchema: z.object({
            domo_api_token: z.string().describe("Domo Developer Token"),
            dataSourceName: z.string().describe("Name for the new dataset, e.g. 'hello world'"),
            columns: z.array(columnSchema).min(1).describe("Array of column definitions, typically copied from an existing dataset's schema output. At least one column is required."),
            userDefinedType: z.string().optional().describe("Dataset type identifier. Defaults to 'api' for programmatically created datasets."),
        })
    },
    handler: async ({ domo_api_token, dataSourceName, columns, userDefinedType }: any) => {
        const result = await createDatasetCopy(domo_api_token, dataSourceName, columns, userDefinedType);
        return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }]
        };
    }
} as const;
