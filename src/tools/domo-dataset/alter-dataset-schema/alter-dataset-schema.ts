import axios from "axios";
import { constants } from "../../../config/const.conf.js";

/**
 * Alters the schema of an existing Domo dataset by adding or modifying columns.
 *
 * This endpoint replaces the dataset's column schema with the `columns`
 * array provided — it is not a partial patch. Any existing column not
 * included in the new `columns` array may be dropped from the schema, and
 * any column included with the same `id`/`name` as an existing one will be
 * altered (e.g. type change) rather than duplicated. Because of this,
 * the latest schema (`get_dataset_schema_latest`) MUST be fetched first so
 * existing columns can be merged into the request rather than accidentally omitted.
 *
 * After a successful schema alteration, the dataset typically needs to be
 * re-indexed before SQL queries reflect the new structure.
 *
 * @param domo_api_token - Session/developer token sent via
 *                         `x-domo-authentication` header (per this endpoint's
 *                         documented security scheme).
 * @param datasetId      - ID of the existing dataset whose schema is being altered.
 * @param columns        - Full array of column definitions representing the
 *                         desired end-state schema. Each column requires
 *                         `name` and `type` (STRING | LONG | DOUBLE | DATE |
 *                         DATETIME). `id`, `visible`, and `order` are optional
 *                         but should be included when modifying an existing
 *                         column to avoid Domo treating it as a new one.
 *
 * @returns Confirmation of the schema update (200 on success). Domo does not
 *          return the full updated schema in the response body — call
 *          `get_dataset_schema_latest` afterward to verify the change took effect.
 *
 * @throws Re-throws Axios errors — a 400 typically means an invalid column
 *         `type` or malformed schema; a 401 means the token lacks access to
 *         this dataset; a 404 means the datasetId doesn't exist.
 *
 * @agent
 *   CREDENTIALS (check cache/memory first):
 *   - `domo_api_token` — only ask if not cached. Prompt: "Please provide
 *                        your Domo Developer Token to continue."
 *
 *   PREREQUISITE CALLS (invoke before building the columns array):
 *   1. `get_dataset_metadata` — REQUIRED. Confirm the dataset exists and
 *        resolve its `datasetId` if the user only gave a name.
 *   2. `get_dataset_schema_latest` — REQUIRED. Fetch the CURRENT latest schema first.
 *        This call replaces the schema wholesale, so any existing column
 *        omitted from the new `columns` array risks being dropped. Merge
 *        the fetched columns with the user's requested additions/changes
 *        before invoking this tool — do not submit a partial schema unless
 *        the user explicitly confirms they want existing columns removed.
 *
 *   COLLECT FROM USER BEFORE INVOKING:
 *   - `datasetId` — ask "Which dataset's schema do you want to alter?" if
 *                   not already known from context.
 *   - `columns`   — ask "What columns do you want to add or change?" Once
 *                   gathered, merge with the existing schema (from the
 *                   prerequisite call above) and confirm the final combined
 *                   list with the user before sending, especially if any
 *                   existing column would be dropped.
 *
 *   SUGGESTED FOLLOW-UPS AFTER SUCCESS:
 *   1. `get_dataset_schema_latest` — re-fetch to confirm the alteration applied
 *      correctly in Domo's metadata store.
 *   2. `index_dataset_for_query` — re-index the dataset so the new/altered
 *      columns are reflected in SQL queries.
 *   3. `get_dataset_schema` — call to verify if the query engine has indexed
 *      the changes.
 *   4. `query_with_sql` — once re-indexed, queries can reference the
 *      updated columns.
 */
export const alterDatasetSchema = async (
    domo_api_token: string,
    datasetId: string,
    columns: Array<{
        name: string;
        type: "STRING" | "LONG" | "DOUBLE" | "DATE" | "DATETIME";
        id?: string;
        visible?: boolean;
        order?: number;
    }>
) => {
    const url = `${constants.getInstanceUrl()}/api/data/v2/datasources/${datasetId}/schemas`;

    try {
        const response = await axios.post(
            url,
            { columns },
            {
                headers: {
                    "Content-Type": "application/json",
                    "x-domo-authentication": domo_api_token
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error("Error altering dataset schema:", error);
        throw error;
    }
};
