# 🏭 Meme Coin Factory - Public Interface

A fully decentralized web application for trading themed meme coins with AI-powered content generation. This is the **public-facing interface** that can be hosted on GitHub Pages for any meme coin theme created by the factory system.

**Current Example**: LEGO theme (LegoLovers token) - but easily adaptable to any meme coin theme!

## 🚀 Features

### 🔗 **Wallet Integration**
- **Phantom Wallet Connect**: Seamless connection to your Solana wallet
- **Real-time Balances**: Live USDC and LEGO token balance tracking
- **Transaction History**: Automatic scanning of your blockchain activity

### 💰 **Token Economy**
- **USDC → Theme Token Exchange**: Buy any meme coin at configurable rates
- **Instant Swaps**: One-click token exchanges directly in the browser
- **Balance Monitoring**: Real-time display of your token holdings
- **Example**: $0.10 USDC = 1,000 LEGO tokens (rate configurable per theme)

### 📔 **AI-Powered Content Service**
- **Pay-per-Message**: Send tokens to receive personalized AI-generated content
- **Dual AI System**: 
  - **Google Gemini 1.5 Flash** for intelligent text generation (50 requests/day free)
  - **Local Llama 3.2 1B** as fallback when Gemini quota exceeded
- **Professional Images**: **DALL-E 3** generates 512x512 themed visuals
- **Hybrid Storage**: 
  - **Web3.Storage** for real IPFS (free up to 5TB)
  - **Local backup** for reliability and development
  - **HTTP serving** for web-accessible images
- **Complete Multimedia**: Text + images stored on decentralized web with blockchain hashes

### 📬 **Public Messaging Interface**
- **Message Reader**: View all messages sent to your wallet address
- **IPFS Content Display**: Automatically fetch and display content from IPFS hashes
- **Transaction Verification**: Direct links to Solana Explorer for proof
- **Real-time Updates**: Live scanning of new messages and token transfers

### 🌐 **Decentralized Architecture**
- **No Backend Required**: Reads directly from Solana blockchain + IPFS
- **GitHub Pages Ready**: Can be hosted for free on static hosting
- **Censorship Resistant**: Your content is permanently stored and accessible

## 🌐 Live Demo

**🧱 LEGO Theme Demo**: https://alfonsoaru.github.io/lego-diary-reader

This live demo showcases the complete meme coin interface using the LEGO theme as an example. You can:
- Connect your Phantom wallet
- View LEGO token balances
- Buy LEGO tokens with USDC
- Send tokens for AI-generated diary entries
- Read all your blockchain-stored messages

**Your Deployment**: `https://yourusername.github.io/your-coin-interface`

## 📦 How It Works

### 🛒 **Token Purchase Flow**
1. **Connect Wallet** → Phantom wallet integration
2. **Check Balances** → View your USDC and LEGO token amounts
3. **Swap Tokens** → Exchange USDC for LEGO at fixed rate ($0.10 USDC = 1,000 LEGO)
4. **Instant Transfer** → Tokens appear immediately in your wallet

### 📝 **AI Content Generation Flow**
1. **Pay for Service** → Send 10 LEGO tokens to message service (configurable amount)
2. **Dual AI Processing** → 
   - **Text**: Gemini AI generates personalized themed content
   - **Image**: DALL-E creates beautiful 1024x1024 themed visuals
3. **Local Backup** → Generated images automatically saved to `generated-images/` folder
4. **IPFS Storage** → Complete multimedia content uploaded to IPFS, returns hash (e.g., `QmABC123...`)
5. **Blockchain Recording** → IPFS hash stored on-chain in transaction logs
6. **Automatic Display** → Web app scans blockchain, finds IPFS hashes, fetches and displays full multimedia entries

## 🔧 GitHub Pages Hosting Setup

### 📁 **Meme Coin Factory Structure**
```
meme-coin-factory/                 # Main factory system
├── programs/                      # Solana smart contracts
├── configs/                       # Theme configurations
├── scripts/                       # Deployment scripts
└── lego-diary-reader/            # Public web interface (this folder)
    ├── index.html                # Frontend app
    ├── app.js                    # Web3 logic
    ├── unified-lego-service.js   # Backend API
    └── README.md                 # This file
```

### 🌐 **GitHub Pages Deployment**
1. **Fork/Clone** the meme coin factory repository
2. **Navigate** to the `lego-diary-reader/` folder
3. **Create separate repository** for your themed public interface:
   ```bash
   # Example: pepe-coin-interface, moon-cat-interface, etc.
   git init
   git add .
   git commit -m "Initial themed interface"
   git remote add origin https://github.com/yourusername/your-theme-interface.git
   git push -u origin main
   ```
4. **Enable GitHub Pages** in repository settings → Pages → Source: Deploy from branch `main`
5. **Update token addresses** in `app.js` for your specific meme coin
6. **Deploy backend service** (for AI content generation):
   - Set `GEMINI_API_KEY`, `OPENAI_API_KEY`, and `WEB3_STORAGE_TOKEN` environment variables
   - Install Ollama and download Llama 3.2: `ollama pull llama3.2:1b`
   - Deploy `unified-lego-service.js` to any cloud provider
   - Ensure `generated-images/` and `ipfs-cache/` folders have write permissions
   - Update API endpoints in frontend if needed

### 🎨 **Customize for Your Theme**
- Update token addresses and names in `app.js`
- Modify colors, icons, and branding in `index.html`
- Adapt AI prompts in `unified-lego-service.js` for your theme
- Change content descriptions (e.g., "diary entries" → "meme wisdom")

## 🎯 Usage Guide

### 💳 **Getting Started**
1. **Visit the GitHub Pages URL**
2. **Click "Connect Wallet"** to link your Phantom wallet
3. **View your balances** - USDC and LEGO tokens displayed automatically

### 🛒 **Buying Theme Tokens**
1. **Enter USDC amount** (minimum configurable per theme)
2. **Click token swap button** (e.g., "Swap USDC → LEGO")
3. **Approve transaction** in Phantom wallet
4. **Receive tokens** at the configured exchange rate

### 📖 **Getting AI Content**
1. **Click content request button** (e.g., "Send 10 LEGO for Diary Entry")
2. **Approve the token payment** (amount configurable per theme)
3. **Wait for AI generation** (30-60 seconds for both text and image)
4. **View your multimedia content** automatically loaded from blockchain + IPFS:
   - **Rich text content** with themed storytelling
   - **High-quality images** (1024x1024) related to your theme
   - **Timestamp information** showing exact generation time
   - **IPFS links** for permanent decentralized storage

## 🔍 Technical Details

### 🎨 **Frontend Stack**
- **Languages**: Vanilla JavaScript + HTML5 + CSS3
- **Blockchain**: Solana Web3.js library
- **Wallet**: Phantom wallet integration
- **UI**: Responsive gradient design with LEGO theme
- **Hosting**: GitHub Pages compatible (static files)

### ⚙️ **Backend Services**
- **API Server**: Node.js + Express.js with CORS and image serving
- **Triple AI Engine**: 
  - **Google Gemini 1.5 Flash** for intelligent text generation (primary)
  - **Local Llama 3.2 1B** via Ollama for offline text generation (fallback)
  - **OpenAI DALL-E 3** for 512x512 professional images
- **Hybrid Storage System**: 
  - **Web3.Storage** for real IPFS (free up to 5TB)
  - **Local filesystem** backup (`generated-images/` + `ipfs-cache/` folders)
  - **HTTP image serving** at `/images/` endpoint for web access
- **Blockchain Integration**: SPL Token transfers via Solana Web3.js
- **Real-time Monitoring**: Live transaction detection with duplicate prevention

### 🌐 **Infrastructure**
- **Blockchain**: Solana Devnet (upgradeable to Mainnet)
- **RPC Endpoint**: `https://api.devnet.solana.com`
- **Content Delivery**: IPFS public gateways
- **Deployment**: Static frontend + separate backend service

## 📍 Key Addresses & Tokens

### 🏦 **Example Token Contracts (LEGO Theme)**
- **LEGO Token**: `6Pc8qwhy99qZca23RqY92DbcLQxweUwxWPEKpb9psbAi`
- **USDC (Devnet)**: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

### 💼 **Example Service Wallets (LEGO Theme)**
- **USDC Exchange**: `AjQDtGGvisRMLhcPkF6Kk8vsA8dixio7aTtYRNPcc15d`
- **Message Service**: `4rBjRyfSNWGbbCNcTzEyrJUNxUj5im1dGCgKMta93R3j`

> **Note**: Each meme coin theme will have different token addresses and service wallets. Update these in `app.js` when deploying for your specific theme.

### 🔗 **Network Endpoints**
- **Solana RPC**: `https://api.devnet.solana.com`
- **Token Explorer**: `https://explorer.solana.com/address/[TOKEN_ADDRESS]?cluster=devnet`

## 🛠️ Development & Architecture

### 🔄 **Automatic Processes**
- **Transaction Scanning**: Monitors last 100 transactions from connected wallet
- **Token Transfer Detection**: Identifies LEGO token payments to message service
- **IPFS Hash Extraction**: Pulls content hashes from blockchain transaction logs
- **Content Retrieval**: Automatically fetches diary entries from IPFS
- **Real-time Updates**: Displays new entries in chronological order

### 🧩 **Smart Contract Integration**
- **SPL Token Standard**: Uses standard Solana token operations
- **Transaction Parsing**: Extracts memo data and instruction logs
- **Balance Monitoring**: Real-time token balance updates
- **Event Listening**: Subscribes to wallet activity for instant updates

## 📬 Public Messaging Interface

### Web-Based Message Reader

The Meme Coin Factory includes a deployable web interface that allows token holders to connect their wallets and read messages sent to them via the on-chain messaging system.

#### Features
- **Wallet Integration**: Connect any Solana wallet (Phantom, Solflare, etc.)
- **Message History**: View all messages sent to your wallet address
- **IPFS Content**: Automatically fetch and display content from IPFS hashes
- **Transaction Links**: Direct links to Solana Explorer for verification
- **Token Actions**: Send tokens to trigger new messages
- **Real-time Balances**: Live token balance updates

#### Deployment Options

**GitHub Pages (Recommended)**:
```bash
# Copy messaging interface to your repo
cp -r lego-diary-reader/* your-coin-repo/
git add .
git commit -m "Add messaging interface"
git push origin main

# Enable GitHub Pages in repo settings
# Interface will be available at: username.github.io/repo-name
```

**Custom Domain**:
```bash
# Add CNAME file for custom domain
echo "your-domain.com" > CNAME
git add CNAME
git commit -m "Add custom domain"
git push
```

#### Interface Customization
- **Token Addresses**: Update `app.js` with your specific token contract addresses
- **Branding**: Modify colors, logos, and theme in `index.html`
- **Content Types**: Adapt messaging prompts for your meme coin theme
- **Exchange Rates**: Configure USDC → token swap rates
- **Service Costs**: Set token amounts required for AI content generation

### 🔧 **Local Development**
```bash
# Frontend (static files)
python -m http.server 8000
# or
npx serve .

# Backend API (for AI content generation)
export GEMINI_API_KEY="your_gemini_key_here"
export OPENAI_API_KEY="your_openai_key_here"
export WEB3_STORAGE_TOKEN="your_web3storage_token_here"  # Optional - uses local fallback if not set
ollama serve &  # Start Ollama in background
node unified-lego-service.js
```

### 🌐 **Setting Up Real IPFS (Optional)**

**Get Web3.Storage Free API Key (5TB free):**
1. Visit https://web3.storage
2. Sign up (no credit card required)
3. Create API token in dashboard
4. Add to your environment:
```bash
export WEB3_STORAGE_TOKEN="eyJ..."
```

**Alternative Free IPFS Options:**
- **Pinata**: https://pinata.cloud (1GB free)
- **NFT.Storage**: https://nft.storage (100% free)
- **Local IPFS Node**: https://ipfs.tech (completely free)

**Note**: If no Web3.Storage token is provided, the system automatically falls back to local storage with simulated IPFS hashes for development.

### 🧪 **Testing the AI Service**
```bash
# Install and setup Ollama
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama3.2:1b

# Start the service with all API keys
export GEMINI_API_KEY="your_gemini_key_here"
export OPENAI_API_KEY="your_openai_key_here"
export WEB3_STORAGE_TOKEN="your_web3storage_token_here"  # Optional
ollama serve &
node unified-lego-service.js

# Test multimedia AI generation
curl -X POST http://localhost:3000/generate-diary \
  -H "Content-Type: application/json" \
  -d '{"signature":"test123", "wallet":"ExampleWallet123"}'

# View all generated entries
curl http://localhost:3000/diary

# Check generated content
ls -la generated-images/  # DALL-E images (512x512 PNG)
ls -la ipfs-cache/        # Complete multimedia entries (JSON)

# Test image serving
curl http://localhost:3000/images/[filename].png

# Test IPFS cache access
curl http://localhost:3000/ipfs/[hash]
```

## ✨ **Key Features Summary**

🏭 **Meme Coin Factory**: Template system for any themed meme coin  
🎯 **Complete Token Economy**: Buy theme tokens with USDC, pay for AI services  
🤖 **Advanced AI Pipeline**: OpenAI GPT-4o-mini + DALL-E 3 + Ollama Llama 3.2 fallback  
🎨 **Custom Content Matching**: AI generates images that relate to specific diary text  
🗜️ **Optimized IPFS Storage**: Images automatically compressed to <30KB for fast loading  
💾 **Multi-Layer Storage**: Real IPFS (Pinata) + local backup + HTTP serving  
🔗 **Decentralized Content**: Permanent, censorship-resistant multimedia on blockchain  
💼 **Phantom Integration**: Seamless wallet connection and transaction signing  
🌐 **GitHub Pages Ready**: Static hosting for any meme coin theme  
📱 **Mobile Responsive**: Works perfectly on all devices with image display  
⚙️ **Configurable**: Easy customization for different themes and token economics  
🔄 **Graceful Fallbacks**: Works offline with local LLM when APIs unavailable  
🆓 **Free Tier Friendly**: Multiple free AI services with smart quota management

## 🎉 Result

A **reusable public interface template** for the Meme Coin Factory system! Deploy this `lego-diary-reader/` folder to GitHub Pages for any meme coin theme - just update the token addresses, branding, and AI prompts to match your specific meme coin.

### 🔄 **Deployment Flow**
1. **Main Factory** → Create new themed meme coin
2. **Copy This Folder** → Customize for your theme  
3. **Deploy to GitHub Pages** → Public interface live
4. **Users Can** → Buy tokens, get AI content, all decentralized!

---

## 🚧 **Current Development Status** (Last Updated: June 28, 2025)

### ✅ **What's Working**
- **Complete AI Pipeline**: OpenAI GPT-4o-mini generates custom diary text
- **Smart Image Generation**: DALL-E 3 creates images that match diary content
- **Image Optimization**: Sharp library compresses images from ~2MB to <30KB
- **Local Storage**: Generated content saved locally with HTTP serving
- **Blockchain Integration**: Solana wallet connection and transaction monitoring
- **Custom Prompts**: AI creates content-specific image prompts (e.g., castle diary → castle image)
- **Fallback Systems**: Ollama local LLM when API quotas exceeded

### 🔧 **Currently Debugging**
- **IPFS Upload Issues**: Pinata API credentials have authentication but missing upload scopes
  - Credentials authenticate successfully ✅
  - File uploads fail with "NO_SCOPES_FOUND" error ❌
  - Need to configure proper API permissions in Pinata dashboard

### 🎯 **What's Next**
1. **Fix Pinata IPFS**: Resolve API scope issues to enable real decentralized storage
2. **Test Complete Pipeline**: End-to-end from payment → AI generation → IPFS storage → web display
3. **Scale Testing**: Move from 10 LEGO test tokens to production amounts
4. **Production Deployment**: Remove test limitations and deploy to mainnet

### 📁 **Key Files Modified**
- `unified-lego-service.js` - Main backend with OpenAI integration and image optimization
- `gemini-lego-service.js` - DALL-E integration with custom prompts and Sharp optimization
- `ipfs-storage.js` - Pinata integration (needs scope configuration)
- `lego-diary-reader/app.js` - Frontend limited to 3 transactions for debugging
- `lego-diary-reader/index.html` - Version v3.6 with cache busting

### 🔑 **Environment Variables Required**
```bash
export OPENAI_API_KEY="sk-proj-..." # Working ✅
export PINATA_API_KEY="6355cc4a..." # Auth OK, scopes needed ⚠️
export PINATA_API_SECRET="092c7fc7..." # Auth OK, scopes needed ⚠️
export GEMINI_API_KEY="AIzaSy..." # Quota exceeded, fallback working ✅
```

### 🎯 **IPFS Hash Architecture**

The system generates two different IPFS hashes during content creation:

1. **Image Hash**: `bafkreid2bvl6edeonvqcwtxcoppiups3zktxcaqctmjpiiuknccklfu3zq`
   - This is the IPFS hash of just the image file itself
   - Generated when the image is uploaded to IPFS
   - Used for the actual image filename: `{image-hash}.png`

2. **Diary Entry Hash**: `bafkreidntkgqn4zai23keekrxayalwxjmzsm66fqyg6oeelvebgiiqi6y4`
   - This is the IPFS hash of the entire diary entry (text + metadata + image reference)
   - Generated when the complete diary entry JSON is uploaded to IPFS
   - Contains the reference to the image hash within the diary content

**Important**: The image filename should always use the **image hash**, not the diary entry hash. The diary entry references the image hash internally, but the actual image file is stored and accessed using its own unique IPFS hash.

### 🧪 **Test Commands**
```bash
# Test Pinata IPFS (debug scopes)
node test-pinata.js

# Run main service with environment variables
PINATA_API_KEY="..." PINATA_API_SECRET="..." node unified-lego-service.js

# Test 10 LEGO payment in web interface
# 1. Connect wallet
# 2. Send 10 LEGO tokens
# 3. Check service logs for AI generation and IPFS upload status
```

### 💡 **Next Session Priorities**
1. **Resolve Pinata API scopes** - Need "pinFileToIPFS" permission enabled
2. **Test successful IPFS upload** with working credentials
3. **Verify images display** from real IPFS URLs in web interface
4. **Performance testing** with multiple transactions
5. **Production readiness** assessment