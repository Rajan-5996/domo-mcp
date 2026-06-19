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
     * USE AFTER:
     *   - directory_lookup
     *
     * EXAMPLE FLOW:
     *
     *   directory_lookup("Desktop")
     *   → /home/user/Desktop
     *
     *   change_directory("/home/user/Desktop")
     *
     *   create_react_app("todo-app")
     *
     * REQUIREMENTS:
     *   - The path must exist.
     *   - The path must be a directory.
     *
     * IMPORTANT:
     *   This tool changes the current working directory
     *   for the entire MCP process.
     *
     * AFTER SUCCESS:
     *   Future tools should use process.cwd()
     *   as their execution directory.
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
