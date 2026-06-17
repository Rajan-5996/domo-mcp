import axios from "axios";
import { constants } from "../../../config/const.conf.js";

/**
 * Creates a new Domo dataset by copying a schema definition into a fresh
 * dataset with its own metadata.
 *
 * "Copy" here refers to replicating a column structure (e.g. one borrowed
 * from an existing dataset's schema via `get_dataset_schema_latest`) into a brand
 * new dataset. The endpoint itself does not take a source dataset ID — the
 * caller is responsible for supplying the `columns` array, which is
 * typically copied from another dataset's schema output before being
 * passed in here. The resulting dataset is created empty (no rows) and
 * is independent of any original source after creation.
 *
 * @param domo_api_token  - Developer token sent via `X-DOMO-Developer-Token` header.
 * @param dataSourceName  - Display name for the new (copied) dataset (e.g. "hello world").
 * @param columns         - Array of column definitions to copy into the new dataset.
 *                          Each column requires `name` and `type`
 *                          (STRING | LONG | DOUBLE | DATE | DATETIME).
 *                          `id`, `visible`, and `order` are optional and are
 *                          usually carried over verbatim when copying from
 *                          an existing dataset's schema.
 * @param userDefinedType - Dataset type identifier. Defaults to "api", which is
 *                          correct for datasets populated programmatically.
 *
 * @returns The newly created dataset object, including its generated `id`,
 *          which should be captured immediately for use in subsequent calls
 *          (indexing, querying, appending rows, sharing, etc).
 *
 * @throws Re-throws Axios errors — a 400 typically means an invalid column
 *         `type` or a malformed schema; a 401 means the token is invalid or
 *         lacks dataset-creation permission.
 *
 * @agent
 *   CREDENTIALS (check cache/memory first):
 *   - `domo_api_token` — only ask if not cached. Prompt: "Please provide
 *                        your Domo Developer Token to continue."
 *
 *   PREREQUISITE CALLS (only if copying an existing dataset's structure):
 *   1. `get_dataset_schema_latest` — call this FIRST if the user wants to copy the
 *        column structure of an existing dataset. Use the returned
 *        `columns` array as the input to this tool, optionally stripping
 *        `id`/`order` if a clean slate is preferred.
 *   2. `get_dataset_metadata` — optional; call this if the user only gave a
 *        dataset name and you need to resolve it to a `datasetId` before
 *        fetching its schema.
 *   If the user is instead defining a brand new column structure from
 *   scratch (not copying from anywhere), skip both of the above and go
 *   straight to invoking this tool.
 *
 *   COLLECT FROM USER BEFORE INVOKING:
 *   - `dataSourceName` — ask "What should the new (copied) dataset be named?"
 *   - `columns`         — if not copying from an existing schema, ask "What
 *                         columns should this dataset have, and what type is
 *                         each (STRING, LONG, DOUBLE, DATE, DATETIME)?"
 *                         Confirm at least one column is provided; Domo will
 *                         reject an empty schema.
 *   - `userDefinedType` — optional; only ask if the user mentions a non-API
 *                         data source type. Otherwise default to "api" silently.
 *
 *   SUGGESTED FOLLOW-UPS AFTER SUCCESS:
 *   1. Capture the returned `id` (dataSourceId) and surface it to the user —
 *      they will need it for every subsequent operation on this dataset.
 *   2. If the user intends to load data immediately, guide them to the
 *      appropriate data-import/stream tool to append rows.
 *   3. `index_dataset_for_query` — once rows exist, the new dataset must be
 *      indexed before SQL queries will work.
 *   4. `get_dataset_schema_latest` — after indexing, confirm the copied schema is
 *      queryable and matches what was defined here.
 *   5. `query_with_sql` — once indexed, the dataset can be queried using
 *      `dataSourceName` as the table name.
 */
export const createDatasetCopy = async (
    domo_api_token: string,
    dataSourceName: string,
    columns: Array<{
        name: string;
        type: "STRING" | "LONG" | "DOUBLE" | "DATE" | "DATETIME";
        id?: string;
        visible?: boolean;
        order?: number;
    }>,
    userDefinedType: string = "api"
) => {
    const url = `${constants.getInstanceUrl()}/api/data/v2/datasources`;

    try {
        const response = await axios.post(
            url,
            {
                userDefinedType,
                dataSourceName,
                schema: { columns }
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "X-DOMO-Developer-Token": domo_api_token
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error("Error creating dataset copy:", error);
        throw error;
    }
};
