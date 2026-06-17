import { z } from "zod";
import { getDocument } from "./get-documents.js";

export const getDocumentTool = {
    name: "get_document",
    definition: {
        title: "Get Document",
        description: "Retrieves a single document from a Domo AppDB collection by its ID.",
        inputSchema: z.object({
            domo_api_token: z.string().describe("Domo Developer Token"),
            collectionId: z.string().describe("ID of the parent AppDB collection"),
            documentId: z.string().describe("System-assigned ID of the document to retrieve"),
        })
    },
    handler: async ({ domo_api_token, collectionId, documentId }: any) => {
        const result = await getDocument(domo_api_token, collectionId, documentId);
        return {
            content: [{ type: "text", text: JSON.stringify(result) }]
        };
    }
} as const;
