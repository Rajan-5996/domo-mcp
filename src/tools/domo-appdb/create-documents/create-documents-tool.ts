import { z } from "zod";
import { createDocument } from "./create-documents.js";

export const createDocumentTool = {
    name: "create_document",
    definition: {
        title: "Create Document",
        description: "Creates a new document inside a Domo AppDB collection.",
        inputSchema: z.object({
            domo_api_token: z.string().describe("Domo Developer Token"),
            collectionId: z.string().describe("ID of the target AppDB collection"),
            content: z.object({
                content: z.object({}).passthrough().describe("Document payload matching the collection schema")
            }).describe("Document content object")
        })
    },
    handler: async ({ domo_api_token, collectionId, content }: any) => {
        const result = await createDocument(domo_api_token, collectionId, content);
        return {
            content: [{ type: "text", text: JSON.stringify(result) }]
        };
    }
} as const;
