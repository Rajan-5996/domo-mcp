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
     *   Create files inside a project.
     *
     * COMMON USE CASES:
     *   - React components
     *   - Hooks
     *   - Services
     *   - Utilities
     *   - Configuration files
     *   - Documentation
     *
     * EXAMPLES:
     *
     * create_file({
     *   file_path: "src/components/TodoCard.tsx"
     * })
     *
     * create_file({
     *   file_path: "src/hooks/useTodos.ts"
     * })
     *
     * create_file({
     *   file_path: "README.md"
     * })
     *
     * BEHAVIOR:
     *   - Automatically creates parent directories.
     *   - Overwrites existing files.
     *   - Creates empty files when content is omitted.
     *
     * IMPORTANT:
     *   Path is resolved relative to the current working directory.
     *
     * WORKFLOW:
     *
     *   create_react_app
     *       ↓
     *   create_file
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
