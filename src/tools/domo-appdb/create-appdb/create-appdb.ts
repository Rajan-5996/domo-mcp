import axios from "axios";
import { constants } from "../../../config/const.conf.js";
import { AppDbSchema } from "../../../types/tools/appdb.js";

/**
 * Domo AppDB REST API base URL derived from the configured instance.
 * AppDB (Application Database) is Domo's schemaless document store
 * built on top of datastores and collections — analogous to MongoDB
 * databases and collections respectively.
 *
 * @see https://developer.domo.com/portal/8ba9bdb569b1e-app-db
 */
const DOMO_API_URL = constants.getInstanceUrl() + `/api/datastores/v1`;

/**
 * Creates a fully initialised Domo AppDB datastore with a single collection.
 *
 * Domo AppDB follows a two-level hierarchy:
 *   Datastore  →  a named container, equivalent to a database.
 *   Collection →  a schematised document store within a datastore,
 *                 equivalent to a table or collection.
 *
 * This function orchestrates both creation steps sequentially — the
 * datastore must exist before a collection can be attached to it.
 *
 * @param domo_api_token  - Developer token issued by Domo for authenticating
 *                          against instance-scoped API endpoints. Passed via
 *                          the `X-DOMO-Developer-Token` header.
 * @param datastore_name  - Human-readable label for the new datastore.
 *                          Must be unique within the Domo instance.
 * @param AppDb           - Collection schema definition conforming to
 *                          {@link AppDbSchema}. Describes the document
 *                          structure Domo will enforce on writes.
 *
 * @returns A promise resolving to an object containing:
 *   - `datastore`  — the raw Domo API response for the created datastore.
 *   - `collection` — the raw Domo API response for the created collection.
 *
 * @throws Will re-throw any Axios error encountered during either the
 *         datastore or collection creation step, preserving the original
 *         HTTP status and response payload for upstream handling.
 *
 * @example
 * const result = await createAppDB(token, "sales-store", {
 *   name: "opportunities",
 *   schema: { columns: [{ name: "deal", type: "STRING" }] }
 * });
 * console.log(result.datastore.id, result.collection.id);
 *
 * @agent
 *   CREDENTIALS (check cache/memory first):
 *   - `domo_api_token` — only ask if not already cached from a prior tool
 *                        call in this session. Prompt: "Please provide your
 *                        Domo Developer Token to continue."
 *                        Never ask again once cached for the session.
 *
 *   CONFIRM BEFORE EXECUTING:
 *   - This tool creates infrastructure in Domo. Confirm intent before
 *     invoking it if the operation is initiated autonomously.
 *
 *   SUGGESTED FOLLOW-UPS AFTER SUCCESS:
 *   - `getAllDocuments` — verify documents can be created inside the new collection.
 *   - `queryDocument`  — confirm the collection schema behaves as expected.
 */
export const createAppDB = async (domo_api_token: string, datastore_name: string, AppDb: AppDbSchema) => {

    /**
     * Step 1 — POST /api/datastores/v1
     *
     * Provisions a new named datastore on the Domo instance.
     * Returns the full datastore object including the system-assigned `id`
     * required to scope all subsequent collection operations.
     */
    const createDatastore = async () => {
        try {
            const response = await axios.post(DOMO_API_URL, {
                name: datastore_name
            }, {
                headers: {
                    "Content-Type": "application/json",
                    "X-DOMO-Developer-Token": domo_api_token
                }
            });
            return response.data;
        } catch (error) {
            console.error("Error creating app DB:", error);
            throw error;
        }
    }

    /**
     * Step 2 — POST /api/datastores/v1/:datastoreId/collections/
     *
     * Attaches a new collection to an existing datastore. The collection
     * schema (`AppDb`) defines the document shape Domo will validate
     * on every subsequent document write to this collection.
     *
     * @param datastoreId - System-assigned ID returned by {@link createDatastore}.
     */
    const createCollection = async (datastoreId: string) => {
        try {
            const collectionsUrl = `${DOMO_API_URL}/${datastoreId}/collections/`;
            const response = await axios.post(collectionsUrl, AppDb, {
                headers: {
                    "Content-Type": "application/json",
                    "X-DOMO-Developer-Token": domo_api_token
                }
            });
            return response.data;
        } catch (error) {
            console.error("Error creating collection:", error);
            throw error;
        }
    }

    return Promise.resolve()
        .then(() => createDatastore())
        .then((datastoreResponse) => {
            const datastoreId = datastoreResponse.id;
            return Promise.all([
                Promise.resolve(datastoreResponse),
                createCollection(datastoreId)
            ]);
        })
        .then(([datastore, collection]) => {
            return {
                datastore,
                collection
            };
        })
        .catch((error) => {
            console.error("Error in createAppDB:", error);
            throw error;
        });
};
