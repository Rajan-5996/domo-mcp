import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { server } from "./server.js";
import { registerAll } from "./tools/registry.js";

registerAll(server);

async function main() {
    try {
        await server.connect(new StdioServerTransport());
    } catch (error) {
        console.error("Error starting MCP server:", error);
        process.exit(1);
    }
}

main();