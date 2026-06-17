import { z } from "zod";
import { queryWithSQL } from "./query-with-sql.js";

export const queryWithSQLTool = {
    name: "query_with_sql",
    definition: {
        title: "Query With SQL",
        description: "Executes a SQL query against a Domo dataset and returns matching rows. The table name in SQL must match the dataset name in Domo, not the dataset ID. Dataset must be indexed before querying.",
        inputSchema: z.object({
            domo_api_token: z.string().describe("Domo Developer Token"),
            datasetId: z.string().describe("ID of the dataset to query against"),
            sql: z.string().describe("SQL statement to execute. Use the dataset name as the table name e.g. SELECT * FROM my_dataset WHERE column = 'value'"),
        })
    },
    handler: async ({ domo_api_token, datasetId, sql }: any) => {
        const result = await queryWithSQL(domo_api_token, datasetId, sql);
        return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }]
        };
    }
} as const;