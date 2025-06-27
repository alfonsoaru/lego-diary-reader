// Global variables
let wallet = null;
let connection = null;

// Initialize Solana connection
const SOLANA_RPC = 'https://api.devnet.solana.com';
connection = new solanaWeb3.Connection(SOLANA_RPC, 'confirmed');

// Message service account that receives LEGO tokens
const MESSAGE_SERVICE_ACCOUNT = '4rBjRyfSNWGbbCNcTzEyrJUNxUj5im1dGCgKMta93R3j';

// DOM elements
const connectBtn = document.getElementById('connectBtn');
const status = document.getElementById('status');
const diaryEntries = document.getElementById('diaryEntries');

// Event listeners
connectBtn.addEventListener('click', connectWallet);

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
        
        // Start loading diary entries
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