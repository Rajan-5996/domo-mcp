import axios from "axios";
import { constants } from "../../../config/const.conf.js";
import { DocumentContent } from "../../../types/tools/documents.js";

/**
 * Creates a new document inside a Domo AppDB collection.
 *
 * In Domo's AppDB hierarchy, a **document** is the atomic unit of storage —
 * equivalent to a row in SQL or a document in MongoDB. Each document lives
 * inside a **collection** (the schema container) which itself lives inside
 * a **datastore** (the database container).
 *
 * Use this tool when you need to persist a new record into an existing
 * AppDB collection. The document must conform to the schema defined on
 * the collection at creation time — Domo will reject mismatched payloads.
 *
 * @param domo_api_token - Developer token for authenticating against the
 *                         Domo instance via `X-DOMO-Developer-Token` header.
 * @param collectionId   - ID of the target AppDB collection. Obtain this
 *                         from `create_appdb`.
 * @param content        - Document payload conforming to {@link DocumentContent}.
 *                         Shape must match the collection's defined schema.
 *
 * @returns The created document object as returned by Domo, including the
 *          system-assigned document `id` for future reads or updates.
 *
 * @throws Re-throws Axios errors with the original HTTP status and Domo
 *         error payload intact — handle upstream for tool error responses.
 *
 * @example
 * // Agent usage: store a new sales opportunity
 * await createDocument(token, "col_abc123", {
 *   content: { "deal": "Acme Corp", "value": 50000, "stage": "Proposal" }
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
 *
 *   CONFIRM BEFORE EXECUTING:
 *   - Confirm the target collection before creating a document.
 *
 *   SUGGESTED FOLLOW-UPS AFTER SUCCESS:
 *   - `getAllDocuments` — verify the new document is present.
 *   - `queryDocument`  — use the new document content for downstream actions.
 */
export const createDocument = async (
    domo_api_token: string,
    collectionId: string,
    content: DocumentContent
) => {
    const url = `${constants.getInstanceUrl()}/api/datastores/v1/collections/${collectionId}/documents`;

    try {
        const response = await axios.post(url, content, {
            headers: {
                "Content-Type": "application/json",
                "X-DOMO-Developer-Token": domo_api_token
            }
        });

        return response.data;
    } catch (error) {
        throw error;
    }
};
