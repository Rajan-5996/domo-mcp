import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputSchema = z.object({
    workflow_name: z
        .string()
        .optional()
        .describe("The name of the Domo Workflow to trigger or integrate (e.g. send-email, approval-flow)"),
    alias: z
        .string()
        .optional()
        .describe("The alias to reference this workflow in the app manifest (camelCase, e.g. sendEmail)"),
    root_dir: z
        .string()
        .optional()
        .describe("The project root directory (e.g. C:\\Users\\RajanNaveenM\\Documents\\test-app)"),
});

export const domoWorkflowTool = {
    name: "domo_workflow",
    definition: {
        title: "Domo Workflow Integration",
        description:
            "Integrates a Domo Workflow into an existing Domo app — updates the manifest's " +
            "workflowMapping and generates a typed TypeScript Workflow client. When called, this tool " +
            "returns the full set of skill instructions for the agent to execute this integration " +
            "step-by-step. Use this tool whenever the user wants to trigger a workflow, add a " +
            "workflowMapping in manifest.json, or wire up Domo Workflows into a TypeScript Domo app.",
        inputSchema,
    },
    /**
     * @agent
     *
     * PURPOSE:
     *   This tool is a bridge/redirect to the 'domo-workflow' skill.
     *   When invoked, it reads the skill markdown file and returns the
     *   full instructions for the LLM to execute the Workflow integration.
     *
     * SEQUENTIAL WORKFLOW — STEP 3 of 4:
     *
     *   [1] domo_data_api       — wire a Domo dataset + generate typed API client
     *        ↓  (after dataset is wired into manifest + typed API client generated)
     *   [2] domo_appdb          — create AppDB datastore + collections + update manifest
     *        ↓  (after AppDB datastore + collections are created and manifest updated)
     *   [3] domo_workflow       ← YOU ARE HERE
     *        ↓  (after workflowMapping is written to manifest + trigger component is generated)
     *   [4] domo_publish        — call last to build + publish the app to Domo
     *
     * WHEN TO SUGGEST NEXT TOOL:
     *   - After this skill finishes (workflowMapping written, WorkflowAPI client created,
     *     trigger component/hook generated), always suggest:
     *     "Your workflow is wired. Run `domo_publish` to build and deploy the app to Domo."
     *     → call `domo_publish`
     *
     * REQUIRED INPUT:
     *   - workflow_name (optional — ask if not provided)
     *   - alias         (optional — ask if not provided, suggest camelCase of workflow name)
     *   - root_dir      (optional — ask if not provided)
     */
    handler: async (args: z.infer<typeof inputSchema>) => {
        try {
            const skillPath = path.resolve(__dirname, "../../../../src/skills/domo-workflow.md");
            const skillContent = await fs.readFile(skillPath, "utf-8");

            // Format instructions with the provided arguments
            let instructions = `You are executing the Domo Workflow Integration Skill. `;
            instructions += `Please follow the instructions in the markdown below to perform the integration.\n\n`;

            if (args.workflow_name || args.alias || args.root_dir) {
                instructions += `### Context/Arguments Provided:\n`;
                if (args.workflow_name) {
                    instructions += `- **workflow_name**: ${args.workflow_name}\n`;
                }
                if (args.alias) {
                    instructions += `- **alias**: ${args.alias}\n`;
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
                        text: `Error reading Workflow skill file: ${(error as Error).message}`,
                    },
                ],
                isError: true,
            };
        }
    },
} as const;
