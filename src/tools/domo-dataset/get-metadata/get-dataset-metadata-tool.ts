import { z } from "zod";
import { getDatasetMetadata } from "./get-dataset-metadata.js";

export const getDatasetMetadataTool = {
    name: "get_dataset_metadata",
    definition: {
        title: "Get Dataset Metadata",
        description: "Retrieves detailed metadata for a Domo dataset including schema, column statistics, row count, file size, and lifecycle information.",
        inputSchema: z.object({
            domo_api_token: z.string().describe("Domo Developer Token"),
            datasetId: z.string().describe("ID of the Domo dataset to retrieve metadata for"),
        })
    },
    handler: async ({ domo_api_token, datasetId }: any) => {
        const result = await getDatasetMetadata(domo_api_token, datasetId);
        return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }]
        };
    }
} as const;