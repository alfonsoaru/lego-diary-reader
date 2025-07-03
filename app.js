// LEGO Diary Reader v11.0 - SIMPLIFIED: Blockchain + GitHub Only
console.log('🧱 LEGO Diary Reader v11.0 - Blockchain + GitHub Only');

// Global variables
let wallet = null;
let connection = null;

// Initialize Solana connection
const SOLANA_RPC = 'https://api.devnet.solana.com';
connection = new solanaWeb3.Connection(SOLANA_RPC, 'confirmed');

// Token addresses - using CONFIG from config.js
const USDC_MINT = CONFIG.TOKENS.USDC_MINT;
const LEGO_MINT = CONFIG.TOKENS.LEGO_MINT;
const USDC_EXCHANGE_ACCOUNT = CONFIG.TOKENS.USDC_EXCHANGE_ACCOUNT;
const MESSAGE_SERVICE_ACCOUNT = CONFIG.TOKENS.MESSAGE_SERVICE_ACCOUNT;

// DOM elements
const connectBtn = document.getElementById('connectBtn');
const status = document.getElementById('status');
const diaryEntries = document.getElementById('diaryEntries');
const tokenActions = document.getElementById('tokenActions');
const swapBtn = document.getElementById('swapBtn');
const sendLegoBtn = document.getElementById('sendLegoBtn');
const usdcAmountInput = document.getElementById('usdcAmount');
const usdcBalanceSpan = document.getElementById('usdcBalance');
const legoBalanceSpan = document.getElementById('legoBalance');

// Event listeners
connectBtn.addEventListener('click', connectWallet);
swapBtn.addEventListener('click', swapUSDCToLEGO);
sendLegoBtn.addEventListener('click', sendLegoForDiary);

async function connectWallet() {
    try {
        showStatus('Connecting to wallet...', 'loading');
        connectBtn.disabled = true;
        
        if (!window.solana) {
            throw new Error('Solana wallet not found! Please install Phantom wallet extension and refresh the page.');
        }
        
        const response = await window.solana.connect({ onlyIfTrusted: false });
        
        if (!response.publicKey) {
            throw new Error('No public key returned from wallet');
        }
        
        wallet = response.publicKey;
        console.log('Connected wallet:', wallet.toString());
        
        showStatus(`Connected: ${wallet.toString().substring(0, 8)}...${wallet.toString().slice(-8)}`, 'connected');
        connectBtn.textContent = 'Connected ✓';
        
        tokenActions.style.display = 'block';
        updateUIWithConfig();
        
        await loadBalances();
        await loadDiaryEntries();
        
    } catch (error) {
        console.error('Wallet connection failed:', error);
        showError('Failed to connect wallet: ' + error.message);
        connectBtn.disabled = false;
        connectBtn.textContent = 'Connect Wallet';
    }
}

async function loadDiaryEntries() {
    try {
        showStatus('Reading your diary entries from the blockchain...', 'loading');
        diaryEntries.innerHTML = '<div class="loading">🔍 Scanning blockchain for your LEGO diary entries...</div>';
        
        // Get recent transactions for this wallet (reduced to avoid rate limits)
        const signatures = await connection.getSignaturesForAddress(wallet, { limit: 10 });
        console.log(`Found ${signatures.length} transactions`);
        
        const entries = [];
        
        // Process transactions to find diary entries (with rate limiting)
        for (let i = 0; i < signatures.length; i++) {
            const signatureInfo = signatures[i];
            
            // Add delay between requests to avoid rate limiting
            if (i > 0 && i % 3 === 0) {
                console.log('⏱️ Pausing to avoid rate limits...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            try {
                const transaction = await connection.getTransaction(signatureInfo.signature, {
                    commitment: 'confirmed',
                    maxSupportedTransactionVersion: 0
                });
                
                if (!transaction) continue;
                
                // Look for memos with IPFS hashes
                const instructions = transaction.transaction.message.instructions;
                
                for (const instruction of instructions) {
                    if (instruction.data) {
                        try {
                            const decoded = Buffer.from(instruction.data, 'base64').toString('utf-8');
                            
                            // Look for diary entry patterns in memos
                            if (decoded.includes('📔 IPFS:') || decoded.includes('LEGO→')) {
                                const entry = await createSimpleDiaryEntry(transaction, signatureInfo, decoded);
                                if (entry) {
                                    entries.push(entry);
                                }
                            }
                        } catch (e) {
                            // Skip invalid instruction data
                        }
                    }
                }
                
            } catch (error) {
                console.log('Error processing transaction:', error.message);
                
                // If we hit rate limits, wait longer and continue
                if (error.message.includes('429') || error.message.includes('Too many requests')) {
                    console.log('⏱️ Rate limited, waiting 2 seconds...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
        
        // Remove duplicates and sort by timestamp
        const uniqueEntries = entries.filter((entry, index, self) => 
            index === self.findIndex(e => e.signature === entry.signature)
        );
        uniqueEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        displayDiaryEntries(uniqueEntries);
        
    } catch (error) {
        console.error('Error loading diary entries:', error);
        showError('Failed to load diary entries: ' + error.message);
    }
}

async function createSimpleDiaryEntry(transaction, signatureInfo, memoContent) {
    const timestamp = signatureInfo.blockTime * 1000;
    const date = new Date(timestamp);
    const signature = signatureInfo.signature;
    
    console.log('📝 Creating simple diary entry from blockchain data only');
    
    // Extract IPFS hash from memo content
    const ipfsMatch = memoContent.match(/📔 IPFS: (bafkrei[a-z2-7]{52}|Qm[1-9A-HJ-NP-Za-km-z]{44})/);
    const diaryIpfsHash = ipfsMatch ? ipfsMatch[1] : null;
    
    if (!diaryIpfsHash) {
        return null; // Skip entries without IPFS hash
    }
    
    // Create basic entry structure
    const entry = {
        signature: signature,
        content: `📔 Diary entry stored on IPFS: ${diaryIpfsHash}`,
        image: null,
        timestamp: date.toISOString(),
        date: date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        }),
        time: date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: true 
        }),
        wallet: 'LEGO Lover',
        ipfsHash: diaryIpfsHash
    };
    
    // Try to fetch diary JSON from GitHub to get image information
    try {
        const diaryJsonUrl = `https://alfonsoaru.github.io/lego-diary-reader/public/diary/${diaryIpfsHash}.json`;
        const response = await fetch(diaryJsonUrl);
        
        if (response.ok) {
            const diaryData = await response.json();
            console.log('📖 Found diary JSON on GitHub:', diaryData);
            
            // Update entry with full diary content
            if (diaryData.content) {
                entry.content = diaryData.content;
            }
            
            // Set image data from diary JSON
            if (diaryData.image && diaryData.image.ipfsHash) {
                const imageUrl = `${CONFIG.GITHUB_PAGES_BASE_URL}${diaryData.image.ipfsHash}.png`;
                entry.image = {
                    githubPagesUrl: imageUrl,
                    ipfsHash: diaryData.image.ipfsHash,
                    type: 'github-pages-from-diary'
                };
                console.log('🖼️ Using image from diary JSON:', imageUrl);
            }
        } else {
            console.log('📄 No diary JSON found on GitHub, using basic entry');
        }
    } catch (error) {
        console.log('⚠️ Failed to fetch diary JSON:', error.message);
    }
    
    return entry;
}

function displayDiaryEntries(entries) {
    if (!entries || entries.length === 0) {
        diaryEntries.innerHTML = `
            <div class="no-entries">
                <h3>📔 No diary entries found yet</h3>
                <p>Send <strong>${CONFIG.TOKENS_PER_MESSAGE} LEGO tokens</strong> to the message service to create your first AI-generated diary entry!</p>
                <p>Service Address: <code>${MESSAGE_SERVICE_ACCOUNT}</code></p>
            </div>
        `;
        return;
    }
    
    let html = `<h2>📖 Your LEGO Diary Entries (${entries.length})</h2>`;
    
    entries.forEach((entry, index) => {
        // Determine image URL
        let imageUrl = null;
        let imageSource = 'none';
        
        if (entry.image && entry.image.githubPagesUrl) {
            imageUrl = entry.image.githubPagesUrl;
            imageSource = 'GitHub Pages';
        }
        
        html += `
            <div class="diary-entry">
                <div class="diary-date">📅 ${entry.date} ${entry.time ? `🕐 ${entry.time}` : ''}</div>
                <div class="diary-signature">🔗 Signature: ${entry.signature.substring(0, 16)}...</div>
                <div class="diary-ipfs">📦 IPFS: ${entry.ipfsHash}</div>
                
                ${imageUrl ? `
                    <div class="diary-image">
                        <div class="image-info">🖼️ Image Source: ${imageSource}</div>
                        <img src="${imageUrl}" 
                             alt="LEGO Diary Image" 
                             style="max-width: 300px; border-radius: 8px; margin: 10px 0;"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                        <div style="display: none; padding: 20px; background: #f0f0f0; border-radius: 8px; margin: 10px 0;">
                            <p>🖼️ Image not yet available on GitHub Pages</p>
                            <p>URL: <a href="${imageUrl}" target="_blank">${imageUrl}</a></p>
                        </div>
                    </div>
                ` : '<div class="no-image">🖼️ No image available</div>'}
                
                <div class="diary-content">
                    <p><strong>Content:</strong> ${entry.content}</p>
                </div>
                
                <div class="diary-meta">
                    <small>👤 ${entry.wallet} | 🕐 ${entry.timestamp}</small>
                </div>
            </div>
        `;
    });
    
    diaryEntries.innerHTML = html;
    showStatus(`Loaded ${entries.length} diary entries from blockchain`, 'success');
}

// Rest of the functions (loadBalances, swapUSDCToLEGO, etc.) remain the same...
// [Include all the other functions from the original app.js]

async function loadBalances() {
    try {
        const usdcBalance = await getTokenBalance(wallet, USDC_MINT);
        const legoBalance = await getTokenBalance(wallet, LEGO_MINT);
        
        usdcBalanceSpan.textContent = (usdcBalance / Math.pow(10, 6)).toFixed(2);
        legoBalanceSpan.textContent = (legoBalance / Math.pow(10, 6)).toLocaleString();
        
    } catch (error) {
        console.error('Error loading balances:', error);
        usdcBalanceSpan.textContent = '0.00';
        legoBalanceSpan.textContent = '0';
    }
}

async function getTokenBalance(publicKey, mintAddress) {
    try {
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
            mint: new solanaWeb3.PublicKey(mintAddress)
        });
        
        if (tokenAccounts.value.length > 0) {
            return tokenAccounts.value[0].account.data.parsed.info.tokenAmount.amount;
        }
        return 0;
    } catch (error) {
        console.error('Error getting token balance:', error);
        return 0;
    }
}

function showStatus(message, type = 'info') {
    status.textContent = message;
    status.className = `status ${type}`;
}

function showError(message) {
    showStatus(message, 'error');
}

function updateUIWithConfig() {
    // Update UI elements if they exist (graceful handling for simplified UI)
    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };
    
    updateElement('tokensPerMessage', CONFIG.TOKENS_PER_MESSAGE.toLocaleString());
    updateElement('tokensPerUsdc', CONFIG.TOKENS_PER_USDC.toLocaleString());
    updateElement('minUsdc', CONFIG.MIN_USDC.toFixed(2));
    updateElement('usdcExchangeAccount', USDC_EXCHANGE_ACCOUNT);
    updateElement('messageServiceAccount', MESSAGE_SERVICE_ACCOUNT);
}

async function swapUSDCToLEGO() {
    try {
        const usdcAmount = parseFloat(usdcAmountInput.value);
        
        if (!usdcAmount || usdcAmount < CONFIG.MIN_USDC) {
            throw new Error(`Minimum USDC amount is ${CONFIG.MIN_USDC}`);
        }
        
        showStatus('Swapping USDC for LEGO tokens...', 'loading');
        swapBtn.disabled = true;
        
        // This would implement the actual token swap logic
        // For now, just show a message
        showStatus('USDC to LEGO swap functionality would be implemented here', 'info');
        
    } catch (error) {
        console.error('Swap failed:', error);
        showError('Swap failed: ' + error.message);
    } finally {
        swapBtn.disabled = false;
    }
}

async function sendLegoForDiary() {
    try {
        showStatus('Sending LEGO tokens for diary entry...', 'loading');
        sendLegoBtn.disabled = true;
        
        const legoAmount = CONFIG.TOKENS_PER_MESSAGE;
        
        // Create transaction to send LEGO tokens to message service
        const transaction = new solanaWeb3.Transaction();
        
        // Get or create associated token accounts
        const senderTokenAccount = await splToken.getAssociatedTokenAddress(
            new solanaWeb3.PublicKey(LEGO_MINT),
            wallet
        );
        
        const receiverTokenAccount = await splToken.getAssociatedTokenAddress(
            new solanaWeb3.PublicKey(LEGO_MINT),
            new solanaWeb3.PublicKey(MESSAGE_SERVICE_ACCOUNT)
        );
        
        // Add transfer instruction
        const transferInstruction = splToken.createTransferInstruction(
            senderTokenAccount,
            receiverTokenAccount,
            wallet,
            legoAmount * Math.pow(10, 6) // Convert to token decimals
        );
        
        transaction.add(transferInstruction);
        
        // Add memo with timestamp for tracking
        const memo = `LEGO Payment for Diary - ${new Date().toISOString()}`;
        const memoInstruction = new solanaWeb3.TransactionInstruction({
            keys: [],
            programId: new solanaWeb3.PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
            data: Buffer.from(memo, 'utf-8')
        });
        
        transaction.add(memoInstruction);
        
        // Sign and send transaction
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet;
        
        const signedTransaction = await window.solana.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signedTransaction.serialize());
        
        // Wait for confirmation
        await connection.confirmTransaction(signature);
        
        showStatus(`✅ Sent ${legoAmount.toLocaleString()} LEGO tokens! Diary entry will be generated shortly.`, 'success');
        
        // Refresh balances
        await loadBalances();
        
        // Refresh diary entries after a delay to allow processing
        setTimeout(async () => {
            await loadDiaryEntries();
        }, 5000);
        
    } catch (error) {
        console.error('Send LEGO failed:', error);
        showError('Failed to send LEGO tokens: ' + error.message);
    } finally {
        sendLegoBtn.disabled = false;
    }
}