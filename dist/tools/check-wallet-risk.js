import { z } from "zod";
import { UnleashNFTsClient } from "../unleash-client.js";
export function checkWalletRiskTool(server) {
    server.tool("checkWalletRisk", {
        wallet_address: z.string().describe("The wallet address to analyze"),
        include_holdings: z.boolean().optional().describe("Include current NFT holdings analysis (default: true)"),
        blockchain: z.string().optional().describe("Blockchain network (ethereum or polygon, default: ethereum)")
    }, async ({ wallet_address, include_holdings = true, blockchain = "ethereum" }) => {
        const client = new UnleashNFTsClient();
        try {
            // Validate wallet address format
            if (!wallet_address.match(/^0x[a-fA-F0-9]{40}$/)) {
                return {
                    content: [{
                            type: "text",
                            text: JSON.stringify({
                                error: "Invalid wallet address format",
                                wallet_address
                            }, null, 2)
                        }]
                };
            }
            // Fetch wallet profile
            const walletProfile = await client.getWalletProfile(wallet_address, blockchain);
            if (!walletProfile) {
                return {
                    content: [{
                            type: "text",
                            text: JSON.stringify({
                                error: "Unable to fetch wallet profile",
                                wallet_address,
                                blockchain
                            }, null, 2)
                        }]
                };
            }
            // Calculate risk score (0-100, where 100 is highest risk)
            let riskScore = 0;
            const redFlags = [];
            // Check whale/shark status
            let walletType = "regular";
            if (walletProfile.is_whale) {
                walletType = "whale";
            }
            else if (walletProfile.is_shark) {
                walletType = "shark";
            }
            // Check wash trading score
            if (walletProfile.washtrade_score > 50) {
                riskScore += 40;
                redFlags.push("high_wash_trading_activity");
            }
            else if (walletProfile.washtrade_score > 20) {
                riskScore += 20;
                redFlags.push("moderate_wash_trading_activity");
            }
            // Check trading patterns
            const profitLossRatio = walletProfile.realized_gains / Math.max(walletProfile.realized_losses, 1);
            if (profitLossRatio < 0.5 && walletProfile.realized_losses > 10000) {
                riskScore += 15;
                redFlags.push("poor_trading_performance");
            }
            // Check portfolio concentration
            if (walletProfile.collection_count === 1 && walletProfile.nft_count > 10) {
                riskScore += 20;
                redFlags.push("highly_concentrated_portfolio");
            }
            // Check for suspicious patterns
            if (walletProfile.nft_count === 0 && walletProfile.total_value > 0) {
                riskScore += 15;
                redFlags.push("inconsistent_portfolio_data");
            }
            // Generate risk assessment
            const riskLevel = getRiskLevel(riskScore);
            const analysis = generateWalletAnalysis(walletProfile, riskScore, redFlags, walletType);
            const result = {
                wallet_address,
                blockchain,
                risk_score: riskScore,
                risk_level: riskLevel,
                wallet_type: walletType,
                metrics: {
                    total_nfts: walletProfile.nft_count,
                    collections_held: walletProfile.collection_count,
                    portfolio_value: walletProfile.total_value,
                    realized_gains: walletProfile.realized_gains,
                    realized_losses: walletProfile.realized_losses,
                    profit_loss_ratio: profitLossRatio.toFixed(2),
                    wash_trade_score: walletProfile.washtrade_score
                },
                red_flags: redFlags,
                analysis,
                recommendations: getWalletRecommendations(riskLevel, redFlags, walletType)
            };
            // Add holdings analysis if requested
            if (include_holdings && walletProfile.nft_count > 0) {
                result.holdings_summary = {
                    total_nfts: walletProfile.nft_count,
                    collections: walletProfile.collection_count,
                    estimated_value: walletProfile.total_value,
                    note: "Detailed holdings analysis requires additional API calls"
                };
            }
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
                            error: "Failed to check wallet risk",
                            message: error.message,
                            wallet_address,
                            blockchain
                        }, null, 2)
                    }],
                isError: true
            };
        }
    });
}
function getRiskLevel(score) {
    if (score >= 70)
        return "HIGH";
    if (score >= 40)
        return "MODERATE";
    if (score >= 20)
        return "LOW";
    return "MINIMAL";
}
function generateWalletAnalysis(profile, riskScore, redFlags, walletType) {
    let analysis = `This ${walletType} wallet has a risk score of ${riskScore}/100. `;
    // Wallet type analysis
    if (walletType === "whale") {
        analysis += "As a whale wallet, this address has significant market influence. ";
    }
    else if (walletType === "shark") {
        analysis += "This shark wallet shows sophisticated trading patterns. ";
    }
    // Red flags analysis
    if (redFlags.length === 0) {
        analysis += "No significant risk factors detected. The wallet shows normal trading behavior. ";
    }
    else {
        analysis += `We've identified ${redFlags.length} risk factor${redFlags.length > 1 ? 's' : ''}: `;
        if (redFlags.includes("high_wash_trading_activity")) {
            analysis += `High wash trading score (${profile.washtrade_score}) indicates artificial trading activity. `;
        }
        if (redFlags.includes("poor_trading_performance")) {
            analysis += `Poor profit/loss ratio suggests either inexperienced trading or potential manipulation. `;
        }
        if (redFlags.includes("highly_concentrated_portfolio")) {
            analysis += `Portfolio is concentrated in a single collection, indicating high risk exposure. `;
        }
    }
    // Portfolio analysis
    if (profile.nft_count > 0) {
        analysis += `The wallet holds ${profile.nft_count} NFTs across ${profile.collection_count} collection${profile.collection_count !== 1 ? 's' : ''} `;
        analysis += `with an estimated value of $${profile.total_value.toLocaleString()}. `;
    }
    // Trading performance
    if (profile.realized_gains > 0 || profile.realized_losses > 0) {
        analysis += `Historical trading shows $${profile.realized_gains.toLocaleString()} in gains and $${profile.realized_losses.toLocaleString()} in losses. `;
    }
    return analysis;
}
function getWalletRecommendations(riskLevel, redFlags, walletType) {
    const recommendations = [];
    if (riskLevel === "HIGH") {
        recommendations.push("Exercise extreme caution when trading with this wallet");
        recommendations.push("Verify all transactions carefully before proceeding");
        recommendations.push("Consider avoiding direct trades with this address");
    }
    else if (riskLevel === "MODERATE") {
        recommendations.push("Proceed with caution in any transactions");
        recommendations.push("Verify the wallet's trading history before large trades");
        recommendations.push("Consider using escrow services for high-value transactions");
    }
    else if (riskLevel === "LOW") {
        recommendations.push("Standard due diligence recommended");
        recommendations.push("Monitor for any changes in trading patterns");
    }
    else {
        recommendations.push("This wallet appears safe for normal trading");
        recommendations.push("No special precautions necessary");
    }
    // Specific recommendations based on red flags
    if (redFlags.includes("high_wash_trading_activity")) {
        recommendations.push("Be aware of potential price manipulation in collections this wallet trades");
    }
    if (redFlags.includes("highly_concentrated_portfolio")) {
        recommendations.push("Wallet may be heavily invested in a single project - consider their bias");
    }
    // Wallet type specific
    if (walletType === "whale") {
        recommendations.push("Monitor this whale's movements as they can impact market prices");
    }
    return recommendations;
}
