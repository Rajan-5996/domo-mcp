import { z } from "zod";
import { updateCollectionSchema } from "./update-collection-schema.js";

const columnTypeEnum = z.enum(["STRING", "LONG", "DECIMAL", "DOUBLE", "DATE", "DATETIME"]);

export const updateCollectionSchemaTool = {
    name: "update_collection_schema",
    definition: {
        title: "Update Collection Schema",
        description: "Updates the schema of an existing Domo AppDB collection (PUT semantics — full schema replacement). Optionally enables syncing to a Domo dataset for use in cards and dashboards.",
        inputSchema: z.object({
            domo_api_token: z.string().describe("Domo Developer Token"),
            collectionId: z.string().describe("ID of the collection whose schema is being updated"),
            schema: z.object({
                schema: z.object({
                    columns: z.array(z.object({
                        name: z.string().describe("Field name as it appears in stored documents"),
                        type: columnTypeEnum.describe("Domo column data type: STRING | LONG | DECIMAL | DOUBLE | DATE | DATETIME"),
                        visible: z.boolean().optional().describe("Whether this column is exposed in Domo's UI (default: true)")
                    })).describe("Column definitions — must include ALL columns the collection should have")
                }),
                syncEnabled: z.boolean().optional().describe("When true, Domo mirrors this collection into a dataset for cards and Beast Modes")
            }).describe("Full replacement schema request")
        })
    },
    handler: async ({ domo_api_token, collectionId, schema }: any) => {
        const result = await updateCollectionSchema(domo_api_token, collectionId, schema);
        return {
            content: [{ type: "text", text: JSON.stringify(result) }]
        };
    }
} as const;
