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
            "Creates a new React TypeScript application using Dovite in the current working directory.",
        inputSchema,
    },

    /**
     * @agent
     *
     * PURPOSE:
     *   Create a React TypeScript application using Dovite.
     *
     * REQUIRED INPUT:
     *   - project_name
     *
     * BEFORE USING:
     *   - Ensure directory_lookup has been used.
     *   - Ensure change_directory has been used.
     *   - The current working directory must be the desired parent folder.
     *
     * USER INTERACTION:
     *   Ask ONLY for the project name.
     *
     *   Example:
     *     "todo-app"
     *     "crm-dashboard"
     *     "my-frontend"
     *
     * AUTOMATIC DECISIONS:
     *   - Always use React TypeScript.
     *   - Automatically answer all non-project-name prompts.
     *   - Never ask the user which template to use.
     *
     * SUCCESS:
     *   Returns the created project path.
     *
     * FAILURE:
     *   If Yarn is not installed:
     *     Inform the user:
     *     "Yarn is not installed. Please install Yarn and try again."
     *
     * WORKFLOW:
     *
     *   directory_lookup
     *       ↓
     *   change_directory
     *       ↓
     *   create_react_app
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