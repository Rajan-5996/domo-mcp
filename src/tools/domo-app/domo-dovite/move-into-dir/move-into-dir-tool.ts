import { z } from "zod";
import { changeDirectory } from "./move-into-dir.js";

const inputSchema = z.object({
    path: z
        .string()
        .describe(
            "Absolute directory path returned by the directory lookup tool."
        ),
});

export const changeDirectoryTool = {
    name: "change_directory",

    definition: {
        title: "Change Directory",
        description:
            "Changes the MCP process working directory to the specified folder.",
        inputSchema,
    },

    /**
     * @agent
     *
     * PURPOSE:
     *   Navigate into a directory before performing file operations
     *   or running project creation commands.
     *
     * APP CREATION CHAIN — STEP 2 of 9:
     *
     *   [1] directory_lookup      — find the target folder path
     *        ↓ (use the returned path here)
     *   [2] change_directory      ← YOU ARE HERE
     *        ↓ (cwd is now set — all subsequent tools run here)
     *   [3] create_react_app      — scaffold the React TypeScript app
     *        ↓
     *   [4] create_file           — add source files (components, hooks, etc.)
     *        ↓
     *   [5] edit_manifest         — configure datasetsMapping, collections, etc.
     *        ↓
     *   [6] domo_data_api         — wire a Domo dataset + typed API client
     *        ↓
     *   [7] domo_appdb            — set up AppDB datastore + collections
     *        ↓
     *   [8] domo_workflow         — integrate a Domo Workflow trigger
     *        ↓
     *   [9] domo_publish          — build + publish the app to Domo
     *
     * WHEN TO SUGGEST NEXT TOOL:
     *   After success, immediately call `create_react_app` with the project name.
     *   Do not ask the user for confirmation.
     */
    handler: async (args: z.infer<typeof inputSchema>) => {
        const result = await changeDirectory(args.path);

        return {
            content: [
                {
                    type: "text" as const,
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    },
} as const;
