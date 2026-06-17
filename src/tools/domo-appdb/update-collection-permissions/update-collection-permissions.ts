import axios from "axios";
import { constants } from "../../../config/const.conf.js";

/**
 * Permission levels available for a Domo Custom App on an AppDB collection.
 *
 * Domo uses a capability-based permission model scoped per Custom App (RYUU_APP).
 * Each permission grants the app a specific class of operation on the collection.
 *
 * - `read`           — list and fetch documents
 * - `create_content` — create new documents
 * - `read_content`   — read document content (distinct from metadata read)
 * - `edit_content`   — update existing documents
 * - `delete_content` — delete documents
 */
export type CollectionPermission =
    | "read"
    | "create_content"
    | "read_content"
    | "edit_content"
    | "delete_content";

/**
 * Updates the permissions a specific Domo Custom App holds over an AppDB collection.
 *
 * Domo's AppDB permission model is scoped to the `RYUU_APP` principal type —
 * meaning permissions are granted per Custom App (identified by its `proxyId`),
 * not per user. This allows fine-grained control over which apps can read,
 * write, or delete documents in a collection.
 *
 * Permissions are passed as a **comma-separated query parameter** and replace
 * the app's existing permission set entirely — this is a full replacement, not
 * an additive grant. Omitting a permission revokes it.
 *
 * The `proxyId` is the Custom App's proxy identifier, available in Domo's
 * Asset Library under the app's details panel.
 *
 * @param domo_api_token - Developer token authenticated via `X-DOMO-Developer-Token` header.
 * @param collectionId   - ID of the target AppDB collection.
 * @param proxyId        - Proxy ID of the Custom App being granted permissions.
 *                         Found in Domo Asset Library under the app's details.
 * @param permissions    - Array of {@link CollectionPermission} values to grant.
 *                         Serialised internally as a comma-separated query param.
 *
 * @returns void — Domo responds with HTTP 204 No Content on success.
 *
 * @throws Re-throws Axios errors with original HTTP status intact —
 *         a 404 means the collection or proxyId does not exist.
 *
 * @agent
 *   CREDENTIALS (check cache/memory first):
 *   - `domo_api_token` — only ask if not already cached from a prior tool
 *                        call in this session. Prompt: "Please provide your
 *                        Domo Developer Token to continue."
 *                        Never ask again once cached for the session.
 *
 *   COLLECT FROM USER BEFORE INVOKING:
 *   - `collectionId`  — ask "Which collection should the permissions apply to?"
 *                       or resolve from a prior `list_collections` call.
 *   - `proxyId`       — ask "What is the Custom App's Proxy ID?" Remind the
 *                       user it is available in Domo's Asset Library.
 *   - `permissions`   — ask "What permissions should this app have?" Present
 *                       options: read, read_content, create_content,
 *                       edit_content, delete_content.
 *
 *   CONFIRM BEFORE EXECUTING:
 *   - Show the resolved permission list and warn: "This replaces all existing
 *     permissions for this app on the collection. Confirm?"
 *
 *   SUGGESTED FOLLOW-UPS AFTER SUCCESS:
 *   - Prompt the user to test the app's access against the collection using
 *     the newly granted permissions.
 *
 * @example
 * await updateCollectionPermissions(token, "col_abc123", "proxy_xyz789", [
 *   "read",
 *   "read_content",
 *   "create_content"
 * ]);
 */
export const updateCollectionPermissions = async (
    domo_api_token: string,
    collectionId: string,
    proxyId: string,
    permissions: CollectionPermission[]
) => {
    const url = `${constants.getInstanceUrl()}/api/datastores/v1/collections/${collectionId}/permission/RYUU_APP/${proxyId}`;

    try {
        const response = await axios.put(url, null, {
            headers: {
                "X-DOMO-Developer-Token": domo_api_token
            },
            params: {
                permissions: permissions.join(",")
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error updating collection permissions:", error);
        throw error;
    }
};
