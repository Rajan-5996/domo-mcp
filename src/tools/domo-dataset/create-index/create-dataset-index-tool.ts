import { z } from "zod";
import { createIndexDataset } from "./create-dataset-index.js";

export const createDatasetIndexTool = {
    name: "create_dataset_index",
    definition: {
        title: "Create Dataset Index",
        description: "Triggers an asynchronous indexing job on a Domo dataset. Required for fast SQL querying and Beast Mode calculations. Returns an indexId to track progress via get_index_dataset_progress.",
        inputSchema: z.object({
            domo_api_token: z.string().describe("Domo Developer Token"),
            datasetId: z.string().describe("ID of the dataset to index"),
            dataIds: z.array(z.string()).default([]).describe("Specific row IDs to index. Pass empty array to index the entire dataset"),
        })
    },
    handler: async ({ domo_api_token, datasetId, dataIds }: any) => {
        const result = await createIndexDataset(domo_api_token, datasetId, dataIds);
        return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }]
        };
    }
} as const;