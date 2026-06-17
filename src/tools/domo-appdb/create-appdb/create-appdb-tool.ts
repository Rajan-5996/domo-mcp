import { z } from "zod";
import { createAppDB } from "./create-appdb.js";

export const createAppDBTool = {
    name: "create_appdb",
    definition: {
        title: "Create AppDB",
        description: "Creates a Domo AppDB datastore and collection.",
        inputSchema: z.object({
            domo_api_token: z.string().describe("Domo Developer Token"),
            datastore_name: z.string().describe("Name of the datastore"),
            appDb: z.object({
                name: z.string().describe("Name of the collection"),
                schema: z.object({
                    columns: z.array(z.object({
                        name: z.string(),
                        type: z.string(),
                    }))
                }),
                syncEnabled: z.boolean().describe("Whether the collection should sync to a dataset")
            }).describe("Collection schema and sync settings")
        })
    },
    handler: async ({ domo_api_token, datastore_name, appDb }: any) => {
        const result = await createAppDB(domo_api_token, datastore_name, appDb);
        return {
            content: [{ type: "text", text: JSON.stringify(result) }]
        };
    }
} as const;
