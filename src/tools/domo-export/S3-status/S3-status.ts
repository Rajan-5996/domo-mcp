import axios from "axios";
import { constants } from "../../../config/const.conf.js";

/**
 * Checks the status of exports for a given Domo dataset.
 *
 * This is the polling counterpart to `createExport` (same path, GET instead
 * of POST). Since exports run asynchronously, use this to check whether a
 * previously initiated export has finished. Returns an array of export
 * statuses — historical exports for this dataset may be included, not just
 * the most recent one — so the caller should typically sort by `started`
 * (descending) or match on a known `exportId` to find the relevant entry.
 *
 * @param domo_api_token - Developer token sent via `X-DOMO-Developer-Token` header.
 * @param datasourceId   - ID of the dataset whose export status should be checked.
 *
 * @returns An array of `ExportStatus` objects, each with `exportId`,
 *          `exportStatus` (`none` | `success` | `running` | `failed`),
 *          `bucket`, `exportFormat`, `compression`, `started`/`finished`
 *          timestamps, `urlRowCountMap`, and `errorCode`/`message` if
 *          the export failed.
 *
 * @throws Re-throws Axios errors — 401 means an invalid/expired token;
 *         403 means insufficient export permissions; 404 means the
 *         datasourceId doesn't exist; 500 is an unexpected server error.
 *
 * @agent
 *   CREDENTIALS (check cache/memory first):
 *   - `domo_api_token` — only ask if not cached. Prompt: "Please provide
 *                        your Domo Developer Token to continue."
 *
 *   PREREQUISITE CALLS:
 *   - `create_export` — REQUIRED in practice. This tool only reports status
 *        on exports that have already been initiated; if no export has
 *        been started for this dataset, the returned array may be empty
 *        or contain only a `none` status. If the user hasn't run an export
 *        yet, suggest `create_export` instead of calling this directly.
 *
 *   COLLECT FROM USER BEFORE INVOKING:
 *   - `datasourceId` — ask "Which dataset's export status would you like
 *                      to check?" if not already known from context (e.g.
 *                      from a prior `create_export` call in this session).
 *
 *   SUGGESTED FOLLOW-UPS AFTER SUCCESS:
 *   - If the relevant export's `exportStatus` is `running`, inform the user
 *     it's still in progress and offer to check again after a short wait —
 *     do not tight-loop this call; space out polling attempts.
 *   - If `exportStatus` is `failed`, surface `errorCode` and `message` to
 *     the user and offer to retry via `create_export`.
 *   - If `exportStatus` is `success`, surface `urlRowCountMap` so the user
 *     knows how many rows landed at each exported file location.
 */
export const getExportStatus = async (
    domo_api_token: string,
    datasourceId: string
) => {
    const url = `${constants.getInstanceUrl()}/api/query/v1/export/${datasourceId}`;

    try {
        const response = await axios.get(url, {
            headers: {
                "X-DOMO-Developer-Token": domo_api_token
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error retrieving export status:", error);
        throw error;
    }
};
