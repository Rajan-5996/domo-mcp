import { z } from "zod";
import { getDatasetSchemaLatest } from "./get-latest-schema.js";

export const getDatasetSchemaLatestTool = {
    name: "get_dataset_schema_latest",
    definition: {
        title: "Get Latest Dataset Schema",
        description: "Retrieves the latest authoritative schema for a Domo dataset, including column metadata (label, format, encryption status). This reflects the dataset's current defined structure — distinct from the indexed/query-engine schema, which can lag behind after recent schema changes. Use this before calling alter_dataset_schema to get the full current state to merge changes into.",
        inputSchema: z.object({
            domo_api_token: z.string().describe("Domo Developer Token"),
            datasetId: z.string().describe("ID of the dataset whose latest schema to retrieve"),
        })
    },
    handler: async ({ domo_api_token, datasetId }: any) => {
        const result = await getDatasetSchemaLatest(domo_api_token, datasetId);
        return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }]
        };
    }
} as const;
