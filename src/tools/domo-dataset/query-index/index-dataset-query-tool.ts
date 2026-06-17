import { z } from "zod";
import { indexDatasetForQuery } from "./index-dataset-query.js";

export const indexDatasetForQueryTool = {
    name: "index_dataset_for_query",
    definition: {
        title: "Index Dataset For Query",
        description: "Indexes a Domo dataset via the query engine to make it available for SQL execution. Required after schema changes or data updates before any SQL query can run against the dataset.",
        inputSchema: z.object({
            domo_api_token: z.string().describe("Domo Developer Token"),
            datasetId: z.string().describe("ID of the dataset to index for querying"),
        })
    },
    handler: async ({ domo_api_token, datasetId }: any) => {
        const result = await indexDatasetForQuery(domo_api_token, datasetId);
        return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }]
        };
    }
} as const;