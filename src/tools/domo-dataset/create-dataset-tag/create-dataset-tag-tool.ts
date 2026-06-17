import { z } from "zod";
import { createDatasetTag } from "./create-dataset-tag.js";

export const createDatasetTagTool = {
    name: "create_dataset_tag",
    definition: {
        title: "Create Dataset Tag",
        description: "Adds one or more tags to an existing Domo dataset for organization and discovery. Tags are plain string labels, unrelated to the dataset's column schema. This is a low-risk additive operation — no schema or row data is affected.",
        inputSchema: z.object({
            domo_api_token: z.string().describe("Domo Developer Token"),
            datasetId: z.string().describe("ID of the existing dataset to tag"),
            tags: z.array(z.string()).min(1).describe("Array of tag strings to add, e.g. ['tag1', 'tag2']"),
        })
    },
    handler: async ({ domo_api_token, datasetId, tags }: any) => {
        const result = await createDatasetTag(domo_api_token, datasetId, tags);
        return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }]
        };
    }
} as const;
