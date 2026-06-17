import { z } from "zod";
import { getIndexDatasetProgress } from "./index-dataset-progress.js";

export const getIndexDatasetProgressTool = {
    name: "get_index_dataset_progress",
    definition: {
        title: "Get Index Dataset Progress",
        description: "Retrieves the status of an asynchronous dataset indexing operation in Domo. Use this to poll progress after triggering an index job until it completes or fails.",
        inputSchema: z.object({
            domo_api_token: z.string().describe("Domo Developer Token"),
            datasetId: z.string().describe("ID of the dataset being indexed"),
            indexId: z.string().describe("ID of the indexing operation to check — returned from a prior index job response"),
        })
    },
    handler: async ({ domo_api_token, datasetId, indexId }: any) => {
        const result = await getIndexDatasetProgress(domo_api_token, datasetId, indexId);
        return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }]
        };
    }
} as const;