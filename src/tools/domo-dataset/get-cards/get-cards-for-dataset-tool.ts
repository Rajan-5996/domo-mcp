import { z } from "zod";
import { getCardsForDataset } from "./get-cards-for-dataset.js";

export const getCardsForDatasetTool = {
    name: "get_cards_for_dataset",
    definition: {
        title: "Get Cards For Dataset",
        description: "Retrieves all Domo cards (charts, tables, metrics, custom apps) associated with a specific dataset. Optionally includes drill-path child cards.",
        inputSchema: z.object({
            domo_api_token: z.string().describe("Domo Developer Token"),
            datasetId: z.string().describe("ID of the Domo dataset whose cards should be retrieved"),
            drill: z.boolean().default(true).describe("Whether to include drill-path child cards in the response"),
        })
    },
    handler: async ({ domo_api_token, datasetId, drill }: any) => {
        const result = await getCardsForDataset(domo_api_token, datasetId, drill);
        return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }]
        };
    }
} as const;
