import axios from "axios";
import { constants } from "../../../config/const.conf.js";

/**
 * MongoDB-style query filter for AppDB document retrieval.
 *
 * Fields are dot-notated content paths, values are operator objects.
 * Domo's v2 query engine supports standard MongoDB comparison operators.
 *
 * @example
 * // Match documents where content.userId equals "123456789"
 * { "content.userId": { $eq: "123456789" } }
 *
 * // Match documents where content.stage is "Closed Won"
 * { "content.stage": { $eq: "Closed Won" } }
 *
 * @see https://www.domo.com/docs/appdb
 */
export interface QueryFilter {
    [field: string]: Record<string, string>;
}

/**
 * Queries an AppDB collection using MongoDB-style filter expressions.
 *
 * This tool uses Domo's **v2 query endpoint**, which is more expressive
 * than a simple document fetch — it accepts structured filter objects
 * allowing the agent to retrieve targeted subsets of documents without
 * pulling the entire collection.
 *
 * Query fields must be dot-notated content paths prefixed with `content.`
 * since Domo wraps all user data under a `content` envelope in AppDB.
 *
 * Supported MongoDB operators: `$eq`, `$ne`, `$gt`, `$gte`, `$lt`,
 * `$lte`, `$in`, `$nin`, `$exists`.
 *
 * @param domo_api_token - Developer token authenticated via `X-DOMO-Developer-Token` header.
 * @param collectionId   - ID of the target AppDB collection to query against.
 * @param filter         - MongoDB-style {@link QueryFilter} object scoping
 *                         which documents to return. Pass `{}` to return all.
 *
 * @returns Array of documents matching the filter, each with system `id`
 *          and full `content` payload.
 *
 * @throws Re-throws Axios errors with original HTTP status intact —
 *         a 400 typically indicates a malformed filter expression.
 *
 * @example
 * // Agent usage: find all deals in "Proposal" stage owned by a user
 * const results = await queryDocument(token, "col_abc123", {
 *   "content.stage":  { $eq: "Proposal" },
 *   "content.userId": { $eq: "123456789" }
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
 *   SUGGESTED FOLLOW-UPS AFTER SUCCESS:
 *   - `getDocument` — retrieve a specific match once the results are known.
 */
export const queryDocument = async (
    domo_api_token: string,
    collectionId: string,
    filter: QueryFilter
) => {
    const url = `${constants.getInstanceUrl()}/api/datastores/v2/collections/${collectionId}/documents/query`;

    try {
        const response = await axios.post(url, filter, {
            headers: {
                "Content-Type": "application/json",
                "X-DOMO-Developer-Token": domo_api_token
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error querying documents:", error);
        throw error;
    }
};
