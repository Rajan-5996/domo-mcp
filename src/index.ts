import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { server } from "./server.js";
import { registerAll } from "./tools/registry.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

registerAll(server);

let transport: StreamableHTTPServerTransport | null = null;

async function getTransport() {
    if (!transport) {
        transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
        });
        await server.connect(transport);
    }
    return transport;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const t = await getTransport();
    await t.handleRequest(req, res, req.body);
}