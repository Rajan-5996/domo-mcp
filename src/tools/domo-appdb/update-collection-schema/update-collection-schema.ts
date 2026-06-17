import axios from "axios";
import { constants } from "../../../config/const.conf.js";

/**
 * Supported Domo AppDB column data types.
 *
 * Maps directly to Domo's type system — choose based on the data
 * being stored to ensure correct indexing and query behaviour.
 *
 * - `STRING`   — text values, names, IDs, categorical data
 * - `LONG`     — whole numbers, counts, timestamps (epoch ms)
 * - `DECIMAL`  — fixed-precision numbers, currency
 * - `DOUBLE`   — floating-point numbers, percentages, ratios
 * - `DATE`     — calendar dates without time (YYYY-MM-DD)
 * - `DATETIME` — full timestamp with time component
 */
export type CollectionColumnType =
    | "STRING"
    | "LONG"
    | "DECIMAL"
    | "DOUBLE"
    | "DATE"
    | "DATETIME";

/**
 * Definition of a single column in an AppDB collection schema.
 *
 * @property name    - Field name as it appears in stored documents.
 * @property type    - Data type enforced by Domo on writes. See {@link CollectionColumnType}.
 * @property visible - Whether this column is exposed in Domo's UI. Defaults to `true`.
 */
export interface CollectionColumn {
    name: string;
    type: CollectionColumnType;
    visible?: boolean;
}

/**
 * Request payload for updating an AppDB collection schema.
 *
 * @property schema      - Column definitions that replace the existing schema.
 * @property syncEnabled - When `true`, Domo syncs this collection to a
 *                         backing dataset for use in cards and Beast Modes.
 */
export interface CollectionSchemaRequest {
    schema: {
        columns: CollectionColumn[];
    };
    syncEnabled?: boolean;
}

/**
 * Updates the schema of an existing Domo AppDB collection.
 *
 * Schema updates use **PUT semantics** — the full schema is replaced, not
 * merged. Every column the collection should have must be included in the
 * request, including existing ones. Omitted columns may be dropped by Domo.
 *
 * Setting `syncEnabled: true` causes Domo to mirror the collection into a
 * regular Domo dataset, making its data available to cards, dashboards,
 * and Beast Mode calculations — a critical step when bridging AppDB data
 * into Domo's visualisation layer.
 *
 * @param domo_api_token - Developer token authenticated via `X-DOMO-Developer-Token` header.
 * @param collectionId   - ID of the collection whose schema is being updated.
 * @param schema         - Full replacement schema conforming to {@link CollectionSchemaRequest}.
 *
 * @returns The updated collection object as confirmed by Domo (HTTP 200).
 *
 * @throws Re-throws Axios errors with original HTTP status intact —
 *         a 400 typically means an invalid column type or malformed schema.
 *
 * @agent
 *   CREDENTIALS (check cache/memory first):
 *   - `domo_api_token` — only ask if not already cached from a prior tool
 *                        call in this session. Prompt: "Please provide your
 *                        Domo Developer Token to continue."
 *                        Never ask again once cached for the session.
 *
 *   COLLECT FROM USER BEFORE INVOKING:
 *   - `collectionId`  — ask "Which collection's schema should be updated?"
 *                       or resolve from a prior `list_collections` call.
 *   - `columns`       — ask "What fields should this collection have?"
 *                       For each field collect: name, type (STRING / LONG /
 *                       DECIMAL / DOUBLE / DATE / DATETIME), and visibility.
 *   - `syncEnabled`   — ask "Should this collection sync to a Domo dataset
 *                       for use in cards and dashboards?" (yes/no).
 *
 *   CONFIRM BEFORE EXECUTING:
 *   - Show the full column list and warn: "This replaces the existing schema.
 *     Any columns not included here may be removed. Confirm?"
 *
 *   SUGGESTED FOLLOW-UPS AFTER SUCCESS:
 *   - `getAllDocuments` — verify existing documents still conform to the new schema.
 *   - `queryDocument`  — test a field query against the updated schema.
 *
 * @example
 * await updateCollectionSchema(token, "col_abc123", {
 *   schema: {
 *     columns: [
 *       { name: "deal",   type: "STRING",  visible: true },
 *       { name: "value",  type: "DECIMAL", visible: true },
 *       { name: "stage",  type: "STRING",  visible: true },
 *       { name: "closed", type: "DATE",    visible: false }
 *     ]
 *   },
 *   syncEnabled: true
 * });
 */
export const updateCollectionSchema = async (
    domo_api_token: string,
    collectionId: string,
    schema: CollectionSchemaRequest
) => {
    const url = `${constants.getInstanceUrl()}/api/datastores/v1/collections/${collectionId}`;

    try {
        const response = await axios.put(url, schema, {
            headers: {
                "Content-Type": "application/json",
                "X-DOMO-Developer-Token": domo_api_token
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error updating collection schema:", error);
        throw error;
    }
};
