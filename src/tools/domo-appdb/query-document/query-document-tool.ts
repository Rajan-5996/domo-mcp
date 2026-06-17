import { z } from "zod";
import { queryDocument } from "./query-document.js";

export const queryDocumentTool = {
    name: "query_document",
    definition: {
        title: "Query Document",
        description: "Queries an AppDB collection using MongoDB-style filter expressions. Fields must be dot-notated content paths prefixed with `content.`",
        inputSchema: z.object({
            domo_api_token: z.string().describe("Domo Developer Token"),
            collectionId: z.string().describe("ID of the target AppDB collection"),
            filter: z.object({}).passthrough().describe(
                "MongoDB-style filter object. Keys are dot-notated content paths (e.g. 'content.stage'), values are operator objects (e.g. { '$eq': 'Proposal' })"
            ),
        })
    },
    handler: async ({ domo_api_token, collectionId, filter }: any) => {
        const result = await queryDocument(domo_api_token, collectionId, filter);
        return {
            content: [{ type: "text", text: JSON.stringify(result) }]
        };
    }
} as const;
