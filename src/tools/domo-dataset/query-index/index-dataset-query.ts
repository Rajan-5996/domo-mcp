import axios from "axios";
import { constants } from "../../../config/const.conf.js";

/**
 * Indexes a Domo dataset via the query engine, making it available for
 * SQL execution after schema changes or data updates.
 *
 * This differs from `indexDataset` (`/api/data/v3`) — that endpoint manages
 * row-level index jobs with progress tracking. This endpoint (`/api/query/v1`)
 * triggers the query engine's own indexing pipeline, which is what gates
 * whether a dataset can be queried via Domo's SQL interface at all.
 *
 * Call this after: schema changes, bulk data uploads, or any operation
 * that mutates the dataset structure before issuing SQL queries against it.
 *
 * @param domo_api_token - Developer token via `X-DOMO-Developer-Token` header.
 * @param datasetId      - ID of the dataset to index for querying.
 *
 * @returns Indexing confirmation response from the query engine.
 *
 * @throws Re-throws Axios errors — a 404 means the dataset does not exist.
 *
 * @agent
 *   CREDENTIALS (check cache/memory first):
 *   - `domo_api_token` — only ask if not cached. Prompt: "Please provide
 *                        your Domo Developer Token to continue."
 *
 *   PREREQUISITE CALLS (invoke before triggering query-engine indexing):
 *   1. `get_dataset_metadata` — RECOMMENDED. Confirm the dataset exists and
 *        capture its current state before re-indexing. A 404 here means the
 *        datasetId is invalid.
 *
 *   COLLECT FROM USER BEFORE INVOKING:
 *   - `datasetId` — ask "Which dataset should be indexed for querying?"
 *
 *   SUGGESTED FOLLOW-UPS AFTER SUCCESS:
 *   1. `get_dataset_schema` — call immediately after to confirm the query engine
 *        has registered the latest schema (column names, types, and dataset name).
 *   2. `query_with_sql` — once the schema is confirmed, construct and execute
 *        SQL queries using the dataset name (not ID) as the table name.
 */
export const indexDatasetForQuery = async (
    domo_api_token: string,
    datasetId: string
) => {
    const url = `${constants.getInstanceUrl()}/api/query/v1/datasources/${datasetId}`;

    try {
        const response = await axios.post(url, null, {
            headers: {
                "X-DOMO-Developer-Token": domo_api_token
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error indexing dataset for query:", error);
        throw error;
    }
};