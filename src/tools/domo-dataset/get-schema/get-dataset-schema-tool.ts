import { z } from "zod";
import { getDatasetSchema } from "./get-dataset-schema.js";

export const getDatasetSchemaTool = {
    name: "get_dataset_schema",
    definition: {
        title: "Get Dataset Schema",
        description: "Retrieves the indexed schema of a Domo dataset, including column names, types, visibility, and order. Useful before constructing SQL queries against the dataset, since it reveals the exact column identifiers to use.",
        inputSchema: z.object({
            domo_api_token: z.string().describe("Domo Developer Token"),
            datasetId: z.string().describe("ID of the dataset whose schema to retrieve"),
            includeHidden: z.boolean().optional().describe("Whether to include hidden columns in the response. Defaults to false."),
        })
    },
    handler: async ({ domo_api_token, datasetId, includeHidden }: any) => {
        const result = await getDatasetSchema(domo_api_token, datasetId, includeHidden);
        return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }]
        };
    }
} as const;