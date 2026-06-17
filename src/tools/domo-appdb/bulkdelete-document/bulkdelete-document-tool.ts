import { z } from "zod";
import { bulkDeleteDocuments } from "./bulkdelete-document.js";

export const bulkDeleteDocumentsTool = {
    name: "bulk_delete_documents",
    definition: {
        title: "Bulk Delete Documents",
        description: "Permanently deletes multiple documents from a Domo AppDB collection in a single API request.",
        inputSchema: z.object({
            domo_api_token: z.string().describe("Domo Developer Token"),
            collectionId: z.string().describe("ID of the target AppDB collection"),
            documentIds: z.array(z.string()).describe("Array of document IDs to permanently delete"),
        })
    },
    handler: async ({ domo_api_token, collectionId, documentIds }: any) => {
        const result = await bulkDeleteDocuments(domo_api_token, collectionId, documentIds);
        return {
            content: [{ type: "text", text: JSON.stringify(result) }]
        };
    }
} as const;
