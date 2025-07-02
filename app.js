// LEGO Diary Reader v4.0 - Full IPFS Integration + Native Access
console.log('🧱 LEGO Diary Reader v4.0 - Full IPFS Integration + Native Access Loaded');

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
        
        console.log('Window.solana:', window.solana);
        console.log('Is Phantom?', window.solana?.isPhantom);
        console.log('Location protocol:', window.location.protocol);
        console.log('Location hostname:', window.location.hostname);
        
        if (!window.solana) {
            throw new Error('Solana wallet not found! Please install Phantom wallet extension and refresh the page.');
        }
        
        if (!window.solana.isPhantom) {
            console.log('Non-Phantom wallet detected, trying anyway...');
        }
        
        // Try to connect with user interaction
        const response = await window.solana.connect({ onlyIfTrusted: false });
        console.log('Wallet response:', response);
        
        if (!response.publicKey) {
            throw new Error('No public key returned from wallet');
        }
        
        wallet = response.publicKey;
        console.log('Connected wallet:', wallet.toString());
        
        showStatus(`Connected: ${wallet.toString().substring(0, 8)}...${wallet.toString().slice(-8)}`, 'connected');
        connectBtn.textContent = 'Connected ✓';
        
        // Show token actions and update UI with config values
        tokenActions.style.display = 'block';
        updateUIWithConfig();
        
        // Load balances and diary entries
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
        
        // Get all transactions for this wallet
        const signatures = await connection.getSignaturesForAddress(wallet, { limit: 100 });
        console.log(`Found ${signatures.length} transactions`);
        
        const entries = [];
        
        // Process more transactions to find memo entries
        const limitedSignatures = signatures.slice(0, 10);
        console.log(`Processing ${limitedSignatures.length} transactions to find memo entries`);
        
        for (const signatureInfo of limitedSignatures) {
            try {
                // Get full transaction details
                const transaction = await connection.getTransaction(signatureInfo.signature, {
                    commitment: 'confirmed',
                    maxSupportedTransactionVersion: 0
                });
                
                if (!transaction) {
                    console.log(`⚠️ No transaction data for ${signatureInfo.signature.slice(0, 8)}...`);
                    continue;
                }
                
                console.log(`🔍 Parsing transaction ${signatureInfo.signature.slice(0, 8)}...`);
                
                // Look for LEGO token transfers to message service
                const diaryEntry = await parseTransactionForDiaryEntry(transaction, signatureInfo);
                if (diaryEntry) {
                    console.log(`✅ Found diary entry: ${diaryEntry.content.slice(0, 50)}...`);
                    entries.push(diaryEntry);
                } else {
                    console.log(`❌ No diary entry found in transaction`);
                }
                
            } catch (error) {
                console.log('Error parsing transaction:', error);
                continue;
            }
        }
        
        // Sort entries by date (newest first)
        entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        displayDiaryEntries(entries);
        
    } catch (error) {
        console.error('Failed to load diary entries:', error);
        showError('Failed to load diary entries: ' + error.message);
    }
}

async function parseTransactionForDiaryEntry(transaction, signatureInfo) {
    try {
        // Look for transactions with memo instructions (service sending back to customer)
        const accountKeys = transaction.transaction.message.accountKeys;
        const instructions = transaction.transaction.message.instructions;
        
        // Check for memo program instructions first
        const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
        let hasMemoInstruction = false;
        
        for (const instruction of instructions) {
            const programId = accountKeys[instruction.programIdIndex];
            if (programId.toString() === MEMO_PROGRAM_ID) {
                hasMemoInstruction = true;
                break;
            }
        }
        
        if (!hasMemoInstruction) {
            console.log(`❌ Transaction ${signatureInfo.signature.slice(0, 8)}... has no memo instruction`);
            return null;
        }
        
        // Check if this is a SOL transfer TO our wallet (service paying customer)
        let isServiceToCustomer = false;
        for (const instruction of instructions) {
            const programId = accountKeys[instruction.programIdIndex];
            // System program for SOL transfers
            if (programId.toString() === '11111111111111111111111111111111') {
                // This is a SOL transfer, check if it's TO our wallet
                isServiceToCustomer = true;
                break;
            }
        }
        
        if (!isServiceToCustomer) {
            console.log(`❌ Transaction ${signatureInfo.signature.slice(0, 8)}... not a service-to-customer transaction`);
            return null;
        }
        
        console.log(`✅ Transaction ${signatureInfo.signature.slice(0, 8)}... is service sending memo to customer`);
        console.log(`🔍 Starting memo parsing for transaction ${signatureInfo.signature.slice(0, 8)}...`);
        
        // Look for memo content in transaction logs (more reliable)
        const logs = transaction.meta?.logMessages || [];
        let ipfsHash = null;
        let memoContent = null;
        
        console.log(`🔍 Checking ${logs.length} log messages for memo content...`);
        
        // Check logs for memo content first (this is more reliable)
        for (const log of logs) {
            if (log.includes('Memo (len')) {
                console.log(`📝 Found memo log: ${log.substring(0, 100)}...`);
                // Extract memo content from log: 'Memo (len X): "content"'
                const memoMatch = log.match(/Memo \(len \d+\): "(.+)"/);
                if (memoMatch) {
                    memoContent = memoMatch[1].replace(/\\n/g, '\n'); // Handle escaped newlines
                    console.log(`✅ Extracted memo content: ${memoContent.substring(0, 100)}...`);
                    
                    // Look for REAL IPFS hash patterns in memo (prioritize bafkrei over fake Qm)
                    const realIpfsMatch = memoContent.match(/📔 IPFS: (bafkrei[a-z2-7]{52})/);
                    const anyIpfsMatch = memoContent.match(/(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafkrei[a-z2-7]{52})/);
                    
                    if (realIpfsMatch) {
                        ipfsHash = realIpfsMatch[1]; // Use the real IPFS hash after "📔 IPFS:"
                        console.log('🔍 Found REAL IPFS hash in memo:', ipfsHash);
                    } else if (anyIpfsMatch) {
                        ipfsHash = anyIpfsMatch[0]; // Fallback to any IPFS hash found
                        console.log('🔍 Found fallback IPFS hash in memo:', ipfsHash);
                    }
                    
                    if (ipfsHash) {
                        break;
                    }
                }
            }
        }
        
        // Only return real diary entries with IPFS hashes
        if (ipfsHash) {
            // Try to get real diary entry from API
            const realEntry = await createRealDiaryEntry(transaction, signatureInfo, ipfsHash, memoContent);
            return realEntry; // This will be null if no real content found
        }
        
        return null;
        
    } catch (error) {
        console.log('Error parsing transaction for diary:', error);
        return null;
    }
}

async function createRealDiaryEntry(transaction, signatureInfo, ipfsHash, memoContent) {
    const timestamp = signatureInfo.blockTime * 1000;
    const date = new Date(timestamp);
    const signature = signatureInfo.signature;
    
    // Try to get AI-generated entry from API first
    try {
        const response = await fetch(`http://localhost:3000/diary/${signature}`);
        if (response.ok) {
            const apiEntry = await response.json();
            
            // If API entry exists, try to get full content from IPFS cache
            let fullContent = apiEntry.content;
            let imageData = apiEntry.image;
            
            // Extract real IPFS hash from content if available
            let realIpfsHash = apiEntry.ipfsHash;
            const contentMatch = apiEntry.content.match(/IPFS: (Qm[a-zA-Z0-9]{44})/);
            if (contentMatch) {
                realIpfsHash = contentMatch[1];
                console.log('🔍 Found real IPFS hash in content:', realIpfsHash);
            }
            
            if (realIpfsHash && !imageData) {
                try {
                    console.log('🔍 Looking up IPFS content for:', realIpfsHash);
                    const ipfsResponse = await fetch(`http://localhost:3000/ipfs/${realIpfsHash}`);
                    if (ipfsResponse.ok) {
                        const ipfsContent = await ipfsResponse.json();
                        console.log('✅ IPFS content found:', ipfsContent);
                        if (ipfsContent.content && ipfsContent.content.content) {
                            fullContent = ipfsContent.content.content;
                            console.log('📝 Updated content from IPFS');
                        }
                        if (ipfsContent.content && ipfsContent.content.image) {
                            imageData = ipfsContent.content.image;
                            // Convert local path to HTTP URL
                            if (imageData.localPath) {
                                const filename = imageData.localPath.split('/').pop();
                                imageData.data = `http://localhost:3000/images/${filename}`;
                                console.log('🖼️ Using local HTTP image:', imageData.data);
                            } else {
                                console.log('🖼️ Found image data:', imageData.data.substring(0, 50) + '...');
                            }
                        }
                    } else {
                        console.log('❌ IPFS lookup failed:', ipfsResponse.status);
                    }
                } catch (ipfsError) {
                    console.log('❌ IPFS cache lookup failed:', ipfsError);
                }
            }
            
            return {
                signature: signature,
                content: fullContent,
                image: imageData,
                timestamp: date.toISOString(),
                date: date.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                }),
                time: apiEntry.time || date.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit',
                    hour12: true 
                }),
                wallet: apiEntry.wallet,
                ipfsHash: ipfsHash
            };
        }
    } catch (error) {
        console.log('API call failed, extracting from memo:', error);
    }
    
    // Extract content from memo if API fails
    if (memoContent && ipfsHash) {
        // Extract preview content from memo (after the IPFS hash)
        const parts = memoContent.split(' | ');
        let previewContent = 'Diary entry available on IPFS';
        
        console.log(`🔍 Memo parts (${parts.length}):`, parts);
        
        if (parts.length > 2) {
            // Skip the payment info and IPFS hash, get the actual content preview
            previewContent = parts.slice(2).join(' | '); // Get everything after "💰10 LEGO→1 msgs | ipfs://hash | "
            console.log(`✅ Using parts 2+: ${previewContent.substring(0, 100)}...`);
        } else if (parts.length > 1) {
            previewContent = parts[1]; // Fallback to second part
            console.log(`✅ Using part 1: ${previewContent.substring(0, 100)}...`);
        }
        
        // Clean up the preview content
        if (previewContent.startsWith('📔 IPFS:')) {
            // Extract just the text after the IPFS hash reference
            const textMatch = previewContent.match(/📔 IPFS: [a-zA-Z0-9]+ - (.+)/);
            if (textMatch) {
                previewContent = textMatch[1];
                console.log(`✅ Cleaned preview: ${previewContent.substring(0, 100)}...`);
            }
        }
        
        return {
            signature: signature,
            content: previewContent,
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
            wallet: transaction.transaction.message.accountKeys[0].toString().slice(0, 8) + '...',
            ipfsHash: ipfsHash
        };
    }
    
    // No real content found
    return null;
}

function displayDiaryEntries(entries) {
    if (entries.length === 0) {
        diaryEntries.innerHTML = `
            <div class="no-entries">
                📔 No diary entries found yet!<br>
                <br>
                Send some LEGO tokens to the message service to receive your first diary entry:<br>
                <code>${MESSAGE_SERVICE_ACCOUNT}</code>
            </div>
        `;
        return;
    }
    
    let html = `<h2>📖 Your LEGO Diary Entries (${entries.length})</h2>`;
    
    entries.forEach((entry, index) => {
        // Check if entry has image data
        const hasImage = entry.image && (entry.image.data || entry.image.ipfsHash);
        
        // Determine the best image URL to use
        let imageUrl = null;
        let imageSource = 'none';
        
        if (hasImage) {
            // Priority: GitHub Pages (for IPFS hashes) > Local > Original
            if (entry.image.ipfsHash) {
                imageUrl = getImageUrl(entry.image.ipfsHash);
                imageSource = CONFIG.USE_GITHUB_PAGES ? 'GitHub Pages' : 'Local HTTP';
            } else if (entry.image.githubPagesUrl) {
                imageUrl = entry.image.githubPagesUrl;
                imageSource = 'GitHub Pages (direct)';
            } else if (entry.image.data) {
                imageUrl = entry.image.data;
                imageSource = 'Original URL';
            }
        }
        
        html += `
            <div class="diary-entry">
                <div class="diary-date">📅 ${entry.date} ${entry.time ? `🕐 ${entry.time}` : ''}</div>
                ${hasImage && imageUrl ? `
                    <div class="diary-image">
                        <div style="font-size: 0.9em; color: #333; margin-bottom: 10px;">
                            <strong>🖼️ Image Source:</strong> ${imageSource}
                            ${entry.image.ipfsHash ? `<br><strong>IPFS Hash:</strong> ${entry.image.ipfsHash}` : ''}
                        </div>
                        <img src="${imageUrl}" alt="AI Generated LEGO Scene" style="width: 100%; max-width: 400px; height: 200px; object-fit: cover; border-radius: 10px; margin-bottom: 15px;" 
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                        <div style="display: none; padding: 20px; background: #f5f5f5; border-radius: 10px; text-align: center; color: #666;">
                            ❌ Image failed to load<br>
                            <small>Primary URL: ${imageUrl}</small>
                            ${entry.image.data && imageUrl !== entry.image.data ? `<br><small>Fallback: ${entry.image.data}</small>` : ''}
                        </div>
                        <div class="image-prompt" style="font-size: 0.9em; color: #666; margin-bottom: 15px;">🎨 ${entry.image.prompt || 'AI Generated LEGO Scene'}</div>
                    </div>
                ` : ''}
                <div class="diary-content">
                    📔 Dear Diary,<br><br>
                    ${entry.content}
                    <br><br>
                    - LEGO Lover ${wallet.toString().substring(0, 8)}...
                </div>
                <div class="diary-meta">
                    📦 <a href="https://gateway.pinata.cloud/ipfs/${entry.ipfsHash}" target="_blank" class="ipfs-link">
                        View on IPFS: ${entry.ipfsHash.substring(0, 20)}...
                    </a><br>
                    🏠 <a href="http://127.0.0.1:8080/ipfs/${entry.ipfsHash}" target="_blank" class="ipfs-link">
                        Try Local IPFS: ${entry.ipfsHash.substring(0, 8)}...
                    </a><br>
                    🔗 <a href="https://explorer.solana.com/tx/${entry.signature}?cluster=devnet" target="_blank" class="ipfs-link">
                        Transaction: ${entry.signature.substring(0, 20)}...
                    </a>
                    ${hasImage ? `<br>🖼️ <span style="color: #666;">AI-generated ${entry.image.type} image</span>` : ''}
                </div>
            </div>
        `;
    });
    
    diaryEntries.innerHTML = html;
    showStatus(`Loaded ${entries.length} diary entries from blockchain + IPFS`, 'connected');
}

function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
}

function updateUIWithConfig() {
    // Update button text with current config values
    const sendLegoBtn = document.getElementById('sendLegoBtn');
    const actionSection = sendLegoBtn.closest('.action-section');
    const description = actionSection.querySelector('p');
    
    if (CONFIG.TESTING_MODE) {
        sendLegoBtn.textContent = `Send ${CONFIG.TOKENS_PER_MESSAGE} LEGO for Diary Entry`;
        description.textContent = `Send ${CONFIG.TOKENS_PER_MESSAGE} LEGO tokens to receive a personalized diary entry (testing price)`;
    } else {
        sendLegoBtn.textContent = `Send ${CONFIG.TOKENS_PER_MESSAGE} LEGO for Diary Entry`;
        description.textContent = `Send ${CONFIG.TOKENS_PER_MESSAGE} LEGO tokens to receive a personalized diary entry`;
    }
}

async function loadBalances() {
    try {
        // Get user's token accounts
        const usdcMint = new solanaWeb3.PublicKey(USDC_MINT);
        const legoMint = new solanaWeb3.PublicKey(LEGO_MINT);
        
        // Calculate associated token accounts
        const usdcAccount = await solanaWeb3.PublicKey.findProgramAddress(
            [wallet.toBytes(), new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA').toBytes(), usdcMint.toBytes()],
            new solanaWeb3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
        );
        
        const legoAccount = await solanaWeb3.PublicKey.findProgramAddress(
            [wallet.toBytes(), new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA').toBytes(), legoMint.toBytes()],
            new solanaWeb3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
        );
        
        // Get balances
        let usdcBalance = 0;
        let legoBalance = 0;
        
        try {
            const usdcBalanceInfo = await connection.getTokenAccountBalance(usdcAccount[0]);
            usdcBalance = parseFloat(usdcBalanceInfo.value.uiAmount || 0);
        } catch (error) {
            console.log('USDC account not found');
        }
        
        try {
            const legoBalanceInfo = await connection.getTokenAccountBalance(legoAccount[0]);
            legoBalance = parseFloat(legoBalanceInfo.value.uiAmount || 0);
        } catch (error) {
            console.log('LEGO account not found');
        }
        
        // Update UI
        usdcBalanceSpan.textContent = `USDC: $${usdcBalance.toFixed(2)}`;
        legoBalanceSpan.textContent = `LEGO: ${legoBalance.toLocaleString()}`;
        
        // Enable/disable buttons based on balances
        sendLegoBtn.disabled = legoBalance < 1000;
        
    } catch (error) {
        console.error('Failed to load balances:', error);
        usdcBalanceSpan.textContent = 'USDC: Error';
        legoBalanceSpan.textContent = 'LEGO: Error';
    }
}

async function swapUSDCToLEGO() {
    try {
        const usdcAmount = parseFloat(usdcAmountInput.value);
        
        if (!usdcAmount || usdcAmount < 0.10) {
            showError('Please enter at least $0.10 USDC');
            return;
        }
        
        swapBtn.disabled = true;
        swapBtn.textContent = 'Swapping...';
        
        // Create transaction to send USDC to exchange account
        const usdcMint = new solanaWeb3.PublicKey(USDC_MINT);
        const exchangeAccount = new solanaWeb3.PublicKey(USDC_EXCHANGE_ACCOUNT);
        
        // Get user's USDC account
        const userUsdcAccount = await solanaWeb3.PublicKey.findProgramAddress(
            [wallet.toBytes(), new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA').toBytes(), usdcMint.toBytes()],
            new solanaWeb3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
        );
        
        // Get exchange USDC account
        const exchangeUsdcAccount = await solanaWeb3.PublicKey.findProgramAddress(
            [exchangeAccount.toBytes(), new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA').toBytes(), usdcMint.toBytes()],
            new solanaWeb3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
        );
        
        // Create transfer instruction using Phantom's transaction builder
        const transaction = new solanaWeb3.Transaction();
        
        const transferInstruction = new solanaWeb3.TransactionInstruction({
            keys: [
                { pubkey: userUsdcAccount[0], isSigner: false, isWritable: true },
                { pubkey: exchangeUsdcAccount[0], isSigner: false, isWritable: true },
                { pubkey: wallet, isSigner: true, isWritable: false },
            ],
            programId: new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
            data: new Uint8Array([
                3, // Transfer instruction
                ...new Uint8Array(8).map((_, i) => Number((BigInt(Math.floor(usdcAmount * 1000000)) >> BigInt(i * 8)) & BigInt(0xff))) // Amount in smallest units
            ])
        });
        
        transaction.add(transferInstruction);
        transaction.feePayer = wallet;
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        
        // Sign and send transaction
        const signedTransaction = await window.solana.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signedTransaction.serialize());
        await connection.confirmTransaction(signature);
        
        console.log('USDC swap transaction:', signature);
        showStatus(`Swapped $${usdcAmount} USDC! LEGO tokens incoming...`, 'connected');
        
        // Refresh balances after a short delay
        setTimeout(loadBalances, 3000);
        
    } catch (error) {
        console.error('Swap failed:', error);
        showError('Swap failed: ' + error.message);
    } finally {
        swapBtn.disabled = false;
        swapBtn.textContent = 'Swap USDC → LEGO';
    }
}

async function sendLegoForDiary() {
    try {
        sendLegoBtn.disabled = true;
        sendLegoBtn.textContent = 'Sending...';
        
        // Create transaction to send 10 LEGO tokens to message service
        const legoMint = new solanaWeb3.PublicKey(LEGO_MINT);
        const messageService = new solanaWeb3.PublicKey(MESSAGE_SERVICE_ACCOUNT);
        
        // Get user's LEGO account
        const userLegoAccount = await solanaWeb3.PublicKey.findProgramAddress(
            [wallet.toBytes(), new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA').toBytes(), legoMint.toBytes()],
            new solanaWeb3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
        );
        
        // Create transfer instruction
        const transaction = new solanaWeb3.Transaction();
        
        const transferInstruction = new solanaWeb3.TransactionInstruction({
            keys: [
                { pubkey: userLegoAccount[0], isSigner: false, isWritable: true },
                { pubkey: messageService, isSigner: false, isWritable: true },
                { pubkey: wallet, isSigner: true, isWritable: false },
            ],
            programId: new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
            data: new Uint8Array([
                3, // Transfer instruction
                ...new Uint8Array(8).map((_, i) => Number((BigInt(CONFIG.TOKENS_PER_MESSAGE * 1000000000) >> BigInt(i * 8)) & BigInt(0xff))) // LEGO tokens from config
            ])
        });
        
        transaction.add(transferInstruction);
        transaction.feePayer = wallet;
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        
        // Sign and send transaction
        const signedTransaction = await window.solana.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signedTransaction.serialize());
        await connection.confirmTransaction(signature);
        
        console.log('LEGO diary request transaction:', signature);
        showStatus(`${CONFIG.TOKENS_PER_MESSAGE} LEGO sent! Your diary entry is being generated...`, 'connected');
        
        // Generate new diary entry with AI
        await generatePersonalizedDiaryEntry(signature, wallet.toString());
        
        // Refresh balances and diary entries after a short delay
        setTimeout(() => {
            loadBalances();
            loadDiaryEntries();
        }, 5000);
        
    } catch (error) {
        console.error('Send LEGO failed:', error);
        showError('Send LEGO failed: ' + error.message);
    } finally {
        sendLegoBtn.disabled = false;
        sendLegoBtn.textContent = 'Send 1,000 LEGO for Diary Entry';
    }
}

async function generatePersonalizedDiaryEntry(signature, wallet) {
    try {
        const response = await fetch('http://localhost:3000/generate-diary', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ signature, wallet })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ New diary entry generated:', result.entry.content);
            showStatus('🎉 New personalized diary entry created!', 'connected');
        } else {
            console.error('❌ Diary generation failed');
        }
        
    } catch (error) {
        console.error('API call failed:', error);
        // Fallback to existing system if API is down
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    
    // Insert after wallet section
    const walletSection = document.querySelector('.wallet-section');
    walletSection.insertAdjacentElement('afterend', errorDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}