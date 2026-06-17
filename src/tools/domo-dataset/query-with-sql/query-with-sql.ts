import axios from "axios";
import { constants } from "../../../config/const.conf.js";

/**
 * Executes a SQL query against a Domo dataset via the query engine.
 *
 * Domo's query engine exposes datasets as SQL tables — the table name
 * matches the dataset's name in Domo (not the ID). Standard SELECT
 * syntax is supported including WHERE, GROUP BY, ORDER BY, LIMIT, and
 * JOINs across datasets accessible to the authenticated token.
 *
 * The dataset must be indexed before queries will succeed — call
 * `indexDatasetForQuery` if the dataset was recently created or mutated.
 *
 * @param domo_api_token - Developer token via `X-DOMO-Developer-Token` header.
 * @param datasetId      - ID of the dataset to execute the SQL query against.
 * @param sql            - SQL statement to execute. Table name must match the
 *                         dataset name in Domo, not the dataset ID.
 *
 * @returns Array of row objects matching the query, each keyed by column name.
 *
 * @throws Re-throws Axios errors — a 401 means the token lacks access to
 *         this dataset; a 400 typically means malformed SQL.
 *
 * @agent
 *   CREDENTIALS (check cache/memory first):
 *   - `domo_api_token` — only ask if not cached. Prompt: "Please provide
 *                        your Domo Developer Token to continue."
 *
 *   PREREQUISITE CALLS (invoke these before building the SQL statement):
 *   1. `get_dataset_schema` — REQUIRED. Call this first to discover:
 *        - The exact dataset name (used as the SQL table name, NOT the ID).
 *        - All available column names and their types for use in SELECT/WHERE.
 *        Store the schema result in context so the SQL is accurate.
 *   2. `index_dataset_for_query` — call this if the dataset was recently
 *        created, mutated, or if a prior query returned a 404/empty result.
 *        Then re-fetch the schema to confirm the index is fresh.
 *
 *   COLLECT FROM USER BEFORE INVOKING:
 *   - `datasetId` — ask "Which dataset should be queried?"
 *   - `sql`       — construct from the schema retrieved above; confirm with
 *                   the user before executing if the query is complex.
 *
 *   SUGGESTED FOLLOW-UPS AFTER SUCCESS:
 *   - Summarise or visualise the returned rows for the user.
 *   - `index_dataset_for_query` — if the query fails due to unindexed data,
 *     re-index and retry.
 */
export const queryWithSQL = async (
    domo_api_token: string,
    datasetId: string,
    sql: string
) => {
    const url = `${constants.getInstanceUrl()}/api/query/v1/execute/${datasetId}`;

    try {
        const response = await axios.post(url, { sql }, {
            headers: {
                "Content-Type": "application/json",
                "X-DOMO-Developer-Token": domo_api_token
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error executing SQL query:", error);
        throw error;
    }
};