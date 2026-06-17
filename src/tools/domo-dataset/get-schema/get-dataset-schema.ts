import axios from "axios";
import { constants } from "../../../config/const.conf.js";

/**
 * Retrieves the indexed schema of a Domo dataset, including column names,
 * IDs, types, visibility, and ordering.
 *
 * This calls Domo's query engine schema endpoint, which reflects the
 * dataset's structure *as indexed for SQL querying* — distinct from the
 * dataset's raw metadata schema. If a dataset was recently created or
 * had its structure changed, the indexed schema may lag until the
 * dataset is re-indexed (see `indexDatasetForQuery`). Use `get_dataset_schema_latest`
 * to fetch the authoritative metadata schema if you suspect the index is out of sync.
 *
 * By default, hidden columns are excluded from the response. Pass
 * `includeHidden: true` to surface them.
 *
 * @param domo_api_token - Developer token sent via `x-domo-authentication` header.
 * @param datasetId      - ID of the dataset whose schema should be retrieved.
 * @param includeHidden  - Whether to include hidden columns. Defaults to false.
 *
 * @returns An object containing `name`, `dataSourceId`, and a `tables` array.
 *          Each table has a `columns` array, where each column includes
 *          `name`, `id`, `type`, `visible`, and `order`.
 *
 * @throws Re-throws Axios errors — a 401 means the token lacks access to
 *         this dataset; a 404 typically means the dataset hasn't been
 *         indexed yet or the datasetId is invalid.
 *
 * @agent
 *   CREDENTIALS (check cache/memory first):
 *   - `domo_api_token` — only ask if not cached. Prompt: "Please provide
 *                        your Domo Developer Token to continue."
 *
 *   PREREQUISITE CALLS (invoke before fetching the schema):
 *   1. `get_dataset_metadata` — RECOMMENDED. Call first to confirm the dataset
 *        exists, retrieve its human-readable name, and check row count /
 *        last-modified timestamp. A 404 here means the datasetId is wrong.
 *
 *   COLLECT FROM USER BEFORE INVOKING:
 *   - `datasetId`     — ask "Which dataset's schema would you like to retrieve?"
 *   - `includeHidden` — optional; only ask if the user mentions hidden/system
 *                       columns. Otherwise default to false silently.
 *
 *   SUGGESTED FOLLOW-UPS AFTER SUCCESS:
 *   - `query_with_sql` — use the retrieved column names and dataset name
 *     (not its ID) as the table name to build and execute SQL queries.
 *   - `index_dataset_for_query` — if the returned schema is empty or looks
 *     stale (e.g. missing recently added columns), re-index the dataset
 *     and then call this tool again to confirm the updated schema.
 *   - `get_dataset_schema_latest` — compare with the authoritative latest schema
 *     definition to see if the index lags behind the metadata store.
 */
export const getDatasetSchema = async (
    domo_api_token: string,
    datasetId: string,
    includeHidden: boolean = false
) => {
    const url = `${constants.getInstanceUrl()}/api/query/v1/datasources/${datasetId}/schema/indexed`;

    try {
        const response = await axios.get(url, {
            params: { includeHidden },
            headers: {
                "Content-Type": "application/json",
                "x-domo-authentication": domo_api_token
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error retrieving dataset schema:", error);
        throw error;
    }
};