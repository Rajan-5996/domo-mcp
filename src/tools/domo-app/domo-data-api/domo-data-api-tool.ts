import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputSchema = z.object({
    dataset_id: z
        .string()
        .optional()
        .describe("The ID of the Domo dataset to connect (e.g. 5168da8d-1c72-4e31-ba74-f609f73071dd)"),
    root_dir: z
        .string()
        .optional()
        .describe("The project root directory (e.g. C:\\Users\\RajanNaveenM\\Documents\\test-app)"),
});

export const domoDataApiTool = {
    name: "domo_data_api",
    definition: {
        title: "Domo Data API Integration",
        description:
            "Connects a Domo dataset to an existing Domo app by updating the manifest's datasetsMapping and generating a typed TypeScript Data API client. When called, this tool returns the full set of instructions (skill) for the agent to execute this integration step-by-step.",
        inputSchema,
    },
    /**
     * @agent
     *
     * PURPOSE:
     *   This tool is a bridge/redirect to the 'domo-dataset' skill.
     *   When invoked, it reads the skill markdown and returns the full
     *   instructions for the LLM to execute the dataset integration.
     *
     * SEQUENTIAL WORKFLOW — STEP 1 of 4:
     *
     *   [1] domo_data_api       ← YOU ARE HERE
     *        ↓  (after dataset is wired into manifest + typed API client generated)
     *   [2] domo_appdb          — call next if the user needs a database / AppDB collections
     *        ↓  (after AppDB datastore + collections are created)
     *   [3] domo_workflow       — call next if the user wants to add a Domo Workflow trigger
     *        ↓  (after workflow is wired)
     *   [4] domo_publish        — call last to build + publish the app to Domo
     *
     * WHEN TO SUGGEST NEXT TOOL:
     *   - After this skill finishes (datasetsMapping updated + typed client generated),
     *     ask the user: "Do you also need to set up AppDB (database collections)?"
     *     → If YES  → call `domo_appdb`
     *     → If NO   → ask "Do you want to add a Workflow trigger?"
     *       → If YES → call `domo_workflow`
     *       → If NO  → call `domo_publish` to deploy
     *
     * REQUIRED INPUT:
     *   - dataset_id (optional — ask if not provided)
     *   - root_dir   (optional — ask if not provided)
     */
    handler: async (args: z.infer<typeof inputSchema>) => {
        try {
            const skillPath = path.resolve(__dirname, "../../../../src/skills/domo-dataset.md");
            const skillContent = await fs.readFile(skillPath, "utf-8");

            let instructions = `You are executing the Domo Dataset Integration Skill. Please follow the instructions in the markdown below to perform the integration.\n\n`;

            if (args.dataset_id || args.root_dir) {
                instructions += `### Context/Arguments Provided:\n`;
                if (args.dataset_id) {
                    instructions += `- **dataset_id**: ${args.dataset_id}\n`;
                }
                if (args.root_dir) {
                    instructions += `- **root_dir**: ${args.root_dir}\n`;
                }
                instructions += `\n`;
            }

            instructions += `### Skill Instructions:\n\n${skillContent}`;

            return {
                content: [
                    {
                        type: "text" as const,
                        text: instructions,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Error reading skill file: ${(error as Error).message}`,
                    },
                ],
                isError: true,
            };
        }
    },
} as const;
