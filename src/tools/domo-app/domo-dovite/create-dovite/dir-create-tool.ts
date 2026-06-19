import { z } from "zod";
import { createReactApp } from "./dir-create.js";

const inputSchema = z.object({
    project_name: z
        .string()
        .min(1)
        .describe(
            "Name of the React application to create. Example: todo-app"
        ),
});

export const createReactAppTool = {
    name: "create_react_app",

    definition: {
        title: "Create React Application",
        description:
            "Creates a new React TypeScript application using Dovite. using npx",
        inputSchema,
    },

    /**
     * @agent
     *
     * PURPOSE:
     *   Create a React TypeScript application using Dovite.
     *
     * APP CREATION CHAIN — STEP 3 of 9:
     *
     *   [1] directory_lookup      — find the target folder path
     *        ↓
     *   [2] change_directory      — navigate into the chosen folder
     *        ↓ (cwd must be set before calling this tool)
     *   [3] create_react_app      ← YOU ARE HERE
     *        ↓ (app scaffolded — use create_file to add more source files)
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
     * REQUIRED INPUT:
     *   - project_name
     *
     * BEFORE USING:
     *   - Ensure directory_lookup has been used.
     *   - Ensure change_directory has been used.
     *   - The current working directory must be the desired parent folder.
     *
     * WHEN TO SUGGEST NEXT TOOL:
     *   After the app is scaffolded, call `create_file` to add any additional
     *   source files (components, hooks, utilities). When files are ready,
     *   call `edit_manifest` to configure the app's datasetsMapping.
     *
     * FAILURE:
     *   If npx is not installed:
     *     Inform the user: "npx is not installed. Please install npx and try again."
     */
    handler: async (args: z.infer<typeof inputSchema>) => {
        const result = await createReactApp(args.project_name);

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