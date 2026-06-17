import { z } from "zod";
import { createExport } from "./S3-export.js";

const queryColumnSchema = z.object({
    column: z.string().describe("Column name to include in the export, must match the dataset schema exactly"),
    exprType: z.literal("COLUMN").describe("Expression type — always 'COLUMN' for direct column references"),
});

export const createExportTool = {
    name: "create_export",
    definition: {
        title: "Create Dataset Export to S3",
        description: "Initiates an asynchronous export of a Domo dataset to an S3 bucket. Only one active export can run per dataset at a time; if the data hasn't changed since the last export, Domo returns the previous export's status instead of starting a new one. AWS credentials must be sourced from environment variables or a secrets manager — never collect them via chat or write them to a temporary file.",
        inputSchema: z.object({
            domo_api_token: z.string().describe("Domo Developer Token"),
            datasourceId: z.string().describe("ID of the dataset to export"),
            awsAccessKey: z.string().describe("AWS Access Key ID — source from environment variables or a secrets manager, not from chat or a temp file"),
            awsAccessSecret: z.string().describe("AWS Secret Access Key — source from environment variables or a secrets manager, not from chat or a temp file"),
            bucket: z.string().describe("Target S3 bucket name"),
            path: z.string().describe("Destination path within the bucket"),
            region: z.string().describe("AWS region of the bucket, e.g. 'us-east-1'"),
            includeBOM: z.boolean().optional().describe("Whether to include a byte-order mark in the export. Defaults to true."),
            useCache: z.boolean().optional().describe("Whether to use cached query results. Defaults to true."),
            columns: z.array(queryColumnSchema).min(1).describe("Columns to include in the export"),
            groupByColumns: z.array(z.unknown()).optional().describe("Optional group-by column definitions"),
            orderByColumns: z.array(z.unknown()).optional().describe("Optional order-by column definitions"),
        })
    },
    handler: async ({
        domo_api_token,
        datasourceId,
        awsAccessKey,
        awsAccessSecret,
        bucket,
        path,
        region,
        includeBOM,
        useCache,
        columns,
        groupByColumns,
        orderByColumns,
    }: any) => {
        const result = await createExport(domo_api_token, datasourceId, {
            awsAccessKey,
            awsAccessSecret,
            bucket,
            path,
            region,
            queryRequest: {
                includeBOM: includeBOM ?? true,
                useCache: useCache ?? true,
                query: {
                    columns,
                    groupByColumns: groupByColumns ?? [],
                    orderByColumns: orderByColumns ?? [],
                },
            },
        });
        return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }]
        };
    }
} as const;
