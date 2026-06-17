import { z } from "zod";
import { changeDatasetProperties } from "./change-dataset-props.js";

export const changeDatasetPropertiesTool = {
    name: "change_dataset_properties",
    definition: {
        title: "Change Dataset Properties",
        description: "Updates the properties of a Domo dataset such as the data provider type. Use this to switch a dataset's provider (e.g. to 'domo-jupyterdata' for Jupyter-managed datasets).",
        inputSchema: z.object({
            domo_api_token: z.string().describe("Domo Developer Token"),
            datasetId: z.string().describe("ID of the dataset to update"),
            dataProviderType: z.string().describe("Data provider type to set on the dataset e.g. 'domo-jupyterdata'"),
        })
    },
    handler: async ({ domo_api_token, datasetId, dataProviderType }: any) => {
        const result = await changeDatasetProperties(domo_api_token, datasetId, dataProviderType);
        return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }]
        };
    }
} as const;