import { z } from "zod";
import { getAccountById } from "./get-account.js";

export const getAccountByIdTool = {
    name: "get_account_by_id",
    definition: {
        title: "Get Account By ID",
        description: "Retrieves full details for a specific Domo account by its ID, including display name and active status. Use getAllAccounts first if only the account name is known.",
        inputSchema: z.object({
            domo_api_token: z.string().describe("Domo Developer Token"),
            account_id: z.string().describe("Unique identifier of the Domo account to retrieve"),
        })
    },
    /**
     * @agent
     *   CREDENTIALS (check cache/memory first):
     *   - `domo_api_token` — only ask if not cached. Prompt: "Please provide
     *                        your Domo Developer Token to continue."
     *
     *   COLLECT FROM USER BEFORE INVOKING:
     *   - `account_id` — ask "Which account should be retrieved?" If the user
     *                    provides a name, run `get_all_accounts` first to
     *                    resolve the correct `accountId`.
     *
     *   SUGGESTED FOLLOW-UPS AFTER SUCCESS:
     *   - If `status` is not `Active`, surface that to the user before
     *     attempting connector or dataset operations on this account.
     */
    handler: async ({ domo_api_token, account_id }: any) => {
        const result = await getAccountById(domo_api_token, account_id);
        return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }]
        };
    }
} as const;