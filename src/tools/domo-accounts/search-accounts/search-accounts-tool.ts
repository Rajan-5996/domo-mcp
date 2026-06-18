import { z } from "zod";
import { searchAccountsByName } from "./search-accounts.js";

export const searchAccountsByNameTool = {
    name: "search_accounts_by_name",
    definition: {
        title: "Search Accounts By Name",
        description: "Searches Domo accounts using a query string with wildcard support (e.g. '*salesforce*'). Supports pagination, faceted filters, and sorting. More flexible than get_all_accounts for large account lists or name-based lookups.",
        inputSchema: z.object({
            domo_api_token: z.string().describe("Domo Developer Token"),
            query: z.string().describe("Search query string. Use wildcards for partial matches e.g. '*salesforce*'"),
            count: z.number().default(100).describe("Number of results to return. Defaults to 100"),
            offset: z.number().default(0).describe("Pagination offset. Defaults to 0"),
            sortOrder: z.enum(["ASC", "DESC"]).default("ASC").describe("Sort order for results by display name"),
        })
    },
    /**
     * @agent
     *   CREDENTIALS (check cache/memory first):
     *   - `domo_api_token` — only ask if not cached. Prompt: "Please provide
     *                        your Domo Developer Token to continue."
     *
     *   COLLECT FROM USER BEFORE INVOKING:
     *   - `query`     — ask "What account name should be searched?"
     *                   Automatically wrap partial names in wildcards: `*name*`.
     *   - `count`     — ask "How many results?" Defaults to 100.
     *   - `offset`    — only ask if paginating through large result sets.
     *   - `sortOrder` — ask "Should results be sorted ascending or descending?"
     *
     *   SUGGESTED FOLLOW-UPS AFTER SUCCESS:
     *   - `get_account_by_id` — fetch full details for a specific result.
     *   - If no results, suggest broadening the query with wider wildcards.
     */
    handler: async ({ domo_api_token, query, count, offset, sortOrder }: any) => {
        const result = await searchAccountsByName(domo_api_token, {
            query,
            count,
            offset,
            sort: {
                fieldSorts: [{ field: "display_name_sort", sortOrder }]
            }
        });
        return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }]
        };
    }
} as const;
