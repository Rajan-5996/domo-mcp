import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputSchema = z.object({
    collection_name: z
        .string()
        .optional()
        .describe("The name of the AppDB collection to create (e.g. todos, users)"),
    schema: z
        .string()
        .optional()
        .describe("Optional JSON schema for the collection columns, e.g. [{\"name\":\"title\",\"type\":\"STRING\"}]"),
    root_dir: z
        .string()
        .optional()
        .describe("The project root directory (e.g. C:\\Users\\RajanNaveenM\\Documents\\test-app)"),
});

export const domoAppDbTool = {
    name: "domo_appdb",
    definition: {
        title: "Domo AppDB Integration",
        description:
            "Sets up Domo AppDB for a React app — creates the AppDB datastore and collection(s) " +
            "directly via the Domo Datastores REST API, saves the returned datastore ID, then writes " +
            "the collections block into manifest.json. When called, this tool returns the full set of " +
            "skill instructions for the agent to execute this integration step-by-step. " +
            "Use this tool whenever the user wants to add a database, store data, create a collection, " +
            "or use AppDB in a Domo app.",
        inputSchema,
    },
    /**
     * @agent
     *
     * PURPOSE:
     *   This tool is a bridge/redirect to the 'domo-appdb' skill.
     *   When invoked, it reads the skill markdown file and returns the
     *   full instructions for the LLM to execute the AppDB integration.
     *
     * SEQUENTIAL WORKFLOW — STEP 2 of 4:
     *
     *   [1] domo_data_api       — wire a Domo dataset + generate typed API client
     *        ↓  (after dataset is wired into manifest + typed API client generated)
     *   [2] domo_appdb          ← YOU ARE HERE
     *        ↓  (after AppDB datastore + collections are created and manifest updated)
     *   [3] domo_workflow       — call next if the user wants to add a Domo Workflow trigger
     *        ↓  (after workflow is wired)
     *   [4] domo_publish        — call last to build + publish the app to Domo
     *
     * WHEN TO SUGGEST NEXT TOOL:
     *   - After this skill finishes (datastore created, collections set up, manifest updated),
     *     ask the user: "Do you also want to add a Domo Workflow trigger?"
     *     → If YES → call `domo_workflow`
     *     → If NO  → call `domo_publish` to build and deploy the app
     *
     * REQUIRED INPUT:
     *   - collection_name (optional — ask if not provided)
     *   - schema          (optional — ask if not provided)
     *   - root_dir        (optional — ask if not provided)
     */
    handler: async (args: z.infer<typeof inputSchema>) => {
        try {
            const skillPath = path.resolve(__dirname, "../../../../skills/domo-appdb.md");
            const skillContent = await fs.readFile(skillPath, "utf-8");

            // Format instructions with the provided arguments
            let instructions = `You are executing the Domo AppDB Integration Skill. `;
            instructions += `Please follow the instructions in the markdown below to perform the integration.\n\n`;

            if (args.collection_name || args.schema || args.root_dir) {
                instructions += `### Context/Arguments Provided:\n`;
                if (args.collection_name) {
                    instructions += `- **collection_name**: ${args.collection_name}\n`;
                }
                if (args.schema) {
                    instructions += `- **schema**: ${args.schema}\n`;
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
                        text: `Error reading AppDB skill file: ${(error as Error).message}`,
                    },
                ],
                isError: true,
            };
        }
    },
} as const;
