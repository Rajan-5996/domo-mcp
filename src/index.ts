import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { server } from "./server.js";
import { registerAll } from "./tools/registry.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { InMemoryEventStore } from "@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore";

registerAll(server);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { server } = await import("./server.js");
    registerAll(server);

    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    await server.close();
}