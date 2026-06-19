import { z } from "zod";
import { lookupDirectory } from "./dir-lookup.js";

const inputSchema = z.object({
    directory_name: z
        .string()
        .describe(
            "Directory name to search for (Desktop, Documents, Projects, etc.)"
        ),
});

export const directoryLookupTool = {
    name: "directory_lookup",

    definition: {
        title: "Directory Lookup",
        description:
            "Finds directories on the user's machine by name and returns matching paths.",
        inputSchema,
    },

    handler: async (args: z.infer<typeof inputSchema>) => {
        const result = await lookupDirectory(args.directory_name);

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
