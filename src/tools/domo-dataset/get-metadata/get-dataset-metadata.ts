import axios from "axios";
import { constants } from "../../../config/const.conf.js";

/**
 * Retrieves detailed metadata for a specific Domo dataset, including:
 *   - schema (columns, types, modes),
 *   - statistics and distributions for numeric columns,
 *   - value frequencies and dominant values for categorical columns,
 *   - row count, file size, and lifecycle information.
 *
 * @param domo_api_token - Developer token authenticated via `X-DOMO-Developer-Token` header.
 * @param datasetId      - ID of the Domo dataset whose metadata should be retrieved.
 *
 * @returns An object containing the complete metadata payload for the dataset.
 *
 * @throws Re-throws Axios errors with original HTTP status intact —
 *         a 404 means the dataset does not exist or is inaccessible.
 *
 * @agent
 *   CREDENTIALS (check cache/memory first):
 *   - `domo_api_token` — only ask if not already cached from a prior tool
 *                        call in this session. Prompt: "Please provide your
 *                        Domo Developer Token to continue."
 *                        Never ask again once cached for the session.
 *
 *   NOTE: This tool is a safe entry point — it has no prerequisite calls.
 *   Use it first whenever you need to confirm a dataset exists, inspect its
 *   structure, or resolve a dataset name to an ID before calling other tools.
 *
 *   COLLECT FROM USER BEFORE INVOKING:
 *   - `datasetId` — ask "Which dataset's metadata should be retrieved?"
 *                   Accept dataset name and resolve to ID if needed.
 *
 *   SUGGESTED FOLLOW-UPS AFTER SUCCESS:
 *   - `get_dataset_schema_latest` — retrieve the latest authoritative column schema.
 *   - `get_dataset_schema`   — retrieve the indexed column list to prepare
 *     SQL queries (the schema here may differ from the query-engine schema).
 *   - `get_cards_for_dataset` — list visualizations built on this dataset.
 *
 * @example
 * const metadata = await getDatasetMetadata(token, "abc-123-def");
 * // metadata → {
 * //   id: "abc-123-def",
 * //   name: "Sales Data",
 * //   row_count: 12345,
 * //   schema: { columns: [{ name: "id", type: "INT" }, ...] },
 * //   statistics: { id: { mean: 1234.5, stddev: 567.8 } },
 * //   ...etc
 * // }
 */
export const getDatasetMetadata = async (
    domo_api_token: string,
    datasetId: string
) => {
    const url = `${constants.getInstanceUrl()}/api/data/v3/datasources/${datasetId}`;

    try {
        const response = await axios.get(url, {
            headers: {
                "X-DOMO-Developer-Token": domo_api_token
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching dataset metadata:", error);
        throw error;
    }
};