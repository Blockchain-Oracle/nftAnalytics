// HTTP Server wrapper for MCP to enable web client connections
// This creates an HTTP/SSE transport layer for the MCP server
import express from 'express';
import cors from 'cors';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HttpServerTransport } from "@modelcontextprotocol/sdk/server/http.js";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });
// Import tools
import { analyzeCollectionTool } from "./tools/analyze-collection.js";
import { detectWashTradingTool } from "./tools/detect-wash-trading.js";
import { getMarketTrendsTool } from "./tools/get-market-trends.js";
import { checkWalletRiskTool } from "./tools/check-wallet-risk.js";
import { getInvestmentAdviceTool } from "./tools/get-investment-advice.js";
// Initialize Express app
const app = express();
const PORT = process.env.MCP_HTTP_PORT || 3001;
// Configure CORS for web clients
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
}));
// Initialize MCP Server
const mcpServer = new McpServer({
    name: "NFT Analytics MCP Server (HTTP)",
    version: "1.0.0"
});
// Add diagnostics tool
mcpServer.tool("diagnostics", {}, async () => {
    const diagnostics = {
        transport: "HTTP/SSE",
        apiKeySet: process.env.UNLEASH_NFTS_API_KEY ? 'set' : 'not set',
        nodeVersion: process.version,
        serverUrl: `http://localhost:${PORT}/mcp`
    };
    return {
        content: [{ type: "text", text: JSON.stringify(diagnostics, null, 2) }]
    };
});
// Register NFT Analytics Tools
analyzeCollectionTool(mcpServer);
detectWashTradingTool(mcpServer);
getMarketTrendsTool(mcpServer);
checkWalletRiskTool(mcpServer);
getInvestmentAdviceTool(mcpServer);
// Create HTTP transport
const transport = new HttpServerTransport("/mcp", app);
// Connect MCP server to transport
mcpServer.connect(transport);
// Start Express server
app.listen(PORT, () => {
    console.log(`MCP HTTP Server running at http://localhost:${PORT}/mcp`);
    console.log(`Web clients can connect to this endpoint`);
});
