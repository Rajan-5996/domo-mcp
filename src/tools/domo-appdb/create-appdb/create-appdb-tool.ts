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
    /**
     * @agent
     *
     * PURPOSE:
     *   Creates a Domo AppDB datastore and a collection inside it.
     *   This is the entry point for all AppDB operations.
     *
     * APPDB CRUD CHAIN — STEP 1:
     *
     *   [1] create_appdb                    ← YOU ARE HERE
     *        ↓ (save the returned collectionId for all subsequent operations)
     *   [2] create_document                 — insert a new record into the collection
     *        ↓ (or)
     *   [2] get_all_documents               — fetch all records from the collection
     *        ↓ (or)
     *   [2] get_document                    — fetch a single record by documentId
     *        ↓ (or)
     *   [2] query_document                  — filter records by field value
     *        ↓ (after reading records, optionally)
     *   [3] update_document                 — replace a record's full content
     *        ↓ (or)
     *   [3] delete_document                 — remove a single record
     *        ↓ (or)
     *   [3] bulk_delete_documents           — remove multiple records at once
     *
     * WHEN TO SUGGEST NEXT TOOL:
     *   After the datastore + collection are created, suggest `create_document`
     *   to insert the first record, or `get_all_documents` to verify the collection.
     *   Save the returned `collectionId` — all other AppDB tools require it.
     */
    handler: async ({ domo_api_token, datastore_name, appDb }: any) => {
        const result = await createAppDB(domo_api_token, datastore_name, appDb);
        return {
            content: [{ type: "text", text: JSON.stringify(result) }]
        };
    }
} as const;
