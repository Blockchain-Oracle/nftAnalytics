# 🚀 NFT Analytics Platform

An AI-powered NFT trading analytics platform built for the **bitsCrunch x AI Builders Hack 2025**.

This project combines AI/LLM capabilities with Web3 market data to create an intelligent NFT analytics and trading assistant, featuring both a powerful MCP backend server and a modern Next.js frontend interface.

## 🏆 Hackathon Context

Built for the **bitsCrunch x AI Builders Hack 2025**, this project targets multiple hackathon tracks:
- **Chatbots & Copilots**: AI-powered chat interface for NFT market queries
- **LLM Tools**: Real-time NFT analytics using OpenAI integration
- **NFT Analytics Dashboards**: Visual interface for NFT trading insights

## 🎯 Features

### Backend (MCP Server)
- **Collection Analysis**: Comprehensive safety scores and risk assessment for NFT collections
- **Wash Trading Detection**: Advanced algorithms to identify artificial trading volume
- **Market Trends**: Real-time market sentiment and trending collections
- **Wallet Risk Analysis**: Evaluate wallet behavior and trading patterns
- **Investment Advice**: AI-powered recommendations based on risk tolerance and budget

### Frontend (Next.js App)
- **AI-Powered Chat Interface**: Interactive chat for NFT trading queries and analysis
- **Voice Recognition**: Speech-to-text capabilities for hands-free interaction
- **Dark Theme UI**: Modern, sleek interface optimized for trading
- **Notification System**: Market alerts and trading opportunities (Coming Soon)
- **Responsive Design**: Works seamlessly across desktop and mobile devices

### Coming Soon
- **Monetization System**: Premium features and subscription tiers
- **Advanced Notifications**: Real-time alerts for market movements
- **bitsCrunch API Integration**: Full integration with bitsCrunch's NFT analytics APIs

## 🛠️ Tech Stack

- **Backend**: FastMCP server with TypeScript
- **Frontend**: Next.js 15.2.4 with App Router
- **UI Library**: React 19
- **AI Integration**: OpenAI GPT-4 (integrated in both MCP server and frontend)
- **Web3 Data**: 
  - UnleashNFTs API for real-time blockchain data
  - bitsCrunch APIs (planned integration)
- **Speech Recognition**: react-speech-recognition
- **Styling**: Tailwind CSS with shadcn/ui and Radix UI primitives
- **Package Manager**: pnpm

## 📋 Prerequisites

- Node.js 18+ and pnpm
- UnleashNFTs API key (get from [unleashnfts.com](https://unleashnfts.com))
- OpenAI API key (for AI chat functionality)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/Blockchain-Oracle/nftAnalytics.git
cd crunch

# Install backend dependencies
pnpm install

# Install frontend dependencies
cd nftAnalytics
pnpm install
cd ..
```

### 2. Configure Environment Variables

**Backend (.env)**:
```bash
cp .env.example .env
# Edit .env and add your API keys
UNLEASH_NFTS_API_KEY=your_unleashnfts_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

**Frontend (nftAnalytics/.env.local)**:
```bash
cd nftAnalytics
cp .env.example .env.local
# Edit .env.local and add your API keys
NEXT_PUBLIC_UNLEASHNFTS_API_KEY=your_unleashnfts_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Start the Services

**Terminal 1 - Start FastMCP Server**:
```bash
# From the root directory
pnpm dev
# Server will start on http://localhost:3001/mcp
```

**Terminal 2 - Start Frontend**:
```bash
cd nftAnalytics
pnpm dev
# Frontend will start on http://localhost:3000
```

### 4. Access the Application

- Open http://localhost:3000 in your browser
- Try the chat interface with questions like:
  - "Analyze Bored Ape Yacht Club collection"
  - "Check for wash trading in contract 0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D"
  - "What are the current NFT market trends?"
  - "Analyze wallet risk for 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"

## 🧪 Testing the MCP Server

### Using FastMCP CLI:
```bash
# Interactive testing
pnpm test

# Inspector UI
pnpm inspect
```

### Using Claude Desktop:
Add to your Claude Desktop config:
```json
{
  "mcpServers": {
    "nft-analytics": {
      "command": "npx",
      "args": ["tsx", "/path/to/crunch/src/index.ts", "--stdio"],
      "env": {
        "UNLEASH_NFTS_API_KEY": "your_api_key"
      }
    }
  }
}
```

## 📚 MCP Tools Available

### 1. **chat** 🤖
AI-powered chat interface that orchestrates all other tools.
- **Parameters**: 
  - `message` (required): User's message
  - `context` (optional): Previous conversation history
- **Returns**: AI response with tool results and analysis

### 2. **analyzeCollection**
Analyze an NFT collection for safety and investment potential.
- **Parameters**: 
  - `collection_address` (required): Contract address
  - `blockchain` (optional): "ethereum" or "polygon" (default: ethereum)
- **Returns**: Safety score (0-100), risks, metrics, wash trading data

### 3. **detectWashTrading**
Detect wash trading activities in an NFT collection.
- **Parameters**: 
  - `collection_address` (required): Contract address
  - `blockchain` (optional): "ethereum" or "polygon"
- **Returns**: Wash trading percentage, severity, recommendations

### 4. **getMarketTrends**
Get current NFT market trends and metrics.
- **Parameters**: 
  - `time_range` (optional): "24h", "7d", "30d" (default: 24h)
  - `include_trending` (optional): Include trending collections
- **Returns**: Market metrics, sentiment, trending collections

### 5. **checkWalletRisk**
Analyze a wallet address for risk factors.
- **Parameters**: 
  - `wallet_address` (required): Wallet address to analyze
  - `blockchain` (optional): "ethereum" or "polygon"
- **Returns**: Risk score, risk factors, profile, recommendations

### 6. **getInvestmentAdvice**
Get AI-powered investment advice for NFT collections.
- **Parameters**: 
  - `collection_address` (required): Contract address
  - `investment_amount` (optional): Budget in USD
  - `risk_tolerance` (optional): "low", "medium", "high"
- **Returns**: Recommendations, confidence score, specific advice

## 🏗️ Architecture

```
crunch/
├── src/
│   ├── index.ts           # FastMCP server with integrated AI
│   ├── unleash-client.ts  # UnleashNFTs API client
│   └── tools/            # Individual tool implementations (legacy)
├── nftAnalytics/          # Frontend application
│   ├── app/              # Next.js app directory
│   │   ├── api/          # API routes
│   │   │   └── chat/     # Chat API endpoint
│   │   ├── chat/         # Chat interface page
│   │   ├── about/        # About page
│   │   ├── contact/      # Contact page
│   │   └── notifications/ # Notifications page
│   ├── components/       # React components
│   │   ├── sections/     # Page sections
│   │   ├── ui/           # UI components
│   │   └── kokonutui/    # Custom UI components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions
│   └── public/           # Static assets
└── README.md
```

## 🔧 Troubleshooting

### FastMCP Server Issues:
- Ensure port 3001 is available
- Check UnleashNFTs API key is valid
- Run `pnpm dev` in the root directory

### Frontend Issues:
- Verify OpenAI API key is set
- Check console for specific errors
- Ensure FastMCP server is running

### Common Errors:
- "FastMCP server not available": Start the backend server first
- "401 Unauthorized": Check your API keys
- "Collection not found": Verify contract address format

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔮 Future Enhancements

Planned integrations with bitsCrunch APIs:
- Wallet risk scoring and profiling
- NFT forgery detection
- Wash trading analysis
- Real-time collection valuation
- Whale wallet tracking

## 🏅 Hackathon Submission

This project is submitted for the **bitsCrunch x AI Builders Hack 2025**.
- Track: Chatbots & Copilots / LLM Tools / NFT Analytics Dashboards
- Team: Blockchain Oracle
- #CrunchHack2025

## 🙏 Acknowledgments

- [bitsCrunch](https://bitscrunch.com) for organizing the hackathon
- [UnleashNFTs](https://unleashnfts.com) for providing comprehensive NFT data
- [FastMCP](https://github.com/punkpeye/fastmcp) for the MCP server framework
- [Vercel AI SDK](https://sdk.vercel.ai) for AI integration
- [shadcn/ui](https://ui.shadcn.com) for UI components

---

Built with ❤️ for the NFT community and the bitsCrunch x AI Builders Hack 2025