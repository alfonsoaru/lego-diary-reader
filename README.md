# 🧱 LEGO Diary Reader

A fully decentralized web application that reads LEGO diary entries directly from the Solana blockchain and IPFS.

## 🚀 Features

- **Wallet Connect**: Connect your Phantom wallet
- **Blockchain Reading**: Scans your transaction history for LEGO token payments
- **IPFS Integration**: Fetches diary content from IPFS using hashes stored on-chain
- **Beautiful UI**: Clean, responsive design for reading your diary entries
- **Fully Decentralized**: No backend servers, reads directly from blockchain + IPFS

## 🌐 Live Demo

This can be hosted on GitHub Pages for free at:
`https://yourusername.github.io/lego-diary-reader`

## 📦 How It Works

1. **Customer sends LEGO tokens** to message service address
2. **Service generates diary entry** with AI (Gemini)
3. **Diary stored on IPFS** → returns hash (e.g., `QmABC123...`)
4. **IPFS hash stored on blockchain** in transaction memo/logs
5. **Web app reads blockchain** → finds IPFS hashes
6. **Fetches from IPFS** → displays diary entries

## 🔧 Setup for GitHub Pages

1. **Create new repository** on GitHub
2. **Upload these files**:
   - `index.html`
   - `app.js` 
   - `README.md`
3. **Enable GitHub Pages** in repository settings
4. **Visit your live site**!

## 🎯 Usage

1. Visit the GitHub Pages URL
2. Click "Connect Wallet" 
3. Authorize with Phantom wallet
4. View all your LEGO diary entries!

## 🔍 Technical Details

- **Frontend**: Vanilla JavaScript + Solana Web3.js
- **Blockchain**: Solana Devnet
- **Storage**: IPFS for diary content
- **Wallet**: Phantom wallet integration
- **Hosting**: GitHub Pages (free, static)

## 📍 Key Addresses

- **Message Service**: `4rBjRyfSNWGbbCNcTzEyrJUNxUj5im1dGCgKMta93R3j`
- **LEGO Token**: `6Pc8qwhy99qZca23RqY92DbcLQxweUwxWPEKpb9psbAi`
- **Solana RPC**: `https://api.devnet.solana.com`

## 🛠️ Development

The app automatically:
- Scans last 100 transactions from connected wallet
- Looks for LEGO token transfers to message service
- Extracts IPFS hashes from transaction logs
- Fetches diary content from IPFS
- Displays in chronological order

## 🎉 Result

A beautiful, decentralized diary reader that works entirely client-side!