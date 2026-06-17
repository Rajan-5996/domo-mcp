import axios from "axios";
import { constants } from "../../../config/const.conf.js";

/**
 * Retrieves all cards associated with a specific Domo dataset.
 *
 * In Domo's content hierarchy, a **card** is a visualisation built on top
 * of a dataset — charts, tables, metrics, and custom apps are all cards.
 * This endpoint returns every card that references the given dataset,
 * optionally including drill-path cards nested within parent cards.
 *
 * @param domo_api_token - Developer token authenticated via `X-DOMO-Developer-Token` header.
 * @param datasetId      - ID of the Domo dataset whose cards should be retrieved.
 * @param drill          - When `true`, includes drill-path child cards in the response.
 *                         Defaults to `true` to return the full card tree.
 *
 * @returns Array of card objects associated with the dataset.
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
 *   PREREQUISITE CALLS (invoke before fetching cards):
 *   1. `get_dataset_metadata` — RECOMMENDED. Call first to confirm the dataset
 *        exists, retrieve its human-readable name, and get the row count.
 *        A 404 here means the datasetId is wrong before wasting a cards call.
 *
 *   COLLECT FROM USER BEFORE INVOKING:
 *   - `datasetId` — ask "Which dataset's cards should be retrieved?"
 *                   Accept dataset name and resolve to ID if needed.
 *   - `drill`     — ask "Should drill-path cards be included?" Defaults to true.
 *
 *
 * @example
 * const cards = await getCardsByDataset(token, "abc-123-def");
 * // cards → [{ id: "card_1", title: "Revenue Chart", type: "BAR" }, ...]
 */
export const getCardsForDataset = async (
    domo_api_token: string,
    datasetId: string,
    drill: boolean = true
) => {
    const url = `${constants.getInstanceUrl()}/api/content/v1/datasources/${datasetId}/cards`;

    try {
        const response = await axios.get(url, {
            headers: {
                "X-DOMO-Developer-Token": domo_api_token
            },
            params: { drill }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching cards for dataset:", error);
        throw error;
    }
};