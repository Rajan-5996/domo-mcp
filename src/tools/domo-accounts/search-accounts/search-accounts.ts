import axios from "axios";
import { constants } from "../../../config/const.conf.js";

export type FacetValue =
    | "DATAPROVIDERNAME"
    | "OWNED_BY_ID"
    | "VALID"
    | "USED"
    | "LAST_MODIFIED_DATE";

export type SortOrder = "ASC" | "DESC";

export interface SearchAccountsRequest {
    query: string;
    entityList?: string[][];
    count?: number;
    offset?: number;
    combineResults?: boolean;
    filters?: object[];
    facetValuesToInclude?: FacetValue[];
    queryProfile?: string;
    sort?: {
        fieldSorts: {
            field: string;
            sortOrder: SortOrder;
        }[];
    };
}

/**
 * Searches for Domo accounts using a query string and optional filters.
 *
 * Uses Domo's global search engine (`/api/search/v1/query`) scoped to the
 * `account` entity type. Supports wildcard queries (e.g. `*sdk*`), faceted
 * filtering, pagination, and sort — making it far more flexible than
 * `getAllAccounts` for large account lists or name-based lookups.
 *
 * @param domo_api_token - Developer token via `X-DOMO-Developer-Token` header.
 * @param request        - Search request conforming to {@link SearchAccountsRequest}.
 *                         `query` and `entityList` are required; all others have defaults.
 *
 * @returns Search response containing matched account objects with
 *          `accountId`, `displayName`, and `status`.
 *
 * @throws Re-throws Axios errors — 401 means the token lacks search permissions.
 *
 * @agent
 *   CREDENTIALS (check cache/memory first):
 *   - `domo_api_token` — only ask if not cached. Prompt: "Please provide
 *                        your Domo Developer Token to continue."
 *
 *   COLLECT FROM USER BEFORE INVOKING:
 *   - `query`  — ask "What account name should be searched?" Wrap partial
 *                names in wildcards automatically e.g. `*salesforce*`.
 *   - `count`  — ask "How many results?" Defaults to 100.
 *   - `offset` — ask "Should results be paginated?" Defaults to 0.
 *
 *   SUGGESTED FOLLOW-UPS AFTER SUCCESS:
 *   - `get_account_by_id` — fetch full details for a specific result.
 */
export const searchAccountsByName = async (
    domo_api_token: string,
    request: SearchAccountsRequest
) => {
    const url = `${constants.getInstanceUrl()}/api/search/v1/query`;

    const payload: SearchAccountsRequest = {
        count: 100,
        offset: 0,
        combineResults: false,
        filters: [],
        facetValuesToInclude: [
            "DATAPROVIDERNAME",
            "OWNED_BY_ID",
            "VALID",
            "USED",
            "LAST_MODIFIED_DATE"
        ],
        queryProfile: "GLOBAL",
        entityList: [["account"]],
        sort: {
            fieldSorts: [{ field: "display_name_sort", sortOrder: "ASC" }]
        },
        ...request
    };

    try {
        const response = await axios.post(url, payload, {
            headers: {
                "Content-Type": "application/json",
                "X-DOMO-Developer-Token": domo_api_token
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error searching accounts by name:", error);
        throw error;
    }
};
