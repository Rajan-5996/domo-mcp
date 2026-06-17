import { z } from "zod";
import { getExportStatus } from "./S3-status.js";

export const getExportStatusTool = {
    name: "get_export_status",
    definition: {
        title: "Get Dataset Export Status",
        description: "Checks the status of S3 exports for a Domo dataset. Returns an array of export status entries (possibly including historical exports), each indicating whether the export is running, succeeded, or failed. Use this to poll after calling create_export, since exports run asynchronously.",
        inputSchema: z.object({
            domo_api_token: z.string().describe("Domo Developer Token"),
            datasourceId: z.string().describe("ID of the dataset whose export status to check"),
        })
    },
    handler: async ({ domo_api_token, datasourceId }: any) => {
        const result = await getExportStatus(domo_api_token, datasourceId);
        return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }]
        };
    }
} as const;
