import axios from "axios";
import { constants } from "../../../config/const.conf.js";

/**
 * Initiates an asynchronous export of a Domo dataset to an S3 bucket.
 *
 * Only one active export can run per dataset at a time. If the underlying
 * data hasn't changed since the last export, Domo returns the previous
 * export's status info instead of starting a new one. Because this is
 * asynchronous, a `200` response does not mean the export has finished —
 * check `exportStatus` in the response (`none` | `success` | `running` |
 * `failed`) and poll if it comes back as `running`.
 *
 * SECURITY — AWS CREDENTIALS:
 * This function requires `awsAccessKey` and `awsAccessSecret` with
 * `s3:PutObject` permission scoped to the target bucket/path. These should
 * be sourced from environment variables or a secrets manager — never
 * collected via chat prompts and never written to a temporary file on disk.
 * Writing secrets to disk "temporarily" and deleting them afterward is not
 * a safe pattern: a crash between write and delete leaves plaintext
 * credentials on disk, and `rm` does not securely scrub file contents.
 * Prefer short-lived/scoped credentials (e.g. an IAM role or STS token
 * limited to this bucket) over long-lived IAM user keys where possible.
 *
 * @param domo_api_token  - Developer token sent via `X-DOMO-Developer-Token` header.
 * @param datasourceId    - ID of the dataset to export.
 * @param awsAccessKey    - AWS Access Key ID. Source from env var / secrets
 *                          manager — never from chat or a temp file.
 * @param awsAccessSecret - AWS Secret Access Key. Same sourcing rule as above.
 * @param bucket          - Target S3 bucket name.
 * @param path            - Destination path within the bucket.
 * @param region          - AWS region of the bucket.
 * @param queryRequest    - Query definition controlling which columns are
 *                          exported, plus `includeBOM` and `useCache` flags.
 *                          `groupByColumns`/`orderByColumns` may be left empty.
 *
 * @returns An `ExportStatus` object: `exportId`, `exportStatus`, `bucket`,
 *          `exportFormat`, `compression`, `started`/`finished` timestamps,
 *          `urlRowCountMap`, and `errorCode`/`message` if applicable.
 *
 * @throws Re-throws Axios errors — 400 means the export request was
 *         malformed (e.g. bad query definition); 401 means an invalid/expired
 *         token; 403 means insufficient export permissions; 404 means the
 *         datasourceId doesn't exist; 500 is an unexpected server error.
 *
 * @agent
 *   CREDENTIALS (check cache/memory first — see security note above):
 *   - `domo_api_token`  — only ask if not cached. Prompt: "Please provide
 *                         your Domo Developer Token to continue."
 *   - `awsAccessKey` / `awsAccessSecret` — DO NOT prompt the user to paste
 *         these into chat, and DO NOT write them to a temporary file on
 *         disk. Source them from environment variables (e.g.
 *         `process.env.AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`) or a
 *         secrets manager already configured in this environment. If
 *         neither is available, tell the user: "This export needs AWS
 *         credentials with S3 write access. I'd recommend setting them as
 *         environment variables (or in a secrets manager) rather than
 *         sharing them here — want help wiring that up?" Do not proceed
 *         with chat-provided or file-staged credentials.
 *
 *   PREREQUISITE CALLS:
 *   - `get_dataset_metadata` — confirm the dataset exists and resolve
 *        `datasourceId` if the user only gave a name.
 *   - `get_dataset_schema_latest` — recommended if the user isn't sure of
 *        exact column names for `queryRequest.query.columns`; column names
 *        must match the dataset schema exactly.
 *
 *   COLLECT FROM USER BEFORE INVOKING:
 *   - `datasourceId` — ask "Which dataset should be exported?"
 *   - `bucket`, `path`, `region` — ask "Which S3 bucket, path, and AWS
 *                       region should the export be written to?"
 *   - `queryRequest.query.columns` — ask "Which columns should be included
 *                       in the export?" Default `includeBOM` and `useCache`
 *                       to `true` unless the user specifies otherwise.
 *
 *   SUGGESTED FOLLOW-UPS AFTER SUCCESS:
 *   - If `exportStatus` is `running`, inform the user the export is in
 *     progress and offer to check back, since this endpoint returns
 *     immediately rather than blocking until completion. (No separate
 *     "get export status" endpoint is documented here — if one exists in
 *     your tool set, call it; otherwise re-invoke this same export request,
 *     which returns prior status info if data hasn't changed.)
 *   - Surface `exportId` to the user for reference if they need to track
 *     or troubleshoot this specific export later.
 */
export const createExport = async (
    domo_api_token: string,
    datasourceId: string,
    params: {
        awsAccessKey: string;
        awsAccessSecret: string;
        bucket: string;
        path: string;
        region: string;
        queryRequest: {
            includeBOM?: boolean;
            useCache?: boolean;
            query: {
                columns: Array<{ column: string; exprType: "COLUMN" }>;
                groupByColumns?: unknown[];
                orderByColumns?: unknown[];
            };
        };
    }
) => {
    const url = `${constants.getInstanceUrl()}/api/query/v1/export/${datasourceId}`;

    try {
        const response = await axios.post(url, params, {
            headers: {
                "Content-Type": "application/json",
                "X-DOMO-Developer-Token": domo_api_token
            }
        });
        return response.data;
    } catch (error) {
        console.error("Error creating dataset export:", error);
        throw error;
    }
};
