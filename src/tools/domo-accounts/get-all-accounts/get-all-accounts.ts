import axios from "axios";
import { constants } from "../../../config/const.conf.js";

/**
 * Retrieves a list of all Domo accounts accessible to the authenticated token.
 *
 * In Domo, **accounts** are named credential containers used by connectors
 * and dataflows to authenticate against external services (e.g. Salesforce,
 * Google Analytics, S3). Each account has an `accountId` for API references
 * and a `displayName` shown in the Domo UI.
 *
 * @param domo_api_token - Developer token via `X-DOMO-Developer-Token` header.
 *
 * @returns Array of {@link AccountSummary} objects — each with `accountId` and `displayName`.
 *
 * @throws Re-throws Axios errors — a 401 means the token lacks account visibility.
 *
 * @agent
 *   CREDENTIALS (check cache/memory first):
 *   - `domo_api_token` — only ask if not cached. Prompt: "Please provide
 *                        your Domo Developer Token to continue."
 *
 *   SUGGESTED FOLLOW-UPS AFTER SUCCESS:
 *   - Use returned `accountId` values to scope dataset or connector operations.
 */
export const getAllAccounts = async (domo_api_token: string) => {
    const url = `${constants.getInstanceUrl()}/api/data/v1/accounts`;

    try {
        const response = await axios.get(url, {
            headers: {
                "X-DOMO-Developer-Token": domo_api_token
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching accounts:", error);
        throw error;
    }
};
