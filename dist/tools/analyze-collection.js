import { z } from "zod";
import { UnleashNFTsClient } from "../unleash-client.js";
export function analyzeCollectionTool(server) {
    server.tool("analyzeCollection", {
        collection_address: z.string().describe("The NFT collection contract address"),
        blockchain: z.string().optional().describe("Blockchain network (ethereum or polygon, default: ethereum)")
    }, async ({ collection_address, blockchain = "ethereum" }) => {
        const client = new UnleashNFTsClient();
        try {
            // Fetch collection data
            const collectionData = await client.getCollectionData(collection_address, blockchain);
            if (!collectionData) {
                return {
                    content: [{
                            type: "text",
                            text: JSON.stringify({
                                error: "Collection not found",
                                collection_address,
                                blockchain
                            }, null, 2)
                        }]
                };
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
            else if (washTradingData && washTradingData.wash_trading_percentage > 15) {
                safetyScore -= 15;
                risks.push("moderate_wash_trading");
            }
            // Check volume changes
            if (collectionData.volume_change_24h < -50) {
                safetyScore -= 15;
                risks.push("sharp_volume_decline");
            }
            // Check price volatility
            if (Math.abs(collectionData.floor_price_change_24h) > 30) {
                safetyScore -= 10;
                risks.push("high_price_volatility");
            }
            // Determine recommendation
            let recommendation;
            if (safetyScore >= 80) {
                recommendation = "SAFE";
            }
            else if (safetyScore >= 60) {
                recommendation = "CAUTION";
            }
            else {
                recommendation = "HIGH_RISK";
            }
            // Generate analysis
            const analysis = generateAnalysis(collectionData, washTradingData, risks, safetyScore);
            const result = {
                collection_name: collectionData.name,
                contract_address: collectionData.contract_address,
                blockchain,
                safety_score: safetyScore,
                risks,
                metrics: {
                    holders: collectionData.owner_count,
                    volume_24h: collectionData.volume_24h,
                    floor_price: collectionData.floor_price,
                    wash_trading_percentage: washTradingData?.wash_trading_percentage || 0,
                    volume_change_24h: collectionData.volume_change_24h,
                    floor_price_change_24h: collectionData.floor_price_change_24h
                },
                recommendation,
                analysis
            };
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify(result, null, 2)
                    }]
            };
        }
        catch (error) {
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            error: "Failed to analyze collection",
                            message: error.message,
                            collection_address,
                            blockchain
                        }, null, 2)
                    }],
                isError: true
            };
        }
    });
}
function generateAnalysis(collectionData, washTradingData, risks, safetyScore) {
    let analysis = `${collectionData.name} has a safety score of ${safetyScore}/100. `;
    if (risks.length === 0) {
        analysis += "This collection shows strong fundamentals with no significant risk factors detected. ";
    }
    else {
        analysis += `We've identified ${risks.length} risk factor${risks.length > 1 ? 's' : ''}: `;
        if (risks.includes("high_wash_trading")) {
            analysis += `High wash trading activity (${washTradingData.wash_trading_percentage.toFixed(1)}% of volume) suggests artificial price inflation. `;
        }
        if (risks.includes("low_holder_count")) {
            analysis += `Low holder count (${collectionData.owner_count}) indicates high concentration risk. `;
        }
        if (risks.includes("sharp_volume_decline")) {
            analysis += `Sharp volume decline (${collectionData.volume_change_24h.toFixed(1)}%) may indicate waning interest. `;
        }
        if (risks.includes("high_price_volatility")) {
            analysis += `High price volatility (${Math.abs(collectionData.floor_price_change_24h).toFixed(1)}% change) suggests market uncertainty. `;
        }
    }
    // Add recommendation
    if (safetyScore >= 80) {
        analysis += "This collection appears safe for investment with proper due diligence.";
    }
    else if (safetyScore >= 60) {
        analysis += "Exercise caution when investing. Consider the identified risks carefully.";
    }
    else {
        analysis += "High risk detected. Not recommended for risk-averse investors.";
    }
    return analysis;
}
