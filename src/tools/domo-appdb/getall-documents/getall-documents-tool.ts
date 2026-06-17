import { z } from "zod";
import { getAllDocuments } from "./getall-documents.js";

export const getAllDocumentsTool = {
    name: "get_all_documents",
    definition: {
        title: "Get All Documents",
        description: "Retrieves all documents stored in a Domo AppDB collection.",
        inputSchema: z.object({
            domo_api_token: z.string().describe("Domo Developer Token"),
            collectionId: z.string().describe("ID of the target AppDB collection"),
        })
    },
    handler: async ({ domo_api_token, collectionId }: any) => {
        const result = await getAllDocuments(domo_api_token, collectionId);
        return {
            content: [{ type: "text", text: JSON.stringify(result) }]
        };
    }
} as const;
