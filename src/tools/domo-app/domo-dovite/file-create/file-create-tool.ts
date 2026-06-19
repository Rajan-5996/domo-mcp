import { z } from "zod";
import { createFile } from "./file-create.js";

const inputSchema = z.object({
    file_path: z
        .string()
        .describe(
            "Relative file path to create. Example: src/components/TodoCard.tsx"
        ),

    content: z
        .string()
        .optional()
        .describe(
            "File contents to write into the created file."
        ),
});

export const createFileTool = {
    name: "create_file",

    definition: {
        title: "Create File",
        description:
            "Creates a file and automatically creates missing parent directories.",
        inputSchema,
    },

    /**
     * @agent
     *
     * PURPOSE:
     *   Create files inside a Domo React project.
     *   Can be called multiple times to add components, hooks, services, configs.
     *
     * APP CREATION CHAIN — STEP 4 of 9:
     *
     *   [1] directory_lookup      — find the target folder path
     *        ↓
     *   [2] change_directory      — navigate into the chosen folder
     *        ↓
     *   [3] create_react_app      — scaffold the React TypeScript app
     *        ↓
     *   [4] create_file           ← YOU ARE HERE (repeat for each file needed)
     *        ↓ (all files created — now configure the app manifest)
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
     * BEHAVIOR:
     *   - Automatically creates parent directories.
     *   - Overwrites existing files.
     *   - Creates empty files when content is omitted.
     *
     * IMPORTANT:
     *   Path is resolved relative to the current working directory.
     *
     * WHEN TO SUGGEST NEXT TOOL:
     *   After all needed files are created, call `edit_manifest` to wire
     *   datasets, AppDB collections, or workflow mappings into the app.
     */
    handler: async (args: z.infer<typeof inputSchema>) => {
        const result = await createFile(
            args.file_path,
            args.content ?? ""
        );

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
