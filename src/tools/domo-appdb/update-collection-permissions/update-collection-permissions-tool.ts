import { z } from "zod";
import { updateCollectionPermissions } from "./update-collection-permissions.js";

export const updateCollectionPermissionsTool = {
    name: "update_collection_permissions",
    definition: {
        title: "Update Collection Permissions",
        description: "Updates the permissions a specific Domo Custom App holds over an AppDB collection. This is a full replacement — omitting a permission revokes it.",
        inputSchema: z.object({
            domo_api_token: z.string().describe("Domo Developer Token"),
            collectionId: z.string().describe("ID of the target AppDB collection"),
            proxyId: z.string().describe("Proxy ID of the Custom App (found in Domo Asset Library)"),
            permissions: z.array(
                z.enum(["read", "create_content", "read_content", "edit_content", "delete_content"])
            ).describe("Array of permissions to grant the app on this collection")
        })
    },
    handler: async ({ domo_api_token, collectionId, proxyId, permissions }: any) => {
        const result = await updateCollectionPermissions(domo_api_token, collectionId, proxyId, permissions);
        return {
            content: [{ type: "text", text: JSON.stringify(result) }]
        };
    }
} as const;
