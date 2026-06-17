import axios from "axios";
import { constants } from "../../../config/const.conf.js";

/**
 * Retrieves a single document from a Domo AppDB collection by its ID.
 *
 * Use this over {@link getAllDocuments} when the agent already knows the
 * target document ID — avoids fetching the entire collection and reduces
 * API overhead for point lookups.
 *
 * @param domo_api_token - Developer token authenticated via `X-DOMO-Developer-Token` header.
 * @param collectionId   - ID of the parent AppDB collection.
 * @param documentId     - System-assigned ID of the document to retrieve.
 *
 * @returns The matching document object including its `id` and content payload.
 *
 * @throws Re-throws Axios errors with original HTTP status intact —
 *         a 404 indicates the document or collection does not exist.
 *
 * @example
 * const doc = await getDocument(token, "col_abc123", "doc_xyz789");
 * // doc → { id: "doc_xyz789", content: { deal: "Acme", value: 50000 } }
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
 *   SUGGESTED FOLLOW-UPS AFTER SUCCESS:
 *   - `getAllDocuments` — inspect nearby documents in the same collection.
 */
export const getDocument = async (
    domo_api_token: string,
    collectionId: string,
    documentId: string
) => {
    const url = `${constants.getInstanceUrl()}/api/datastores/v1/collections/${collectionId}/documents/${documentId}`;

    try {
        const response = await axios.get(url, {
            headers: {
                "X-DOMO-Developer-Token": domo_api_token
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching document:", error);
        throw error;
    }
};
