import axios from "axios";
import { constants } from "../../../config/const.conf.js";

/**
 * Retrieves the status of a dataset indexing operation in Domo.
 *
 * Domo indexes datasets to enable fast SQL querying and Beast Mode
 * calculations. Indexing is asynchronous — this endpoint lets the agent
 * poll the progress of a specific indexing job until it completes or fails.
 *
 * @param domo_api_token - Developer token via `X-DOMO-Developer-Token` header.
 * @param datasetId      - ID of the dataset being indexed.
 * @param indexId        - ID of the specific indexing operation to check.
 *
 * @returns Index status object containing progress state and metadata.
 *
 * @throws Re-throws Axios errors — a 404 means the dataset or index ID is invalid.
 *
 * @agent
 *   CREDENTIALS (check cache/memory first):
 *   - `domo_api_token` — only ask if not cached. Prompt: "Please provide
 *                        your Domo Developer Token to continue."
 *
 *   PREREQUISITE CALLS (must have been invoked before this tool is useful):
 *   1. `create_dataset_index` — REQUIRED. This tool only makes sense after
 *        `create_dataset_index` has been called and returned an `indexId`.
 *        Use that `indexId` as the argument here.
 *
 *   COLLECT FROM USER BEFORE INVOKING:
 *   - `datasetId` — ask "Which dataset's index status should be checked?"
 *   - `indexId`   — obtained from the `create_dataset_index` response;
 *                   do not ask the user unless it was not stored in context.
 *
 *   SUGGESTED FOLLOW-UPS AFTER SUCCESS:
 *   - If the status indicates the job is still in progress: wait briefly,
 *     then call this tool again with the same `datasetId` and `indexId`.
 *   - If the status indicates completion:
 *     1. `get_dataset_schema` — verify the schema is now up-to-date.
 *     2. `query_with_sql` — proceed with SQL queries against the dataset.
 */
export const getIndexDatasetProgress = async (
    domo_api_token: string,
    datasetId: string,
    indexId: string
) => {
    const url = `${constants.getInstanceUrl()}/api/data/v3/datasources/${datasetId}/indexes/${indexId}/statuses`;

    try {
        const response = await axios.get(url, {
            headers: {
                "X-DOMO-Developer-Token": domo_api_token
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching index dataset progress:", error);
        throw error;
    }
};