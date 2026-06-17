import axios from "axios";
import { constants } from "../../../config/const.conf.js";

/**
 * Retrieves the latest (authoritative) schema definition for a Domo dataset.
 *
 * NOTE — distinct from `getDatasetSchema` (indexed schema endpoint):
 * This endpoint (`/schemas/latest`) reflects the dataset's current schema
 * as defined in Domo's metadata store — the same source of truth that
 * `alterDatasetSchema` writes to. It includes column-level metadata
 * (`colLabel`, `colFormat`, `isEncrypted`) not present in the query-engine's
 * indexed schema. Use THIS endpoint when you need to inspect or validate a
 * dataset's structure before altering it (e.g. as a prerequisite for
 * `alter_dataset_schema`). Use the indexed schema endpoint when you need to
 * confirm what's actually queryable via SQL right now, since indexing can
 * lag behind the latest schema after a recent alteration.
 *
 * @param domo_api_token - Developer token sent via `X-DOMO-Developer-Token` header.
 * @param datasetId      - ID of the dataset whose latest schema should be retrieved.
 *
 * @returns An object with a `schema.columns` array. Each column includes
 *          `type`, `name`, `id`, `visible`, and a `metadata` object
 *          (`colLabel`, `colFormat`, `isEncrypted`).
 *
 * @throws Re-throws Axios errors — a 401 means the token is invalid or lacks
 *         access to this dataset; a 404 means the datasetId doesn't exist.
 *
 * @agent
 *   CREDENTIALS (check cache/memory first):
 *   - `domo_api_token` — only ask if not cached. Prompt: "Please provide
 *                        your Domo Developer Token to continue."
 *
 *   PREREQUISITE CALLS:
 *   - `get_dataset_metadata` — optional. Confirm the dataset exists and
 *        resolve its `datasetId` if the user only gave a name.
 *
 *   COLLECT FROM USER BEFORE INVOKING:
 *   - `datasetId` — ask "Which dataset's current schema would you like to see?"
 *                   if not already known from context.
 *
 *   SUGGESTED FOLLOW-UPS AFTER SUCCESS:
 *   - `alter_dataset_schema` — if the user wants to modify the schema, use
 *     this result as the base to merge changes into (since that endpoint
 *     replaces the schema wholesale).
 *   - `get_dataset_schema` (indexed) — if the user wants to confirm what's
 *     currently queryable via SQL, which may lag behind this "latest" view
 *     until the dataset is re-indexed.
 *   - `index_dataset_for_query` — if the latest schema was just altered and
 *     the indexed/query-engine view needs to catch up.
 */
export const getDatasetSchemaLatest = async (
    domo_api_token: string,
    datasetId: string
) => {
    const url = `${constants.getInstanceUrl()}/api/data/v2/datasources/${datasetId}/schemas/latest`;

    try {
        const response = await axios.get(url, {
            headers: {
                "X-DOMO-Developer-Token": domo_api_token
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error retrieving latest dataset schema:", error);
        throw error;
    }
};
