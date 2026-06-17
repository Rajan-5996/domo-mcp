import { z } from "zod";
import { deleteDocument } from "./delete-document.js";

export const deleteDocumentTool = {
    name: "delete_document",
    definition: {
        title: "Delete Document",
        description: "Permanently deletes a single document from a Domo AppDB collection.",
        inputSchema: z.object({
            domo_api_token: z.string().describe("Domo Developer Token"),
            collectionId: z.string().describe("ID of the parent AppDB collection"),
            documentId: z.string().describe("System-assigned ID of the document to delete"),
        })
    },
    handler: async ({ domo_api_token, collectionId, documentId }: any) => {
        const result = await deleteDocument(domo_api_token, collectionId, documentId);
        return {
            content: [{ type: "text", text: JSON.stringify(result) }]
        };
    }
} as const;
