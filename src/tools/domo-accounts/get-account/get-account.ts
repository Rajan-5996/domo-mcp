import axios from "axios";
import { constants } from "../../../config/const.conf.js";

/**
 * Retrieves full details for a specific Domo account by its ID.
 *
 * Use this over `getAllAccounts` when the `accountId` is already known —
 * returns richer account data including `status` alongside `displayName`.
 *
 * @param domo_api_token - Developer token via `X-DOMO-Developer-Token` header.
 * @param account_id     - Unique identifier of the account to retrieve.
 *
 * @returns Account object with `accountId`, `displayName`, and `status`.
 *
 * @throws Re-throws Axios errors — 401 means insufficient permissions,
 *         404 means the account ID does not exist.
 *
 * @agent
 *   CREDENTIALS (check cache/memory first):
 *   - `domo_api_token` — only ask if not cached. Prompt: "Please provide
 *                        your Domo Developer Token to continue."
 *
 *   COLLECT FROM USER BEFORE INVOKING:
 *   - `account_id` — ask "Which account should be retrieved?" If the user
 *                    provides a name instead of an ID, run `getAllAccounts`
 *                    first to resolve the correct `accountId`.
 *
 *   SUGGESTED FOLLOW-UPS AFTER SUCCESS:
 *   - If `status` is not `Active`, surface that to the user before
 *     attempting connector or dataset operations on this account.
 */
export const getAccountById = async (
    domo_api_token: string,
    account_id: string
) => {
    const url = `${constants.getInstanceUrl()}/api/data/v1/accounts/${account_id}`;

    try {
        const response = await axios.get(url, {
            headers: {
                "X-DOMO-Developer-Token": domo_api_token
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching account by ID:", error);
        throw error;
    }
};