import { z } from "zod";
import { lookupDirectory } from "./dir-lookup.js";

const inputSchema = z.object({
    directory_name: z
        .string()
        .describe(
            "Directory name to search for (Desktop, Documents, Projects, etc.)"
        ),
});

export const directoryLookupTool = {
    name: "directory_lookup",

    definition: {
        title: "Directory Lookup",
        description:
            "Finds directories on the user's machine by name and returns matching paths.",
        inputSchema,
    },

    /**
     * @agent
     *
     * PURPOSE:
     *   Find the absolute path of a directory on the user's machine by name.
     *   This is always the FIRST step before any file or app creation.
     *
     * APP CREATION CHAIN — STEP 1 of 10:
     *
     *   [1] directory_lookup      ← YOU ARE HERE
     *        ↓ (use the returned path as input for change_directory)
     *   [2] change_directory      — navigate into the chosen folder
     *        ↓
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
     *   After returning the matched path(s), immediately call `change_directory`
     *   with the chosen path — do not wait for user confirmation.
     */
    handler: async (args: z.infer<typeof inputSchema>) => {
        const result = await lookupDirectory(args.directory_name);

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
