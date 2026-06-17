import axios from "axios";
import { constants } from "../../../config/const.conf.js";

/**
 * Updates the properties of a Domo dataset, such as the data provider type.
 *
 * `dataProviderType` controls how Domo classifies and manages the dataset's
 * ingestion pipeline. Changing it reassigns ownership of data flow —
 * for example, switching to `domo-jupyterdata` hands control to a Jupyter
 * notebook pipeline instead of Domo's default connector.
 *
 * @param domo_api_token   - Developer token via `X-DOMO-Developer-Token` header.
 * @param datasetId        - ID of the dataset whose properties are being updated.
 * @param dataProviderType - Provider type string e.g. `domo-jupyterdata`, `api`, `file-upload`.
 *
 * @returns Updated properties object as confirmed by Domo (HTTP 200).
 *
 * @throws Re-throws Axios errors — a 404 means the dataset does not exist.
 *
 * @agent
 *   CREDENTIALS (check cache/memory first):
 *   - `domo_api_token` — only ask if not cached. Prompt: "Please provide
 *                        your Domo Developer Token to continue."
 *
 *   PREREQUISITE CALLS (invoke before changing any dataset property):
 *   1. `get_dataset_metadata` — REQUIRED. Call first to capture the dataset's
 *        current state (name, row count, existing provider type). A 404 here
 *        means the datasetId is wrong. Store the current `dataProviderType`
 *        so the change can be confirmed or rolled back by the user.
 *
 *   COLLECT FROM USER BEFORE INVOKING:
 *   - `datasetId`        — ask "Which dataset's properties should be updated?"
 *   - `dataProviderType` — ask "What should the data provider type be set to?"
 *                          Common values: `domo-jupyterdata`, `api`, `file-upload`.
 *
 *   CONFIRM BEFORE EXECUTING:
 *   - Changing `dataProviderType` affects how Domo manages data ingestion.
 *     Confirm the new value with the user and show them the current value
 *     retrieved in the prerequisite step before applying.
 *
 *   SUGGESTED FOLLOW-UPS AFTER SUCCESS:
 *   1. `get_dataset_metadata`    — verify the updated `dataProviderType` is
 *        reflected in the dataset's properties.
 *   2. `index_dataset_for_query` — re-index via the query engine if the
 *        provider change may have affected the dataset structure.
 *   3. `get_dataset_schema`      — confirm the schema is consistent after
 *        re-indexing before running any SQL queries.
 */
export const changeDatasetProperties = async (
    domo_api_token: string,
    datasetId: string,
    dataProviderType: string
) => {
    const url = `${constants.getInstanceUrl()}/api/data/v3/datasources/${datasetId}/properties`;
    try {
        const response = await axios.put(url, { dataProviderType }, {
            headers: {
                "Content-Type": "application/json",
                "X-DOMO-Developer-Token": domo_api_token
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error changing dataset properties:", error);
        throw error;
    }
};