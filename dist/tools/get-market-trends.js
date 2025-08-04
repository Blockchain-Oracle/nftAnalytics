import { z } from "zod";
import { UnleashNFTsClient } from "../unleash-client.js";
export function getMarketTrendsTool(server) {
    server.tool("getMarketTrends", {
        time_range: z.string().optional().describe("Time range for analysis: 24h, 7d, or 30d (default: 24h)"),
        category: z.string().optional().describe("Category filter: all, pfp, gaming, art (default: all)")
    }, async ({ time_range = "24h", category = "all" }) => {
        const client = new UnleashNFTsClient();
        try {
            // Fetch market metrics
            const marketMetrics = await client.getMarketMetrics(time_range);
            if (!marketMetrics) {
                return {
                    content: [{
                            type: "text",
                            text: JSON.stringify({
                                error: "Unable to fetch market metrics",
                                time_range
                            }, null, 2)
                        }]
                };
            }
            // Fetch trending collections
            const trendingCollections = await client.getTrendingCollections(10);
            // Determine market sentiment
            const sentiment = determineMarketSentiment(marketMetrics);
            // Generate market insights
            const insights = generateMarketInsights(marketMetrics, trendingCollections, sentiment);
            // Format trending collections data
            const formattedTrending = trendingCollections.slice(0, 5).map(collection => ({
                name: collection.name,
                address: collection.contract_address,
                volume_change: collection.volume_change_24h,
                floor_change: collection.floor_price_change_24h,
                volume_24h: collection.volume_24h,
                floor_price: collection.floor_price,
                holders: collection.owner_count
            }));
            const result = {
                time_range,
                category,
                market_sentiment: sentiment,
                market_metrics: {
                    total_volume: marketMetrics.volume_24h,
                    volume_change: marketMetrics.volume_change_24h,
                    total_sales: marketMetrics.sales_24h,
                    sales_change: marketMetrics.sales_change_24h,
                    average_price: marketMetrics.average_price,
                    average_price_change: marketMetrics.average_price_change,
                    active_traders: marketMetrics.active_wallets,
                    traders_change: marketMetrics.active_wallets_change
                },
                trending_collections: formattedTrending,
                market_analysis: generateMarketAnalysis(marketMetrics, sentiment),
                insights,
                investment_opportunities: identifyOpportunities(trendingCollections, marketMetrics)
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
                            error: "Failed to get market trends",
                            message: error.message,
                            time_range
                        }, null, 2)
                    }],
                isError: true
            };
        }
    });
}
function determineMarketSentiment(metrics) {
    let score = 0;
    // Volume change impact
    if (metrics.volume_change_24h > 20)
        score += 2;
    else if (metrics.volume_change_24h > 0)
        score += 1;
    else if (metrics.volume_change_24h < -20)
        score -= 2;
    else if (metrics.volume_change_24h < 0)
        score -= 1;
    // Sales change impact
    if (metrics.sales_change_24h > 15)
        score += 1;
    else if (metrics.sales_change_24h < -15)
        score -= 1;
    // Active wallets change
    if (metrics.active_wallets_change > 10)
        score += 1;
    else if (metrics.active_wallets_change < -10)
        score -= 1;
    // Price change impact
    if (metrics.average_price_change > 10)
        score += 1;
    else if (metrics.average_price_change < -10)
        score -= 1;
    if (score >= 3)
        return "bullish";
    if (score <= -3)
        return "bearish";
    return "neutral";
}
function generateMarketInsights(metrics, trending, sentiment) {
    const insights = [];
    // Volume insights
    if (Math.abs(metrics.volume_change_24h) > 30) {
        insights.push(metrics.volume_change_24h > 0
            ? `Significant volume surge of ${metrics.volume_change_24h.toFixed(1)}% indicates increased market activity`
            : `Volume decline of ${Math.abs(metrics.volume_change_24h).toFixed(1)}% suggests reduced trading interest`);
    }
    // Active trader insights
    if (Math.abs(metrics.active_wallets_change) > 20) {
        insights.push(metrics.active_wallets_change > 0
            ? `${metrics.active_wallets_change.toFixed(1)}% increase in active traders shows growing market participation`
            : `${Math.abs(metrics.active_wallets_change).toFixed(1)}% decrease in active traders indicates market cooling`);
    }
    // Price trend insights
    if (metrics.average_price_change > 15) {
        insights.push("Rising average prices across the market suggest strong buying pressure");
    }
    else if (metrics.average_price_change < -15) {
        insights.push("Declining average prices indicate selling pressure or market correction");
    }
    // Trending collection insights
    const highGrowth = trending.filter(c => c.volume_change_24h > 50);
    if (highGrowth.length > 0) {
        insights.push(`${highGrowth.length} collections showing explosive growth (>50% volume increase)`);
    }
    // Market sentiment summary
    if (sentiment === "bullish") {
        insights.push("Overall market sentiment is bullish with multiple positive indicators");
    }
    else if (sentiment === "bearish") {
        insights.push("Market sentiment is bearish - consider defensive strategies");
    }
    else {
        insights.push("Market showing mixed signals - selective opportunities may exist");
    }
    return insights;
}
function generateMarketAnalysis(metrics, sentiment) {
    let analysis = `The NFT market is currently showing ${sentiment} sentiment. `;
    analysis += `Trading volume of $${(metrics.volume_24h / 1000000).toFixed(2)}M represents a ${metrics.volume_change_24h > 0 ? 'gain' : 'loss'} of ${Math.abs(metrics.volume_change_24h).toFixed(1)}% compared to the previous period. `;
    if (metrics.active_wallets > 0) {
        analysis += `With ${metrics.active_wallets.toLocaleString()} active traders (${metrics.active_wallets_change > 0 ? '+' : ''}${metrics.active_wallets_change.toFixed(1)}%), `;
        if (metrics.active_wallets_change > 10) {
            analysis += "we're seeing increased market participation. ";
        }
        else if (metrics.active_wallets_change < -10) {
            analysis += "trader participation is declining. ";
        }
        else {
            analysis += "trader participation remains stable. ";
        }
    }
    if (Math.abs(metrics.average_price_change) > 5) {
        analysis += `Average NFT prices have ${metrics.average_price_change > 0 ? 'increased' : 'decreased'} by ${Math.abs(metrics.average_price_change).toFixed(1)}%, `;
        analysis += metrics.average_price_change > 0
            ? "indicating strong demand across collections. "
            : "suggesting price corrections or reduced demand. ";
    }
    return analysis;
}
function identifyOpportunities(trending, metrics) {
    const opportunities = [];
    // Look for undervalued collections
    const undervalued = trending.filter(c => c.volume_change_24h > 20 &&
        c.floor_price_change_24h < 5 &&
        c.owner_count > 1000);
    if (undervalued.length > 0) {
        opportunities.push(`${undervalued[0].name} showing strong volume growth without price appreciation - potential entry opportunity`);
    }
    // High holder growth
    const growingCommunity = trending.filter(c => c.owner_count > 2000 &&
        c.floor_price < metrics.average_price);
    if (growingCommunity.length > 0) {
        opportunities.push(`Collections with growing holder bases below market average price present value opportunities`);
    }
    // Market timing
    if (metrics.volume_change_24h < -20 && metrics.average_price_change < -15) {
        opportunities.push("Market downturn may present buying opportunities for quality collections");
    }
    else if (metrics.volume_change_24h > 30 && metrics.active_wallets_change > 20) {
        opportunities.push("Strong market momentum - consider taking profits on overextended positions");
    }
    // General advice
    if (opportunities.length === 0) {
        opportunities.push("Market conditions suggest patience and selective positioning");
        opportunities.push("Focus on collections with strong fundamentals and growing communities");
    }
    return opportunities;
}
