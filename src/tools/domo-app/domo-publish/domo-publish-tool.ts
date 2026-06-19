import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputSchema = z.object({
    root_dir: z
        .string()
        .optional()
        .describe("The project root directory (e.g. C:\\Users\\RajanNaveenM\\Documents\\test-app)"),
    proxy_id: z
        .string()
        .optional()
        .describe("The Domo proxyId (card iframe hash) — required for AppDB/Workflow local dev. Found in the card iframe src attribute after first publish."),
});

export const domoPublishTool = {
    name: "domo_publish",
    definition: {
        title: "Publish Domo App",
        description:
            "Builds a React app and publishes (pushes) it to the Domo platform — checks proxyId, " +
            "builds with yarn, and uploads with yarn upload. When called, this tool returns the full " +
            "set of skill instructions for the agent to execute the publish flow step-by-step. " +
            "Use this tool whenever the user wants to publish, deploy, push, upload, or release a Domo app.",
        inputSchema,
    },
    /**
     * @agent
     *
     * PURPOSE:
     *   This tool is a bridge/redirect to the 'domo-publish' skill.
     *   When invoked, it reads the skill markdown file and returns the
     *   full instructions for the LLM to execute the publish flow.
     *
     * SEQUENTIAL WORKFLOW — STEP 4 of 4 (FINAL):
     *
     *   [1] domo_data_api       — wire a Domo dataset + generate typed API client
     *        ↓  (after dataset is wired into manifest + typed API client generated)
     *   [2] domo_appdb          — create AppDB datastore + collections + update manifest
     *        ↓  (after AppDB datastore + collections are created and manifest updated)
     *   [3] domo_workflow       — wire a Domo Workflow trigger into the app
     *        ↓  (after workflowMapping is written to manifest + trigger component is generated)
     *   [4] domo_publish        ← YOU ARE HERE (FINAL STEP)
     *
     * WHEN TO SUGGEST NEXT TOOL:
     *   - This is the LAST step. After publishing:
     *     1. If proxyId was missing → wait for user to provide it, then update manifest.json
     *     2. If AppDB or Workflow was set up → remind user to complete the Domo wiring screen
     *     3. No further tools to call — the app is live on Domo
     *
     * REQUIRED INPUT:
     *   - root_dir  (optional — ask if not provided)
     *   - proxy_id  (optional — only needed if proxyId is missing in manifest)
     */
    handler: async (args: z.infer<typeof inputSchema>) => {
        try {
            const skillPath = path.resolve(__dirname, "../../../../src/skills/domo-publish.md");
            const skillContent = await fs.readFile(skillPath, "utf-8");

            // Format instructions with the provided arguments
            let instructions = `You are executing the Domo Publish Skill (Step 4 of 4 — Final Step). `;
            instructions += `Please follow the instructions in the markdown below to build and publish the app to Domo.\n\n`;

            if (args.root_dir || args.proxy_id) {
                instructions += `### Context/Arguments Provided:\n`;
                if (args.root_dir) {
                    instructions += `- **root_dir**: ${args.root_dir}\n`;
                }
                if (args.proxy_id) {
                    instructions += `- **proxy_id**: ${args.proxy_id}\n`;
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
                        text: `Error reading Publish skill file: ${(error as Error).message}`,
                    },
                ],
                isError: true,
            };
        }
    },
} as const;
