import { FastMCP } from "fastmcp";
import { z } from "zod";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { UnleashNFTsClient } from "./unleash-client.js";
// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });
// Initialize FastMCP Server
const server = new FastMCP({
    name: "NFT Analytics MCP Server",
    version: "1.0.0",
    instructions: "This server provides comprehensive NFT analytics tools powered by UnleashNFTs API. Use these tools to analyze collections, detect wash trading, check wallet risks, get market trends, and receive investment advice."
});
// Diagnostics tool
server.addTool({
    name: "diagnostics",
    description: "Get server diagnostics and configuration information",
    execute: async () => {
        const diagnostics = {
            envPath,
            apiKeySet: process.env.UNLEASH_NFTS_API_KEY ? 'set (not showing for security)' : 'not set',
            workingDirectory: process.cwd(),
            nodeVersion: process.version,
            timestamp: new Date().toISOString()
        };
        return JSON.stringify(diagnostics, null, 2);
    }
});
// Analyze Collection Tool
server.addTool({
    name: "analyzeCollection",
    description: "Analyze an NFT collection for safety, metrics, and risks",
    parameters: z.object({
        collection_address: z.string().describe("The NFT collection contract address"),
        blockchain: z.string().optional().default("ethereum").describe("Blockchain network (ethereum or polygon)")
    }),
    execute: async ({ collection_address, blockchain }, { log }) => {
        const client = new UnleashNFTsClient();
        try {
            log.info("Analyzing collection", { collection_address, blockchain });
            // Fetch collection data
            const collectionData = await client.getCollectionData(collection_address, blockchain);
            if (!collectionData) {
                return JSON.stringify({
                    error: "Collection not found",
                    collection_address,
                    blockchain
                }, null, 2);
            }
            // Fetch wash trading data
            const washTradingData = await client.getCollectionWashTrading(collection_address, blockchain);
            // Calculate safety score (0-100)
            let safetyScore = 100;
            const risks = [];
            // Check holder concentration
            if (collectionData.owner_count < 100) {
                safetyScore -= 20;
                risks.push("low_holder_count");
            }
            else if (collectionData.owner_count < 500) {
                safetyScore -= 10;
                risks.push("moderate_holder_count");
            }
            // Check wash trading
            if (washTradingData && washTradingData.wash_trading_percentage > 30) {
                safetyScore -= 30;
                risks.push("high_wash_trading");
            }
            else if (washTradingData && washTradingData.wash_trading_percentage > 10) {
                safetyScore -= 15;
                risks.push("moderate_wash_trading");
            }
            // Check volume/sales ratio
            const avgSalePrice = collectionData.volume_24h / Math.max(collectionData.sales_24h, 1);
            if (avgSalePrice > collectionData.floor_price * 3) {
                safetyScore -= 15;
                risks.push("unusual_price_activity");
            }
            // Check market cap sustainability
            if (collectionData.market_cap > 0 && collectionData.volume_24h < collectionData.market_cap * 0.001) {
                safetyScore -= 10;
                risks.push("low_liquidity");
            }
            const analysis = {
                collection_address,
                blockchain,
                collection_name: collectionData.name,
                safety_score: Math.max(0, safetyScore),
                safety_level: safetyScore >= 80 ? "HIGH" : safetyScore >= 60 ? "MEDIUM" : "LOW",
                risks,
                metrics: {
                    owner_count: collectionData.owner_count,
                    nft_count: collectionData.nft_count,
                    floor_price: collectionData.floor_price,
                    volume_24h: collectionData.volume_24h,
                    sales_24h: collectionData.sales_24h,
                    market_cap: collectionData.market_cap
                },
                wash_trading: washTradingData || null,
                analysis_timestamp: new Date().toISOString()
            };
            log.info("Collection analysis completed", { safety_score: safetyScore });
            return JSON.stringify(analysis, null, 2);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            log.error("Error analyzing collection", { error: errorMessage });
            return JSON.stringify({
                error: "Failed to analyze collection",
                details: errorMessage,
                collection_address,
                blockchain
            }, null, 2);
        }
    }
});
// Detect Wash Trading Tool
server.addTool({
    name: "detectWashTrading",
    description: "Detect wash trading activities in an NFT collection",
    parameters: z.object({
        collection_address: z.string().describe("The NFT collection contract address"),
        blockchain: z.string().optional().default("ethereum").describe("Blockchain network (ethereum or polygon)")
    }),
    execute: async ({ collection_address, blockchain }, { log }) => {
        const client = new UnleashNFTsClient();
        try {
            log.info("Detecting wash trading", { collection_address, blockchain });
            const washTradingData = await client.getCollectionWashTrading(collection_address, blockchain);
            if (!washTradingData) {
                return JSON.stringify({
                    error: "Unable to fetch wash trading data",
                    collection_address,
                    blockchain
                }, null, 2);
            }
            // Analyze wash trading severity
            let severity = "LOW";
            let risk_level = 1;
            if (washTradingData.wash_trading_percentage > 50) {
                severity = "CRITICAL";
                risk_level = 5;
            }
            else if (washTradingData.wash_trading_percentage > 30) {
                severity = "HIGH";
                risk_level = 4;
            }
            else if (washTradingData.wash_trading_percentage > 15) {
                severity = "MEDIUM";
                risk_level = 3;
            }
            else if (washTradingData.wash_trading_percentage > 5) {
                severity = "LOW";
                risk_level = 2;
            }
            const analysis = {
                collection_address,
                blockchain,
                wash_trading_detected: washTradingData.wash_trading_percentage > 0,
                severity,
                risk_level,
                metrics: {
                    wash_trading_volume: washTradingData.wash_trading_volume,
                    total_volume: washTradingData.total_volume,
                    wash_trading_percentage: washTradingData.wash_trading_percentage,
                    wash_trading_sales: washTradingData.wash_trading_sales,
                    total_sales: washTradingData.total_sales
                },
                recommendations: risk_level >= 4 ? [
                    "AVOID: This collection shows signs of heavy wash trading",
                    "Volume and price data may be artificially inflated",
                    "Consider alternative collections with lower wash trading"
                ] : risk_level >= 3 ? [
                    "CAUTION: Moderate wash trading detected",
                    "Be aware that some metrics may be inflated",
                    "Research further before investing"
                ] : [
                    "Minimal wash trading detected",
                    "Collection appears to have organic trading activity"
                ],
                analysis_timestamp: new Date().toISOString()
            };
            log.info("Wash trading analysis completed", { severity, risk_level });
            return JSON.stringify(analysis, null, 2);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            log.error("Error detecting wash trading", { error: errorMessage });
            return JSON.stringify({
                error: "Failed to detect wash trading",
                details: errorMessage,
                collection_address,
                blockchain
            }, null, 2);
        }
    }
});
// Get Market Trends Tool
server.addTool({
    name: "getMarketTrends",
    description: "Get current NFT market trends and metrics",
    parameters: z.object({
        time_range: z.string().optional().default("24h").describe("Time range for analysis (24h, 7d, 30d)"),
        include_trending: z.boolean().optional().default(true).describe("Include trending collections")
    }),
    execute: async ({ time_range, include_trending }, { log }) => {
        const client = new UnleashNFTsClient();
        try {
            log.info("Fetching market trends", { time_range, include_trending });
            // Get market metrics
            const marketMetrics = await client.getMarketMetrics(time_range);
            if (!marketMetrics) {
                return JSON.stringify({
                    error: "Unable to fetch market metrics",
                    time_range
                }, null, 2);
            }
            // Get trending collections if requested
            let trendingCollections = [];
            if (include_trending) {
                trendingCollections = await client.getTrendingCollections(10);
            }
            const trends = {
                time_range,
                market_metrics: {
                    total_volume: marketMetrics.volume_24h,
                    volume_change: marketMetrics.volume_change_24h,
                    total_sales: marketMetrics.sales_24h,
                    sales_change: marketMetrics.sales_change_24h,
                    average_price: marketMetrics.average_price,
                    price_change: marketMetrics.average_price_change,
                    active_wallets: marketMetrics.active_wallets,
                    wallet_change: marketMetrics.active_wallets_change
                },
                market_sentiment: marketMetrics.volume_change_24h > 0 ? "BULLISH" : "BEARISH",
                trending_collections: trendingCollections.slice(0, 5).map(collection => ({
                    name: collection.name,
                    contract_address: collection.contract_address,
                    volume_24h: collection.volume_24h,
                    floor_price: collection.floor_price,
                    sales_24h: collection.sales_24h
                })),
                analysis_timestamp: new Date().toISOString()
            };
            log.info("Market trends analysis completed");
            return JSON.stringify(trends, null, 2);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            log.error("Error fetching market trends", { error: errorMessage });
            return JSON.stringify({
                error: "Failed to fetch market trends",
                details: errorMessage,
                time_range
            }, null, 2);
        }
    }
});
// Check Wallet Risk Tool
server.addTool({
    name: "checkWalletRisk",
    description: "Analyze a wallet address for risk factors and trading patterns",
    parameters: z.object({
        wallet_address: z.string().describe("The wallet address to analyze"),
        blockchain: z.string().optional().default("ethereum").describe("Blockchain network (ethereum or polygon)")
    }),
    execute: async ({ wallet_address, blockchain }, { log }) => {
        const client = new UnleashNFTsClient();
        try {
            log.info("Analyzing wallet risk", { wallet_address, blockchain });
            const walletProfile = await client.getWalletProfile(wallet_address, blockchain);
            if (!walletProfile) {
                return JSON.stringify({
                    error: "Unable to fetch wallet profile",
                    wallet_address,
                    blockchain
                }, null, 2);
            }
            // Calculate overall risk score
            let riskScore = 0;
            const riskFactors = [];
            // Wash trading risk
            if (walletProfile.washtrade_score > 70) {
                riskScore += 40;
                riskFactors.push("high_wash_trading_activity");
            }
            else if (walletProfile.washtrade_score > 40) {
                riskScore += 20;
                riskFactors.push("moderate_wash_trading_activity");
            }
            // Portfolio concentration risk
            if (walletProfile.collection_count < 3 && walletProfile.nft_count > 50) {
                riskScore += 15;
                riskFactors.push("high_portfolio_concentration");
            }
            // Trading behavior analysis
            if (walletProfile.realized_losses > walletProfile.realized_gains * 2) {
                riskScore += 20;
                riskFactors.push("poor_trading_performance");
            }
            const riskLevel = riskScore >= 60 ? "HIGH" : riskScore >= 30 ? "MEDIUM" : "LOW";
            const analysis = {
                wallet_address,
                blockchain,
                risk_score: Math.min(100, riskScore),
                risk_level: riskLevel,
                risk_factors: riskFactors,
                profile: {
                    is_whale: walletProfile.is_whale,
                    is_shark: walletProfile.is_shark,
                    nft_count: walletProfile.nft_count,
                    collection_count: walletProfile.collection_count,
                    total_value: walletProfile.total_value,
                    realized_gains: walletProfile.realized_gains,
                    realized_losses: walletProfile.realized_losses,
                    washtrade_score: walletProfile.washtrade_score
                },
                recommendations: riskLevel === "HIGH" ? [
                    "HIGH RISK: Exercise extreme caution when dealing with this wallet",
                    "Significant wash trading or suspicious activity detected",
                    "Consider avoiding transactions with this address"
                ] : riskLevel === "MEDIUM" ? [
                    "MODERATE RISK: Some concerning patterns detected",
                    "Review transaction history carefully",
                    "Proceed with appropriate due diligence"
                ] : [
                    "LOW RISK: Wallet appears to have normal trading patterns",
                    "No significant red flags detected"
                ],
                analysis_timestamp: new Date().toISOString()
            };
            log.info("Wallet risk analysis completed", { risk_level: riskLevel, risk_score: riskScore });
            return JSON.stringify(analysis, null, 2);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            log.error("Error analyzing wallet risk", { error: errorMessage });
            return JSON.stringify({
                error: "Failed to analyze wallet risk",
                details: errorMessage,
                wallet_address,
                blockchain
            }, null, 2);
        }
    }
});
// Get Investment Advice Tool
server.addTool({
    name: "getInvestmentAdvice",
    description: "Get AI-powered investment advice for NFT collections",
    parameters: z.object({
        collection_address: z.string().describe("The NFT collection contract address"),
        blockchain: z.string().optional().default("ethereum").describe("Blockchain network (ethereum or polygon)"),
        investment_amount: z.number().optional().describe("Planned investment amount in USD"),
        risk_tolerance: z.enum(["low", "medium", "high"]).optional().default("medium").describe("Your risk tolerance level")
    }),
    execute: async ({ collection_address, blockchain, investment_amount, risk_tolerance }, { log }) => {
        const client = new UnleashNFTsClient();
        try {
            log.info("Generating investment advice", { collection_address, blockchain, risk_tolerance });
            // Get comprehensive collection data
            const collectionData = await client.getCollectionData(collection_address, blockchain);
            const washTradingData = await client.getCollectionWashTrading(collection_address, blockchain);
            if (!collectionData) {
                return JSON.stringify({
                    error: "Collection not found",
                    collection_address,
                    blockchain
                }, null, 2);
            }
            // Calculate various metrics for advice
            const holderConcentration = collectionData.nft_count > 0 ? (collectionData.owner_count / collectionData.nft_count) : 0;
            const avgSalePrice = collectionData.sales_24h > 0 ? (collectionData.volume_24h / collectionData.sales_24h) : 0;
            const priceToFloor = avgSalePrice > 0 ? (avgSalePrice / collectionData.floor_price) : 1;
            const washTradingPercentage = washTradingData?.wash_trading_percentage || 0;
            // Generate advice based on metrics and risk tolerance
            let recommendation = "NEUTRAL";
            let confidence = 50;
            const pros = [];
            const cons = [];
            const risks = [];
            // Analyze positives
            if (holderConcentration > 0.3) {
                pros.push("Good holder distribution suggests organic interest");
                confidence += 10;
            }
            if (collectionData.volume_change_24h > 20) {
                pros.push("Strong volume growth indicates increasing demand");
                confidence += 15;
            }
            if (washTradingPercentage < 10) {
                pros.push("Low wash trading suggests authentic market activity");
                confidence += 10;
            }
            if (collectionData.owner_count > 1000) {
                pros.push("Large holder base provides liquidity and stability");
                confidence += 10;
            }
            // Analyze negatives
            if (washTradingPercentage > 30) {
                cons.push("High wash trading may indicate artificial volume");
                risks.push("Price manipulation risk");
                confidence -= 25;
            }
            if (collectionData.owner_count < 100) {
                cons.push("Small holder base increases volatility risk");
                risks.push("Liquidity risk");
                confidence -= 15;
            }
            if (priceToFloor > 2) {
                cons.push("Current prices significantly above floor price");
                risks.push("Price correction risk");
                confidence -= 10;
            }
            if (collectionData.volume_change_24h < -20) {
                cons.push("Declining volume suggests weakening interest");
                confidence -= 15;
            }
            // Adjust recommendation based on risk tolerance and confidence
            if (confidence >= 70 && (risk_tolerance === "high" || (risk_tolerance === "medium" && confidence >= 80))) {
                recommendation = "BUY";
            }
            else if (confidence <= 30 || (risk_tolerance === "low" && confidence <= 50)) {
                recommendation = "SELL";
            }
            else if (confidence >= 60 && risk_tolerance !== "low") {
                recommendation = "CAUTIOUS_BUY";
            }
            else if (confidence <= 40) {
                recommendation = "CAUTIOUS_SELL";
            }
            const advice = {
                collection_address,
                blockchain,
                collection_name: collectionData.name,
                recommendation,
                confidence_score: Math.max(0, Math.min(100, confidence)),
                risk_tolerance,
                investment_amount,
                analysis: {
                    current_metrics: {
                        floor_price: collectionData.floor_price,
                        volume_24h: collectionData.volume_24h,
                        sales_24h: collectionData.sales_24h,
                        owner_count: collectionData.owner_count,
                        market_cap: collectionData.market_cap
                    },
                    holder_concentration: holderConcentration,
                    wash_trading_percentage: washTradingPercentage,
                    price_to_floor_ratio: priceToFloor
                },
                pros,
                cons,
                risks,
                specific_advice: recommendation === "BUY" ? [
                    "Strong fundamentals support investment",
                    "Consider dollar-cost averaging for larger positions",
                    "Monitor for any changes in holder distribution"
                ] : recommendation === "CAUTIOUS_BUY" ? [
                    "Moderate opportunity with manageable risks",
                    "Start with smaller position size",
                    "Set clear exit criteria before investing"
                ] : recommendation === "CAUTIOUS_SELL" ? [
                    "Consider reducing position if holding",
                    "Watch for trend reversal signals",
                    "Avoid new investments until clarity improves"
                ] : [
                    "High risk or poor fundamentals detected",
                    "Avoid new investments",
                    "Consider exiting positions if holding"
                ],
                market_timing: collectionData.volume_change_24h > 0 ? "FAVORABLE" : "UNFAVORABLE",
                analysis_timestamp: new Date().toISOString()
            };
            log.info("Investment advice generated", { recommendation, confidence_score: confidence });
            return JSON.stringify(advice, null, 2);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            log.error("Error generating investment advice", { error: errorMessage });
            return JSON.stringify({
                error: "Failed to generate investment advice",
                details: errorMessage,
                collection_address,
                blockchain
            }, null, 2);
        }
    }
});
// Start the server
async function startServer() {
    try {
        // Check for required API key
        if (!process.env.UNLEASH_NFTS_API_KEY) {
            console.error("❌ UNLEASH_NFTS_API_KEY environment variable is required");
            console.error("Please set it in your .env file");
            process.exit(1);
        }
        // Start with HTTP streaming for web frontend integration
        await server.start({
            transportType: "httpStream",
            httpStream: {
                port: 3001,
                endpoint: "/mcp"
            }
        });
        console.log("🚀 FastMCP NFT Analytics Server started on http://localhost:3001/mcp");
        console.log("📊 Ready to analyze NFTs with advanced analytics!");
        console.log("🔧 Available tools: analyzeCollection, detectWashTrading, getMarketTrends, checkWalletRisk, getInvestmentAdvice");
    }
    catch (error) {
        console.error("Failed to start FastMCP server:", error);
        process.exit(1);
    }
}
// Also support stdio for direct MCP client connections
if (process.argv.includes('--stdio')) {
    server.start({
        transportType: "stdio"
    }).then(() => {
        console.log("FastMCP NFT Analytics Server started with stdio transport");
    }).catch((error) => {
        console.error("Failed to start server:", error);
        process.exit(1);
    });
}
else {
    startServer().catch(() => process.exit(1));
}
