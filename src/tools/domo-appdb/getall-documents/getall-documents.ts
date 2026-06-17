import axios from "axios";
import { constants } from "../../../config/const.conf.js";

/**
 * Retrieves all documents stored in a Domo AppDB collection.
 *
 * A **document** in AppDB is the atomic unit of storage — equivalent to
 * a row in SQL. This tool fetches the full document list for a given
 * collection, giving the agent a complete snapshot of its current state.
 *
 * Use this when the agent needs to read, reason over, or display all
 * records in a collection before deciding on further actions such as
 * updates, deletions, or aggregations.
 *
 * @param domo_api_token - Developer token authenticated via
 *                         `X-DOMO-Developer-Token` header.
 * @param collectionId   - ID of the target AppDB collection. Obtain from
 *                         `create_appdb`.
 *
 * @returns Array of document objects as returned by Domo, each including
 *          the system-assigned `id` and the stored content payload.
 *
 * @throws Re-throws Axios errors with the original HTTP status and Domo
 *         error payload intact — handle upstream for tool error responses.
 *
 * @example
 * // Agent usage: read all opportunity records before filtering
 * const docs = await getAllDocuments(token, "col_abc123");
 * // docs → [{ id: "doc_1", content: { deal: "Acme", value: 50000 } }, ...]
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
 *
 *   SUGGESTED FOLLOW-UPS AFTER SUCCESS:
 *   - `queryDocument` — narrow the returned documents further as needed.
 */
export const getAllDocuments = async (
    domo_api_token: string,
    collectionId: string
) => {
    const url = `${constants.getInstanceUrl()}/api/datastores/v1/collections/${collectionId}/documents`;

    try {
        const response = await axios.get(url, {
            headers: {
                "X-DOMO-Developer-Token": domo_api_token
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching documents:", error);
        throw error;
    }
};
