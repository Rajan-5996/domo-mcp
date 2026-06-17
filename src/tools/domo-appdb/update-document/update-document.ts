import axios from "axios";
import { constants } from "../../../config/const.conf.js";
import { DocumentContent } from "../../../types/tools/documents.js";

/**
 * Replaces the content of an existing Domo AppDB document in full.
 *
 * Domo AppDB uses **PUT semantics** for updates — the entire document
 * content is replaced with the incoming payload, not partially merged.
 * The agent must supply the complete desired state of the document,
 * not just the fields it wants to change.
 *
 * Use this when the agent has retrieved an existing document via
 * {@link getDocument}, mutated the fields it needs, and is ready
 * to persist the updated version back to Domo.
 *
 * @param domo_api_token - Developer token authenticated via `X-DOMO-Developer-Token` header.
 * @param collectionId   - ID of the parent AppDB collection containing the document.
 * @param documentId     - System-assigned ID of the document to update.
 * @param update         - Full replacement payload conforming to {@link DocumentContent}.
 *                         Omitted fields are removed — this is not a PATCH.
 *
 * @returns The updated document object as confirmed by Domo.
 *
 * @throws Re-throws Axios errors with original HTTP status intact —
 *         a 404 means the document or collection no longer exists.
 *
 * @example
 * // Agent usage: advance a deal stage after user confirmation
 * await updateDocument(token, "col_abc123", "doc_xyz789", {
 *   content: { deal: "Acme Corp", value: 50000, stage: "Closed Won" }
 * });
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
 *                    "Which document do you want to update?"
 *
 *   CONFIRM BEFORE EXECUTING:
 *   - Confirm the updated document content before persisting.
 *
 *   SUGGESTED FOLLOW-UPS AFTER SUCCESS:
 *   - `getDocument` — verify the updated document contents.
 */
export const updateDocument = async (
    domo_api_token: string,
    collectionId: string,
    documentId: string,
    update: DocumentContent
) => {
    const url = `${constants.getInstanceUrl()}/api/datastores/v1/collections/${collectionId}/documents/${documentId}`;

    try {
        const response = await axios.put(url, update, {
            headers: {
                "Content-Type": "application/json",
                "X-DOMO-Developer-Token": domo_api_token
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error updating document:", error);
        throw error;
    }
};
