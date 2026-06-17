import axios from "axios";
import { constants } from "../../../config/const.conf.js";

/**
 * Creates (adds) tags on an existing Domo dataset.
 *
 * Tags are simple string labels used for organization/discovery in Domo's
 * UI — they are unrelated to the dataset's column schema. The request body
 * is a plain JSON array of strings, not a wrapped object. Based on the
 * endpoint name ("Create Dataset Tag") this is additive — existing tags on
 * the dataset are expected to remain, with the new ones appended — but this
 * is not explicitly confirmed in the documentation, so behavior should be
 * verified empirically (see note below) before assuming tags are never
 * overwritten.
 *
 * @param domo_api_token - Developer token sent via `X-DOMO-Developer-Token` header.
 * @param datasetId      - ID of the existing dataset to tag.
 * @param tags           - Array of tag strings to add, e.g. ["tag1", "tag2"].
 *
 * @returns Confirmation of tag creation (200 on success). The response body
 *          is not documented to include the full updated tag list — call
 *          `get_dataset_metadata` afterward if you need to confirm the
 *          dataset's current tags.
 *
 * @throws Re-throws Axios errors — a 400 typically means a malformed tag
 *         array (e.g. non-string entries); a 401 means the token lacks
 *         access to this dataset; a 404 means the datasetId doesn't exist.
 *
 * @agent
 *   CREDENTIALS (check cache/memory first):
 *   - `domo_api_token` — only ask if not cached. Prompt: "Please provide
 *                        your Domo Developer Token to continue."
 *
 *   PREREQUISITE CALLS (recommended, not strictly required):
 *   1. `get_dataset_metadata` — confirm the dataset exists and resolve its
 *        `datasetId` if the user only gave a name. Tags are low-risk
 *        additive metadata, so this is a soft prerequisite rather than a
 *        hard one — but calling it avoids tagging the wrong dataset by ID
 *        typo, and surfaces any existing tags so duplicates aren't added.
 *
 *   COLLECT FROM USER BEFORE INVOKING:
 *   - `datasetId` — ask "Which dataset should these tags be added to?" if
 *                   not already known from context.
 *   - `tags`      — ask "What tag(s) would you like to add?" Accept either
 *                   a single tag or a list; normalize to a string array
 *                   before invoking.
 *
 *   SUGGESTED FOLLOW-UPS AFTER SUCCESS:
 *   - `get_dataset_metadata` — re-fetch to confirm the new tags appear
 *     alongside any pre-existing ones.
 */
export const createDatasetTag = async (
    domo_api_token: string,
    datasetId: string,
    tags: string[]
) => {
    const url = `${constants.getInstanceUrl()}/api/data/ui/v3/datasources/${datasetId}/tags`;

    try {
        const response = await axios.post(url, tags, {
            headers: {
                "Content-Type": "application/json",
                "X-DOMO-Developer-Token": domo_api_token
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error creating dataset tag:", error);
        throw error;
    }
};