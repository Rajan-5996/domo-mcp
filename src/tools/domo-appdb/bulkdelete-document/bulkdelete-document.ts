import axios from "axios";
import { constants } from "../../../config/const.conf.js";

/**
 * Permanently deletes multiple documents from a Domo AppDB collection
 * in a single API request.
 *
 * Domo's bulk delete endpoint accepts document IDs as a **comma-separated
 * query parameter** (`ids`), not a request body — unlike typical bulk REST
 * patterns. This makes it significantly more efficient than looping
 * {@link deleteDocument} for each ID, reducing round-trips to a single call.
 *
 * This is a **destructive, irreversible operation**. Domo AppDB has no
 * soft-delete or recovery mechanism. The agent must confirm the full ID
 * list with the user before invoking this tool autonomously.
 *
 * @param domo_api_token     - Developer token authenticated via `X-DOMO-Developer-Token` header.
 * @param collectionId - ID of the parent AppDB collection containing the documents.
 * @param documentIds  - Array of system-assigned document IDs to permanently delete.
 *                       Serialised internally as a comma-separated `ids` query param.
 *
 * @returns Domo API response for the bulk delete — typically empty on success (HTTP 200).
 *
 * @throws Re-throws Axios errors with original HTTP status intact —
 *         a 404 indicates one or more IDs or the collection do not exist.
 *
 * @example
 * // Agent usage: purge a batch of stale records after user confirmation
 * await bulkDeleteDocuments(token, "col_abc123", [
 *   "doc_111", "doc_222", "doc_333"
 * ]);
 * 
 * @agent
 *   CREDENTIALS (check cache/memory first):
 *   - `domo_api_token` — only ask if not already cached from a prior tool
 *                        call in this session. Prompt: "Please provide your
 *                        Domo Developer Token to continue."
 *                        Never ask again once cached for the session.
 *
 *   COLLECT FROM USER BEFORE INVOKING:
 *   - `collectionId`  — ask "Which collection do you want to delete from?"
 *                       or resolve from a prior `list_collections` call.
 *   - `documentIds`   — ask "Which documents should be deleted?" Accept names,
 *                       filters, or IDs. If names/filters given, run
 *                       `queryDocument` first to resolve the actual IDs.
 *
 *   CONFIRM BEFORE EXECUTING:
 *   - Always show the user the resolved document list and ask for explicit
 *     confirmation before calling this tool — deletion is irreversible.
 *   - If deleting more than 10 documents, warn: "This will permanently
 *     delete {n} records. Are you sure?"
 *
 *   SUGGESTED FOLLOW-UPS AFTER SUCCESS:
 *   - `getAllDocuments` — verify remaining documents in the collection.
 *   - `queryDocument`  — confirm the deleted IDs no longer exist.
 */
export const bulkDeleteDocuments = async (
    domo_api_token: string,
    collectionId: string,
    documentIds: string[]
) => {
    const url = `${constants.getInstanceUrl()}/api/datastores/v1/collections/${collectionId}/documents/bulk`;

    try {
        const response = await axios.delete(url, {
            headers: {
                "X-DOMO-Developer-Token": domo_api_token
            },
            params: {
                ids: documentIds.join(",")
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error bulk deleting documents:", error);
        throw error;
    }
};
