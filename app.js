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
        showStatus('Reading your diary entries from GitHub...', 'loading');
        diaryEntries.innerHTML = '<div class="loading">📖 Loading your LEGO diary entries from GitHub...</div>';
        
        // Try to get list of diary JSON files from GitHub
        const entries = await loadDiariesFromGitHub();
        
        if (entries.length === 0) {
            // Fallback: scan blockchain for entries (but much more limited)
            console.log('📡 No entries found on GitHub, checking recent blockchain activity...');
            await loadDiariesFromBlockchain();
        } else {
            displayDiaryEntries(entries);
        }
        
    } catch (error) {
        console.error('Error loading diary entries:', error);
        showError('Failed to load diary entries: ' + error.message);
    }
}

async function loadDiariesFromGitHub() {
    const entries = [];
    
    try {
        console.log('🗂️ Looking for diary JSON files on GitHub...');
        
        // Try to fetch the directory index page and parse it for .json files
        const baseUrl = 'https://alfonsoaru.github.io/lego-diary-reader/public/diary/';
        
        // Since we can't directly list GitHub Pages directories, we'll try a different approach:
        // Look for recent diary entries by trying common IPFS hash patterns
        const recentHashes = await tryCommonDiaryHashes();
        
        for (const hash of recentHashes) {
            try {
                const diaryJsonUrl = `${baseUrl}${hash}.json`;
                console.log(`📋 Trying to fetch: ${hash}.json`);
                
                const response = await fetch(diaryJsonUrl);
                if (response.ok) {
                    const diaryData = await response.json();
                    console.log(`✅ Found diary entry: ${hash}`);
                    
                    // Create entry from GitHub data
                    const entry = {
                        signature: `github-${hash}`,
                        content: diaryData.content || 'Diary entry content',
                        timestamp: diaryData.timestamp || new Date().toISOString(),
                        date: diaryData.date || new Date().toLocaleDateString(),
                        time: diaryData.time || new Date().toLocaleTimeString(),
                        wallet: diaryData.shortAddress || 'LEGO Lover',
                        ipfsHash: hash,
                        source: 'github-direct'
                    };
                    
                    // Add image if available
                    if (diaryData.image && diaryData.image.ipfsHash) {
                        const imageUrl = `https://alfonsoaru.github.io/lego-diary-reader/public/images/${diaryData.image.ipfsHash}.png`;
                        entry.image = {
                            githubPagesUrl: imageUrl,
                            ipfsHash: diaryData.image.ipfsHash,
                            type: 'github-pages-direct'
                        };
                    }
                    
                    entries.push(entry);
                }
            } catch (error) {
                // Skip failed attempts silently
                console.log(`⚪ ${hash}.json not found`);
            }
        }
        
        // Sort by timestamp (newest first)
        entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        console.log(`📖 Found ${entries.length} diary entries directly from GitHub`);
        return entries;
        
    } catch (error) {
        console.log('⚠️ GitHub directory scan failed:', error.message);
        return entries;
    }
}

async function tryCommonDiaryHashes() {
    // Try to discover diary hashes by checking recent blockchain activity first
    // This gives us a seed list of potential diary CIDs to look for on GitHub
    const potentialHashes = [];
    
    try {
        if (wallet && connection) {
            console.log('🔍 Getting recent transaction signatures for hash discovery...');
            const signatures = await connection.getSignaturesForAddress(wallet, { limit: 20 });
            
            for (const sig of signatures.slice(0, 10)) { // Check recent 10 only
                try {
                    const transaction = await connection.getTransaction(sig.signature, {
                        commitment: 'confirmed',
                        maxSupportedTransactionVersion: 0
                    });
                    
                    if (transaction && transaction.transaction.message.instructions) {
                        for (const instruction of transaction.transaction.message.instructions) {
                            if (instruction.data) {
                                try {
                                    const decoded = Buffer.from(instruction.data, 'base64').toString('utf-8');
                                    const ipfsMatch = decoded.match(/📔 IPFS: (bafkrei[a-z2-7]{52})/);
                                    if (ipfsMatch) {
                                        potentialHashes.push(ipfsMatch[1]);
                                    }
                                } catch (e) {
                                    // Skip invalid instruction data
                                }
                            }
                        }
                    }
                } catch (e) {
                    // Skip failed transaction fetches
                }
            }
        }
    } catch (error) {
        console.log('⚠️ Blockchain hash discovery failed, using fallback approach');
    }
    
    // Add some hardcoded recent patterns as fallback
    if (potentialHashes.length === 0) {
        console.log('🔄 Using fallback hash discovery approach...');
        // These would be recent diary hashes we know exist
        // In a real implementation, we'd maintain an index file
        potentialHashes.push(
            'bafkreidm7g5vdvcep56bppymacos56e6vtg7nofogterhzctoweo7hf664',
            'bafkreiel6dyddpxpeewkpk6jb66h3qdojgqppcp5lvigwey4x2wjslka7i',
            'bafkreigio72hakd4im6hnjs7uiaky2to6huqzvmoeedf6ezp3eqfbj2qjm',
            'bafkreidoy243ih3b2fjaw5mlqn42jdb2xjpzeq22brptlgpv35higiapnm'
        );
    }
    
    console.log(`🎯 Will try ${potentialHashes.length} potential diary hashes`);
    return potentialHashes;
}

async function loadDiariesFromBlockchain() {
    const entries = [];
    
    try {
        // Get only the most recent transactions to avoid rate limits
        const signatures = await connection.getSignaturesForAddress(wallet, { limit: 5 });
        console.log(`📡 Checking ${signatures.length} recent blockchain transactions...`);
        
        for (let i = 0; i < signatures.length; i++) {
            const signatureInfo = signatures[i];
            
            // Add delay to avoid rate limits
            if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            try {
                const transaction = await connection.getTransaction(signatureInfo.signature, {
                    commitment: 'confirmed',
                    maxSupportedTransactionVersion: 0
                });
                
                if (!transaction) continue;
                
                // Look for diary memos
                const instructions = transaction.transaction.message.instructions;
                
                for (const instruction of instructions) {
                    if (instruction.data) {
                        try {
                            const decoded = Buffer.from(instruction.data, 'base64').toString('utf-8');
                            
                            // Look for diary entry patterns
                            if (decoded.includes('📔 IPFS:')) {
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
                console.log('⚠️ Transaction fetch error:', error.message);
                if (error.message.includes('429')) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
        
        entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        displayDiaryEntries(entries);
        
    } catch (error) {
        console.error('Blockchain scan error:', error);
        showError('Failed to load recent diary entries from blockchain');
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
    const source = entries.length > 0 && entries[0].source === 'github-direct' ? 'GitHub' : 'blockchain';
    showStatus(`Loaded ${entries.length} diary entries from ${source}`, 'success');
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
        console.log('🎯 Send LEGO button clicked');
        showStatus('Sending LEGO tokens for diary entry...', 'loading');
        sendLegoBtn.disabled = true;
        
        console.log('📊 Checking dependencies...');
        console.log('- wallet:', wallet ? 'Connected' : 'Not connected');
        console.log('- connection:', connection ? 'Available' : 'Not available');
        console.log('- CONFIG:', CONFIG ? 'Available' : 'Not available');
        
        // Check if SPL Token library is available
        let splTokenLib = null;
        if (typeof splToken !== 'undefined') {
            splTokenLib = splToken;
            console.log('- splToken: Available via global');
        } else if (typeof window.splToken !== 'undefined') {
            splTokenLib = window.splToken;
            console.log('- splToken: Available via window.splToken');
        } else if (typeof solanaWeb3 !== 'undefined' && solanaWeb3.splToken) {
            splTokenLib = solanaWeb3.splToken;
            console.log('- splToken: Available via solanaWeb3.splToken');
        } else {
            console.log('- splToken: Not available, will use manual approach');
        }
        
        // Debug SPL Token library functions
        if (splTokenLib) {
            console.log('🔍 Available splToken functions:', Object.keys(splTokenLib));
            console.log('🔍 getAssociatedTokenAddress type:', typeof splTokenLib.getAssociatedTokenAddress);
            console.log('🔍 createTransferInstruction type:', typeof splTokenLib.createTransferInstruction);
        }
        
        if (!wallet) {
            throw new Error('Wallet not connected');
        }
        
        if (!splTokenLib) {
            throw new Error('SPL Token library not loaded');
        }
        
        const legoAmount = CONFIG.TOKENS_PER_MESSAGE;
        console.log('💰 LEGO amount to send:', legoAmount);
        
        // Create transaction to send LEGO tokens to message service
        const transaction = new solanaWeb3.Transaction();
        
        // Get or create associated token accounts
        console.log('🔗 Getting token accounts...');
        const senderTokenAccount = await splTokenLib.getAssociatedTokenAddress(
            new solanaWeb3.PublicKey(LEGO_MINT),
            wallet
        );
        console.log('👤 Sender token account:', senderTokenAccount.toString());
        
        const receiverTokenAccount = await splTokenLib.getAssociatedTokenAddress(
            new solanaWeb3.PublicKey(LEGO_MINT),
            new solanaWeb3.PublicKey(MESSAGE_SERVICE_ACCOUNT)
        );
        console.log('🏦 Receiver token account:', receiverTokenAccount.toString());
        
        // Add transfer instruction
        console.log('📝 Creating transfer instruction...');
        const transferInstruction = splTokenLib.createTransferInstruction(
            senderTokenAccount,
            receiverTokenAccount,
            wallet,
            legoAmount * Math.pow(10, 6) // Convert to token decimals
        );
        console.log('✅ Transfer instruction created');
        
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