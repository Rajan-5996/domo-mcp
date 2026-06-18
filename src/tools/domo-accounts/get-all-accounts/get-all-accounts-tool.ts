import { z } from "zod";
import { getAllAccounts } from "./get-all-accounts.js";

export const getAllAccountsTool = {
    name: "get_all_accounts",
    definition: {
        title: "Get All Accounts",
        description: "Retrieves all Domo accounts accessible to the token. Accounts are credential containers used by connectors and dataflows to authenticate against external services like Salesforce, S3, and Google Analytics.",
        inputSchema: z.object({
            domo_api_token: z.string().describe("Domo Developer Token"),
        })
    },

    handler: async ({ domo_api_token }: any) => {
        const result = await getAllAccounts(domo_api_token);
        return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }]
        };
    }
} as const;
