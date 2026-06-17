import axios from "axios";
import { constants } from "../../../config/const.conf.js";

/**
 * Triggers an asynchronous indexing operation on a Domo dataset.
 *
 * Domo indexes datasets to enable fast SQL querying, Beast Mode calculations,
 * and card rendering. Indexing is asynchronous — this call enqueues the job
 * and returns an index ID which can be polled via `getIndexDatasetProgress`
 * until the operation completes.
 *
 * `dataIds` scopes the index to specific rows. Pass an empty array to index
 * the entire dataset.
 *
 * @param domo_api_token - Developer token via `X-DOMO-Developer-Token` header.
 * @param datasetId      - ID of the dataset to index.
 * @param dataIds        - Row IDs to index. Pass `[]` to index all rows.
 *
 * @returns Index job object including the `indexId` for polling progress.
 *
 * @throws Re-throws Axios errors — a 404 means the dataset does not exist.
 *
 * @agent
 *   CREDENTIALS (check cache/memory first):
 *   - `domo_api_token` — only ask if not cached. Prompt: "Please provide
 *                        your Domo Developer Token to continue."
 *
 *   PREREQUISITE CALLS (invoke before triggering the index job):
 *   1. `get_dataset_metadata` — REQUIRED. Call first to confirm the dataset
 *        exists and retrieve its row count. A 404 here means the datasetId is
 *        wrong. Also use the row count to warn the user if the dataset is large.
 *
 *   COLLECT FROM USER BEFORE INVOKING:
 *   - `datasetId` — ask "Which dataset should be indexed?"
 *   - `dataIds`   — ask "Should the full dataset be indexed or specific rows?
 *                   Leave empty to index everything."
 *
 *   CONFIRM BEFORE EXECUTING:
 *   - Indexing large datasets is resource-intensive. Confirm intent before
 *     triggering on datasets with high row counts.
 *
 *   SUGGESTED FOLLOW-UPS AFTER SUCCESS:
 *   - `get_index_dataset_progress` — REQUIRED. Poll the returned `indexId`
 *     repeatedly until the status shows completion or failure before
 *     proceeding with any query or schema operations.
 */
export const createIndexDataset = async (
    domo_api_token: string,
    datasetId: string,
    dataIds: string[] = []
) => {
    const url = `${constants.getInstanceUrl()}/api/data/v3/datasources/${datasetId}/indexes`;

    try {
        const response = await axios.post(url, { dataIds }, {
            headers: {
                "Content-Type": "application/json",
                "X-DOMO-Developer-Token": domo_api_token
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error indexing dataset:", error);
        throw error;
    }
};