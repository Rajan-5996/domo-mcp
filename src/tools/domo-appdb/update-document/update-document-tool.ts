import { z } from "zod";
import { updateDocument } from "./update-document.js";

export const updateDocumentTool = {
    name: "update_document",
    definition: {
        title: "Update Document",
        description: "Replaces the full content of an existing Domo AppDB document (PUT semantics — all fields must be supplied, omitted fields are removed).",
        inputSchema: z.object({
            domo_api_token: z.string().describe("Domo Developer Token"),
            collectionId: z.string().describe("ID of the parent AppDB collection"),
            documentId: z.string().describe("System-assigned ID of the document to update"),
            update: z.object({
                content: z.object({}).passthrough().describe("Full replacement document payload — must include all fields")
            }).describe("Complete document replacement payload")
        })
    },
    handler: async ({ domo_api_token, collectionId, documentId, update }: any) => {
        const result = await updateDocument(domo_api_token, collectionId, documentId, update);
        return {
            content: [{ type: "text", text: JSON.stringify(result) }]
        };
    }
} as const;
