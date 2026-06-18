import { z } from "zod";
import { domoLogin } from "./domo-login.js";

const inputSchema = z.object({
    instance_name: z.string().describe("Domo instance name (e.g., company.domo.com)"),
    dev_token: z.string().describe(
        "Domo Developer Access Token. Generate one at: Domo → Admin Settings → Authentication → Access Tokens."
    ),
});

export const domoLoginTool = {
    name: "domo_login",
    definition: {
        title: "Domo Login",
        description: "Authenticates with a Domo instance using a Developer Access Token. " +
            "Validates the token against the live instance and confirms the connection is ready for API calls.",
        inputSchema
    },
    /**
     * @agent
     *   COLLECT FROM USER BEFORE INVOKING:
     *   - `instance_name` — ask "Which Domo instance should we log into? (e.g., company.domo.com)"
     *   - `dev_token`     — ask "Please provide your Domo Developer Access Token.
     *                        You can generate one at: Domo → Admin Settings → Authentication → Access Tokens."
     *
     *   CREDENTIALS (check cache/memory first):
     *   - If `dev_token` was provided earlier in this session, reuse it — don't ask again.
     *   - Never log, store, or echo the token value back to the user.
     */
    handler: async (args: z.infer<typeof inputSchema>) => {
        const result = await domoLogin({
            instance_name: args.instance_name,
            dev_token: args.dev_token,
        });
        return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }]
        };
    }
} as const;