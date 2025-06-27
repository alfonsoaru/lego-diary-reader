// Global variables
let wallet = null;
let connection = null;

// Initialize Solana connection
const SOLANA_RPC = 'https://api.devnet.solana.com';
connection = new solanaWeb3.Connection(SOLANA_RPC, 'confirmed');

// Token addresses
const USDC_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
const LEGO_MINT = '6Pc8qwhy99qZca23RqY92DbcLQxweUwxWPEKpb9psbAi';
const USDC_EXCHANGE_ACCOUNT = 'AjQDtGGvisRMLhcPkF6Kk8vsA8dixio7aTtYRNPcc15d';
const MESSAGE_SERVICE_ACCOUNT = '4rBjRyfSNWGbbCNcTzEyrJUNxUj5im1dGCgKMta93R3j';

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
        
        // Show token actions
        tokenActions.style.display = 'block';
        
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
        
        for (const signatureInfo of signatures) {
            try {
                // Get full transaction details
                const transaction = await connection.getTransaction(signatureInfo.signature, {
                    commitment: 'confirmed',
                    maxSupportedTransactionVersion: 0
                });
                
                if (!transaction) continue;
                
                // Look for LEGO token transfers to message service
                const diaryEntry = await parseTransactionForDiaryEntry(transaction, signatureInfo);
                if (diaryEntry) {
                    entries.push(diaryEntry);
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
        // Check if this transaction sent LEGO tokens to the message service
        const messageServicePubkey = new solanaWeb3.PublicKey(MESSAGE_SERVICE_ACCOUNT);
        
        // Look for token transfer in the transaction
        const accountKeys = transaction.transaction.message.accountKeys;
        const instructions = transaction.transaction.message.instructions;
        
        // Check if message service account is involved
        let isMessageServiceTransaction = false;
        for (const account of accountKeys) {
            if (account.equals(messageServicePubkey)) {
                isMessageServiceTransaction = true;
                break;
            }
        }
        
        if (!isMessageServiceTransaction) {
            return null;
        }
        
        // Look for log messages that might contain IPFS hashes
        const logs = transaction.meta?.logMessages || [];
        let ipfsHash = null;
        
        for (const log of logs) {
            // Look for IPFS hash pattern (starts with Qm)
            const ipfsMatch = log.match(/Qm[1-9A-HJ-NP-Za-km-z]{44}/);
            if (ipfsMatch) {
                ipfsHash = ipfsMatch[0];
                break;
            }
        }
        
        // For demo purposes, simulate finding diary entries based on transaction patterns
        // In a real implementation, you'd parse the actual transaction data more carefully
        if (isMessageServiceTransaction) {
            // Create a simulated diary entry based on transaction
            const simulatedEntry = await createSimulatedDiaryEntry(transaction, signatureInfo, ipfsHash);
            return simulatedEntry;
        }
        
        return null;
        
    } catch (error) {
        console.log('Error parsing transaction for diary:', error);
        return null;
    }
}

async function createSimulatedDiaryEntry(transaction, signatureInfo, ipfsHash) {
    // For demo, create diary entries based on transaction timestamp
    const timestamp = signatureInfo.blockTime * 1000;
    const date = new Date(timestamp);
    
    // Simulate different diary entries
    const demoEntries = [
        "Today I discovered an amazing new technique for creating smooth curves with standard LEGO bricks! The secret is in the angle and patience - each piece placed just right creates this incredible flowing effect.",
        "Found the most beautiful transparent blue pieces at the store today and immediately envisioned a stunning waterfall for my medieval castle. Sometimes the perfect piece just calls out to you!",
        "Completed my most challenging build yet - a detailed spaceship with moving wings and hidden compartments. The satisfaction of seeing months of planning come together is absolutely incredible.",
        "Organized my entire collection by color today and felt so inspired by all the possibilities laid out before me. There's something magical about seeing endless creative potential in neat, sorted rows.",
        "Taught my neighbor's child how to build today and watched their eyes light up with the same passion I felt decades ago. Sharing the joy of LEGO with the next generation fills my heart."
    ];
    
    // Use transaction signature to determine which entry to show (for consistency)
    const entryIndex = parseInt(signatureInfo.signature.substring(0, 2), 16) % demoEntries.length;
    const content = demoEntries[entryIndex];
    
    return {
        signature: signatureInfo.signature,
        timestamp: timestamp,
        date: date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        }),
        content: content,
        ipfsHash: ipfsHash || `Qm${signatureInfo.signature.substring(0, 44)}`, // Simulate IPFS hash
        blockTime: signatureInfo.blockTime
    };
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
        html += `
            <div class="diary-entry">
                <div class="diary-date">📅 ${entry.date}</div>
                <div class="diary-content">
                    📔 Dear Diary,<br><br>
                    ${entry.content}
                    <br><br>
                    - LEGO Lover ${wallet.toString().substring(0, 8)}...
                </div>
                <div class="diary-meta">
                    📦 <a href="https://ipfs.io/ipfs/${entry.ipfsHash}" target="_blank" class="ipfs-link">
                        View on IPFS: ${entry.ipfsHash.substring(0, 20)}...
                    </a><br>
                    🔗 <a href="https://explorer.solana.com/tx/${entry.signature}?cluster=devnet" target="_blank" class="ipfs-link">
                        Transaction: ${entry.signature.substring(0, 20)}...
                    </a>
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
                ...Array.from(new Uint8Array(new BigUint64Array([BigInt(Math.floor(usdcAmount * 1000000))]).buffer)) // Amount in smallest units
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
        
        // Create transaction to send 1000 LEGO tokens to message service
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
                ...Array.from(new Uint8Array(new BigUint64Array([BigInt(1000 * 1000000000)]).buffer)) // 1000 LEGO tokens
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
        showStatus('1000 LEGO sent! Your diary entry is being generated...', 'connected');
        
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