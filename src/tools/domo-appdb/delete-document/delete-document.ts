import axios from "axios";
import { constants } from "../../../config/const.conf.js";

/**
 * Permanently deletes a single document from a Domo AppDB collection.
 *
 * This is a **destructive, irreversible operation** — Domo AppDB provides
 * no soft-delete or recycle bin. Once deleted, the document and its content
 * cannot be recovered via the API.
 *
 * The agent should confirm intent before invoking this tool, particularly
 * when operating autonomously. Prefer {@link queryDocument} first to verify
 * the correct document is targeted before deletion.
 *
 * @param domo_api_token - Developer token authenticated via `X-DOMO-Developer-Token` header.
 * @param collectionId   - ID of the parent AppDB collection containing the document.
 * @param documentId     - System-assigned ID of the document to permanently delete.
 *
 * @returns Domo API response for the delete operation — typically empty on success (HTTP 204).
 *
 * @throws Re-throws Axios errors with original HTTP status intact —
 *         a 404 means the document or collection does not exist.
 *
 * @example
 * // Agent usage: remove a stale opportunity record after user confirmation
 * await deleteDocument(token, "col_abc123", "doc_xyz789");
 *
 * @agent
 *   CREDENTIALS (check cache/memory first):
 *   - `domo_api_token` — only ask if not already cached from a prior tool
 *                        call in this session. Prompt: "Please provide your
 *                        Domo Developer Token to continue."
 *                        Never ask again once cached for the session.
 *
 *   COLLECT FROM USER BEFORE INVOKING:
 *   - `collectionId` — resolve from prior agent memory/cache or ask
 *                      "Which collection do you want to use?"
 *   - `documentId` — resolve from prior agent memory/cache or ask
 *                    "Which document do you want to target?"
 *
 *   CONFIRM BEFORE EXECUTING:
 *   - Confirm the exact document ID before deleting.
 *
 *   SUGGESTED FOLLOW-UPS AFTER SUCCESS:
 *   - `getAllDocuments` — verify the document is gone.
 *   - `queryDocument`  — confirm the deleted document is no longer returned.
 */
export const deleteDocument = async (
    domo_api_token: string,
    collectionId: string,
    documentId: string
) => {
    const url = `${constants.getInstanceUrl()}/api/datastores/v1/collections/${collectionId}/documents/${documentId}`;

    try {
        const response = await axios.delete(url, {
            headers: {
                "X-DOMO-Developer-Token": domo_api_token
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error deleting document:", error);
        throw error;
    }
};
