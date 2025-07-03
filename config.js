// Configuration for LEGO Diary Reader
const CONFIG = {
    // GitHub Pages configuration
    GITHUB_PAGES_BASE_URL: 'https://alfonsoaru.github.io/lego-diary-reader/public/images/',
    
    // Fallback to local development
    LOCAL_BASE_URL: 'http://localhost:3000/images/',
    
    // Use GitHub Pages in production (and for testing on localhost)
    USE_GITHUB_PAGES: true, // Force GitHub Pages for testing
    
    // Token configuration
    TOKENS: {
        USDC_MINT: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
        LEGO_MINT: '6Pc8qwhy99qZca23RqY92DbcLQxweUwxWPEKpb9psbAi',
        USDC_EXCHANGE_ACCOUNT: 'AjQDtGGvisRMLhcPkF6Kk8vsA8dixio7aTtYRNPcc15d',
        MESSAGE_SERVICE_ACCOUNT: '4rBjRyfSNWGbbCNcTzEyrJUNxUj5im1dGCgKMta93R3j'
    },
    
    // Service configuration
    TOKENS_PER_MESSAGE: 10,        // LEGO tokens required per diary entry
    TOKENS_PER_USDC: 10000,        // LEGO tokens per $1 USDC  
    MIN_USDC: 0.10,                // Minimum USDC for exchange
    TESTING_MODE: true             // Enable testing prices
};

// Helper function to get image URL
function getImageUrl(ipfsHash) {
    if (!ipfsHash) return null;
    
    if (CONFIG.USE_GITHUB_PAGES) {
        return `${CONFIG.GITHUB_PAGES_BASE_URL}${ipfsHash}.png`;
    } else {
        return `${CONFIG.LOCAL_BASE_URL}${ipfsHash}.png`;
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, getImageUrl };
} else {
    window.CONFIG = CONFIG;
    window.getImageUrl = getImageUrl;
}