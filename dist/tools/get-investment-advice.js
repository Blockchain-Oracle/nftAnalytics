import { z } from "zod";
import { UnleashNFTsClient } from "../unleash-client.js";
export function getInvestmentAdviceTool(server) {
    server.tool("getInvestmentAdvice", {
        budget: z.number().describe("Investment budget in USD"),
        risk_tolerance: z.string().describe("Risk tolerance: conservative, moderate, or aggressive"),
        investment_horizon: z.string().describe("Investment timeframe: short (< 3 months), medium (3-12 months), or long (> 12 months)"),
        categories: z.array(z.string()).optional().describe("Preferred NFT categories (e.g., ['pfp', 'gaming', 'art'])")
    }, async ({ budget, risk_tolerance, investment_horizon, categories = [] }) => {
        const client = new UnleashNFTsClient();
        try {
            // Validate inputs
            if (!['conservative', 'moderate', 'aggressive'].includes(risk_tolerance)) {
                return {
                    content: [{
                            type: "text",
                            text: JSON.stringify({
                                error: "Invalid risk tolerance. Must be: conservative, moderate, or aggressive",
                                provided: risk_tolerance
                            }, null, 2)
                        }]
                };
            }
            if (!['short', 'medium', 'long'].includes(investment_horizon)) {
                return {
                    content: [{
                            type: "text",
                            text: JSON.stringify({
                                error: "Invalid investment horizon. Must be: short, medium, or long",
                                provided: investment_horizon
                            }, null, 2)
                        }]
                };
            }
            // Fetch market data
            const [marketMetrics, trendingCollections] = await Promise.all([
                client.getMarketMetrics('24h'),
                client.getTrendingCollections(20)
            ]);
            if (!marketMetrics || !trendingCollections) {
                return {
                    content: [{
                            type: "text",
                            text: JSON.stringify({
                                error: "Unable to fetch market data for analysis"
                            }, null, 2)
                        }]
                };
            }
            // Analyze market conditions
            const marketCondition = analyzeMarketCondition(marketMetrics);
            // Filter and score collections based on criteria
            const scoredCollections = await scoreCollections(trendingCollections, risk_tolerance, investment_horizon, budget, client);
            // Generate portfolio recommendations
            const recommendations = generatePortfolioRecommendations(scoredCollections, budget, risk_tolerance, investment_horizon);
            // Calculate portfolio metrics
            const portfolioMetrics = calculatePortfolioMetrics(recommendations, risk_tolerance);
            // Generate warnings and advice
            const warnings = generateWarnings(marketCondition, risk_tolerance, budget);
            const result = {
                budget,
                risk_tolerance,
                investment_horizon,
                market_conditions: marketCondition,
                recommendations,
                portfolio_metrics: portfolioMetrics,
                investment_strategy: generateInvestmentStrategy(risk_tolerance, investment_horizon, marketCondition),
                warnings,
                diversification_advice: generateDiversificationAdvice(recommendations, budget),
                exit_strategy: generateExitStrategy(risk_tolerance, investment_horizon)
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
                            error: "Failed to generate investment advice",
                            message: error.message
                        }, null, 2)
                    }],
                isError: true
            };
        }
    });
}
function analyzeMarketCondition(metrics) {
    const sentiment = metrics.volume_change_24h > 10 && metrics.sales_change_24h > 5 ? "bullish" :
        metrics.volume_change_24h < -10 && metrics.sales_change_24h < -5 ? "bearish" :
            "neutral";
    return {
        sentiment,
        volume_trend: metrics.volume_change_24h > 0 ? "increasing" : "decreasing",
        price_trend: metrics.average_price_change > 0 ? "rising" : "falling",
        activity_level: metrics.active_wallets > 10000 ? "high" : metrics.active_wallets > 5000 ? "moderate" : "low",
        description: generateMarketDescription(sentiment, metrics)
    };
}
function generateMarketDescription(sentiment, metrics) {
    if (sentiment === "bullish") {
        return `Market showing strong momentum with ${metrics.volume_change_24h.toFixed(1)}% volume increase and growing trader participation.`;
    }
    else if (sentiment === "bearish") {
        return `Market experiencing downturn with ${Math.abs(metrics.volume_change_24h).toFixed(1)}% volume decline. Caution advised.`;
    }
    else {
        return "Market showing mixed signals. Selective opportunities available for careful investors.";
    }
}
async function scoreCollections(collections, riskTolerance, horizon, budget, client) {
    const scored = [];
    for (const collection of collections) {
        // Skip if floor price exceeds budget
        if (collection.floor_price > budget)
            continue;
        let score = 0;
        const factors = [];
        // Holder count factor
        if (collection.owner_count > 5000) {
            score += riskTolerance === 'conservative' ? 30 : 20;
            factors.push("strong_community");
        }
        else if (collection.owner_count > 2000) {
            score += 15;
            factors.push("growing_community");
        }
        // Volume trend factor
        if (collection.volume_change_24h > 20 && riskTolerance !== 'conservative') {
            score += 20;
            factors.push("high_momentum");
        }
        else if (collection.volume_change_24h > 0) {
            score += 10;
            factors.push("positive_momentum");
        }
        // Price stability factor
        if (Math.abs(collection.floor_price_change_24h) < 10) {
            score += riskTolerance === 'conservative' ? 25 : 15;
            factors.push("price_stability");
        }
        // Liquidity factor
        if (collection.sales_24h > 100) {
            score += 20;
            factors.push("high_liquidity");
        }
        else if (collection.sales_24h > 50) {
            score += 10;
            factors.push("moderate_liquidity");
        }
        // Time horizon adjustments
        if (horizon === 'long' && collection.owner_count > 3000) {
            score += 15;
            factors.push("long_term_potential");
        }
        else if (horizon === 'short' && collection.volume_change_24h > 30) {
            score += 15;
            factors.push("short_term_opportunity");
        }
        scored.push({
            collection: collection.name,
            address: collection.contract_address,
            score,
            floor_price: collection.floor_price,
            factors,
            metrics: {
                holders: collection.owner_count,
                volume_24h: collection.volume_24h,
                volume_change: collection.volume_change_24h,
                floor_change: collection.floor_price_change_24h,
                sales_24h: collection.sales_24h
            }
        });
    }
    return scored.sort((a, b) => b.score - a.score);
}
function generatePortfolioRecommendations(scoredCollections, budget, riskTolerance, horizon) {
    const recommendations = [];
    let remainingBudget = budget;
    // Determine number of positions based on budget and risk
    const maxPositions = budget < 1000 ? 1 :
        budget < 5000 ? (riskTolerance === 'conservative' ? 2 : 3) :
            budget < 20000 ? (riskTolerance === 'conservative' ? 3 : 5) :
                (riskTolerance === 'conservative' ? 5 : 8);
    // Allocation strategy
    const allocationStrategy = riskTolerance === 'conservative' ? [0.4, 0.3, 0.2, 0.1] :
        riskTolerance === 'moderate' ? [0.35, 0.25, 0.2, 0.15, 0.05] :
            [0.3, 0.25, 0.2, 0.15, 0.1];
    for (let i = 0; i < Math.min(scoredCollections.length, maxPositions); i++) {
        const collection = scoredCollections[i];
        const allocation = allocationStrategy[i] || 0.1;
        const allocatedBudget = budget * allocation;
        if (collection.floor_price <= allocatedBudget) {
            const quantity = Math.floor(allocatedBudget / collection.floor_price);
            recommendations.push({
                collection: collection.collection,
                allocation: (allocation * 100).toFixed(0) + '%',
                budget_allocation: allocatedBudget,
                recommended_quantity: quantity,
                entry_price: collection.floor_price,
                reasoning: generateRecommendationReasoning(collection, riskTolerance, horizon),
                risk_level: getRiskLevel(collection, riskTolerance),
                expected_return: generateExpectedReturn(collection, horizon),
                key_factors: collection.factors
            });
            remainingBudget -= allocatedBudget;
        }
    }
    return recommendations;
}
function generateRecommendationReasoning(collection, riskTolerance, horizon) {
    let reasoning = `${collection.collection} scores ${collection.score}/100 based on `;
    const factors = collection.factors.join(', ').replace(/_/g, ' ');
    reasoning += factors + '. ';
    if (collection.factors.includes('strong_community')) {
        reasoning += 'Large holder base provides stability. ';
    }
    if (collection.factors.includes('high_momentum')) {
        reasoning += 'Strong recent performance indicates market interest. ';
    }
    if (collection.factors.includes('price_stability')) {
        reasoning += 'Stable pricing reduces volatility risk. ';
    }
    return reasoning;
}
function getRiskLevel(collection, riskTolerance) {
    if (collection.factors.includes('price_stability') && collection.factors.includes('strong_community')) {
        return 'LOW';
    }
    else if (collection.factors.includes('high_momentum') && !collection.factors.includes('strong_community')) {
        return 'HIGH';
    }
    return 'MEDIUM';
}
function generateExpectedReturn(collection, horizon) {
    if (horizon === 'short') {
        return collection.metrics.volume_change > 30 ? '10-20%' : '5-10%';
    }
    else if (horizon === 'medium') {
        return collection.metrics.holders > 5000 ? '20-50%' : '10-30%';
    }
    else {
        return collection.metrics.holders > 5000 ? '50-200%' : '30-100%';
    }
}
function calculatePortfolioMetrics(recommendations, riskTolerance) {
    const totalAllocated = recommendations.reduce((sum, rec) => sum + rec.budget_allocation, 0);
    const avgRisk = recommendations.filter(r => r.risk_level === 'HIGH').length / recommendations.length;
    return {
        total_positions: recommendations.length,
        total_allocated: totalAllocated,
        average_position_size: totalAllocated / recommendations.length,
        diversification_score: Math.min(recommendations.length * 20, 100),
        risk_score: avgRisk > 0.5 ? 'HIGH' : avgRisk > 0.2 ? 'MEDIUM' : 'LOW',
        expected_return_range: riskTolerance === 'conservative' ? '10-30%' :
            riskTolerance === 'moderate' ? '20-50%' : '30-100%'
    };
}
function generateWarnings(marketCondition, riskTolerance, budget) {
    const warnings = [];
    if (marketCondition.sentiment === 'bearish' && riskTolerance === 'conservative') {
        warnings.push("Market conditions are challenging for conservative investors - consider waiting");
    }
    if (budget < 500) {
        warnings.push("Limited budget restricts diversification - higher concentration risk");
    }
    if (marketCondition.activity_level === 'low') {
        warnings.push("Low market activity may impact ability to exit positions quickly");
    }
    warnings.push("NFT investments are highly speculative - only invest what you can afford to lose");
    warnings.push("Past performance does not guarantee future results");
    return warnings;
}
function generateInvestmentStrategy(riskTolerance, horizon, marketCondition) {
    let strategy = "";
    if (riskTolerance === 'conservative') {
        strategy = "Focus on established collections with strong communities and stable pricing. ";
        strategy += "Avoid new launches and high-volatility assets. ";
        strategy += horizon === 'long' ? "Hold through market cycles for best results." : "Take profits at 20-30% gains.";
    }
    else if (riskTolerance === 'moderate') {
        strategy = "Balance between blue-chip NFTs and emerging collections with potential. ";
        strategy += "Monitor market trends and rebalance quarterly. ";
        strategy += "Set stop-losses at -20% to manage downside risk.";
    }
    else {
        strategy = "Pursue high-growth opportunities in trending collections. ";
        strategy += "Be prepared for significant volatility. ";
        strategy += "Use profits from winners to explore new opportunities.";
    }
    return strategy;
}
function generateDiversificationAdvice(recommendations, budget) {
    if (recommendations.length === 1) {
        return "Limited budget allows only single position - consider saving for better diversification.";
    }
    else if (recommendations.length < 3) {
        return "Minimal diversification achieved. Monitor positions closely and avoid overconcentration.";
    }
    else if (recommendations.length < 5) {
        return "Moderate diversification across collections. Good balance of risk and opportunity.";
    }
    else {
        return "Well-diversified portfolio reduces single-collection risk. Rebalance periodically.";
    }
}
function generateExitStrategy(riskTolerance, horizon) {
    if (horizon === 'short') {
        return "Take profits at 20-30% gains. Cut losses at -15%. Monitor daily for exit opportunities.";
    }
    else if (horizon === 'medium') {
        return "Target 50-100% returns. Use trailing stops to protect gains. Reassess monthly.";
    }
    else {
        return "Hold quality collections through cycles. Only sell if fundamentals deteriorate. Review quarterly.";
    }
}
