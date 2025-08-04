import axios, { AxiosInstance } from 'axios';

export interface CollectionData {
  contract_address: string;
  name: string;
  owner_count: number;
  nft_count: number;
  volume_24h: number;
  floor_price: number;
  average_price_24h: number;
  sales_24h: number;
  volume_change_24h: number;
  floor_price_change_24h: number;
  average_price_change_24h: number;
  sales_change_24h: number;
  market_cap: number;
  fully_diluted_market_cap: number;
}

export interface MarketMetrics {
  volume_24h: number;
  volume_change_24h: number;
  sales_24h: number;
  sales_change_24h: number;
  average_price: number;
  average_price_change: number;
  active_wallets: number;
  active_wallets_change: number;
}

export interface WalletProfile {
  address: string;
  is_whale: boolean;
  is_shark: boolean;
  nft_count: number;
  collection_count: number;
  total_value: number;
  realized_gains: number;
  realized_losses: number;
  washtrade_score: number;
}

export class UnleashNFTsClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.UNLEASH_API_KEY || process.env.UNLEASH_NFTS_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('UnleashNFTs API key is required');
    }

    const baseURL = process.env.UNLEASH_API_URL || 'https://api.unleashnfts.com/api/v1';

    this.client = axios.create({
      baseURL,
      headers: {
        'accept': 'application/json',
        'x-api-key': this.apiKey
      },
      timeout: 30000 // 30 seconds
    });
  }

  private getBlockchainId(blockchain: string): string {
    const blockchainMap: { [key: string]: string } = {
      'ethereum': '1',
      'polygon': '137',
      'bsc': '56',
      'arbitrum': '42161',
      'optimism': '10'
    };
    return blockchainMap[blockchain.toLowerCase()] || '1';
  }

  async getCollectionData(address: string, blockchain: string = 'ethereum'): Promise<CollectionData | null> {
    try {
      const blockchainId = this.getBlockchainId(blockchain);
      
      // First get basic collection info
      const collectionResponse = await this.client.get(`/collection/${blockchainId}/${address}`);
      
      // Then get metrics with proper URL encoding
      const metricsParams = [
        'volume',
        'sales', 
        'floor_price',
        'holders',
        'price_avg',
        'marketcap',
        'volume_change',
        'sales_change',
        'holders_change'
      ].join(',');
      
      const metricsResponse = await this.client.get(`/collection/${blockchainId}/${address}/metrics?metrics=${encodeURIComponent(metricsParams)}`);

      const collection = collectionResponse.data;
      const metricsData = metricsResponse.data.metric_values || {};

      // Helper function to extract numeric value from metric object
      const getValue = (metric: any): number => {
        if (!metric) return 0;
        const value = parseFloat(metric.value || '0');
        return isNaN(value) ? 0 : value;
      };

      return {
        contract_address: address,
        name: collection.name || 'Unknown Collection',
        owner_count: getValue(metricsData.holders),
        nft_count: collection.nft_count || 0,
        volume_24h: getValue(metricsData.volume),
        floor_price: getValue(metricsData.floor_price),
        average_price_24h: getValue(metricsData.price_avg),
        sales_24h: getValue(metricsData.sales),
        volume_change_24h: getValue(metricsData.volume_change),
        floor_price_change_24h: 0, // Not available in basic metrics
        average_price_change_24h: 0, // Not available in basic metrics  
        sales_change_24h: getValue(metricsData.sales_change),
        market_cap: getValue(metricsData.marketcap),
        fully_diluted_market_cap: getValue(metricsData.marketcap) // Same as market cap
      };
    } catch (error: any) {
      console.error('Error fetching collection data:', error.response?.data || error.message);
      return null;
    }
  }

  async getMarketMetrics(timeRange: string = '24h'): Promise<MarketMetrics | null> {
    try {
      // Since market overview endpoint might not exist, let's aggregate from trending collections
      const trendingCollections = await this.getTrendingCollections(50);
      
      if (trendingCollections.length === 0) {
        return null;
      }

      // Aggregate metrics from trending collections
      const aggregated = trendingCollections.reduce((acc, collection) => ({
        volume_24h: acc.volume_24h + (collection.volume_24h || 0),
        sales_24h: acc.sales_24h + (collection.sales_24h || 0),
        active_wallets: acc.active_wallets + (collection.owner_count || 0)
      }), { volume_24h: 0, sales_24h: 0, active_wallets: 0 });

      const avgPrice = aggregated.sales_24h > 0 ? aggregated.volume_24h / aggregated.sales_24h : 0;

      return {
        volume_24h: aggregated.volume_24h,
        volume_change_24h: 0, // Not available from aggregation
        sales_24h: aggregated.sales_24h,
        sales_change_24h: 0, // Not available from aggregation
        average_price: avgPrice,
        average_price_change: 0, // Not available from aggregation
        active_wallets: Math.floor(aggregated.active_wallets / trendingCollections.length), // Average holders
        active_wallets_change: 0 // Not available from aggregation
      };
    } catch (error: any) {
      console.error('Error fetching market metrics:', error.response?.data || error.message);
      return null;
    }
  }

  async getWalletProfile(address: string, blockchain: string = 'ethereum'): Promise<WalletProfile | null> {
    try {
      const blockchainId = this.getBlockchainId(blockchain);
      const response = await this.client.get(`/wallet/${blockchainId}/${address}/profile`);

      const data = response.data;
      return {
        address,
        is_whale: data.is_whale || false,
        is_shark: data.is_shark || false,
        nft_count: data.nft_count || 0,
        collection_count: data.collection_count || 0,
        total_value: data.total_value || 0,
        realized_gains: data.realized_gains || 0,
        realized_losses: data.realized_losses || 0,
        washtrade_score: data.washtrade_score || 0
      };
    } catch (error: any) {
      console.error('Error fetching wallet profile:', error.response?.data || error.message);
      return null;
    }
  }

  async getCollectionWashTrading(address: string, blockchain: string = 'ethereum'): Promise<any> {
    try {
      const blockchainId = this.getBlockchainId(blockchain);
      
      // Use the correct V1 wash trading endpoint with proper parameters
      const washtradingMetrics = [
        'washtrade_wallets',
        'washtrade_assets', 
        'washtrade_suspect_sales',
        'washtrade_volume',
        'washtrade_suspect_sales_change'
      ].join(',');
      
      // Build URL with proper encoding (same approach as collection metrics)
      const encodedMetrics = encodeURIComponent(washtradingMetrics);
      const response = await this.client.get(`/collection/${blockchainId}/${address}/trend?currency=usd&metrics=${encodedMetrics}&time_range=7d&include_washtrade=true`);

      const data = response.data;
      
      // Process the trend data to get latest wash trading info
      if (data.data_points && data.data_points.length > 0) {
        // Find the most recent data point with actual values (not "NA")
        const latestData = data.data_points.find((point: any) => 
          point.values && 
          point.values.washtrade_volume !== "NA" && 
          point.values.washtrade_volume !== null
        );
        
        if (latestData && latestData.values) {
          const values = latestData.values;
          return {
            wash_trading_volume: parseFloat(values.washtrade_volume || '0'),
            total_volume: 0, // V1 doesn't provide total volume in this endpoint
            wash_trading_percentage: 0, // We'll calculate this if we have total volume
            wash_trading_sales: parseInt(values.washtrade_suspect_sales || '0'),
            total_sales: 0, // V1 doesn't provide total sales in this endpoint
            wash_trading_wallets: parseInt(values.washtrade_wallets || '0'),
            wash_trading_assets: parseInt(values.washtrade_assets || '0'),
            risk_score: values.washtrade_suspect_sales_change || 0,
            date: latestData.date
          };
        }
      }
      
      // If no valid data_points, check the metrics summary
      if (data.metrics) {
        const metrics = data.metrics;
        return {
          wash_trading_volume: parseFloat(metrics.washtrade_volume?.value || '0'),
          total_volume: 0, // V1 doesn't provide total volume in this endpoint
          wash_trading_percentage: 0, // We'll calculate this if we have total volume
          wash_trading_sales: parseInt(metrics.washtrade_suspect_sales?.value || '0'),
          total_sales: 0, // V1 doesn't provide total sales in this endpoint
          wash_trading_wallets: parseInt(metrics.washtrade_wallets?.value || '0'),
          wash_trading_assets: parseInt(metrics.washtrade_assets?.value || '0'),
          risk_score: metrics.washtrade_suspect_sales?.value || 0,
          summary: 'Based on 7-day aggregated data'
        };
      }
      
      // Return default values if no wash trading data found
      return {
        wash_trading_volume: 0,
        total_volume: 0,
        wash_trading_percentage: 0,
        wash_trading_sales: 0,
        total_sales: 0,
        wash_trading_wallets: 0,
        wash_trading_assets: 0,
        risk_score: 0,
        message: 'No recent wash trading activity detected'
      };
    } catch (error: any) {
      console.error('Error fetching wash trading data:', error.response?.data || error.message);
      return null;
    }
  }

  async getTrendingCollections(limit: number = 10): Promise<CollectionData[]> {
    try {
      // Use V1 collections endpoint with analytics data
      const metricsParams = 'marketcap,volume,sales,holders';
      const encodedMetrics = encodeURIComponent(metricsParams);
      
      // Use blockchain ID 1 for Ethereum (API expects integer, not string)
      const response = await this.client.get(`/collections?blockchain=1&metrics=${encodedMetrics}&sort_by=volume&sort_order=desc&time_range=24h&offset=0&limit=${limit}`);

      const collections = response.data.collections || [];
      return collections.map((collection: any) => {
        const metadata = collection.metadata || {};
        const metrics = collection.metric_values || {};
        
        // Helper function to extract numeric value from metric object
        const getValue = (metric: any): number => {
          if (!metric) return 0;
          const value = parseFloat(metric.value || '0');
          return isNaN(value) ? 0 : value;
        };

        return {
          contract_address: metadata.contract_address || '',
          name: metadata.name || 'Unknown Collection',
          owner_count: getValue(metrics.holders) || 0,
          nft_count: metadata.nft_count || 0,
          volume_24h: getValue(metrics.volume) || 0,
          floor_price: getValue(metrics.floor_price) || 0,
          average_price_24h: getValue(metrics.price_avg) || 0,
          sales_24h: getValue(metrics.sales) || 0,
          volume_change_24h: getValue(metrics.volume_change) || 0,
          floor_price_change_24h: getValue(metrics.floor_price_change) || 0,
          average_price_change_24h: getValue(metrics.price_avg_change) || 0,
          sales_change_24h: getValue(metrics.sales_change) || 0,
          market_cap: getValue(metrics.marketcap) || 0,
          fully_diluted_market_cap: getValue(metrics.marketcap) || 0
        };
      });
    } catch (error: any) {
      console.error('Error fetching trending collections:', error.response?.data || error.message);
      return [];
    }
  }
}