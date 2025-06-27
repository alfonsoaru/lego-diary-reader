const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Gemini AI (you'll need to set your API key)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'your-api-key-here');

// Store generated diary entries
const diaryEntries = new Map();

// Generate personalized diary entry
app.post('/generate-diary', async (req, res) => {
    try {
        const { signature, wallet } = req.body;
        
        // Unique prompts for variety
        const prompts = [
            "Write a personal LEGO diary entry about discovering a new building technique today. Make it specific and exciting.",
            "Create a LEGO diary entry about finding rare pieces or completing a challenging build. Include emotions and details.",
            "Write a LEGO diary entry about organizing your collection or teaching someone else to build. Make it heartwarming.",
            "Generate a LEGO diary entry about experimenting with new colors or design patterns. Include your creative process.",
            "Create a LEGO diary entry about a building mishap that turned into something beautiful. Include the lesson learned."
        ];
        
        // Use signature to select prompt for variety
        const promptIndex = parseInt(signature.slice(-1), 16) % prompts.length;
        const prompt = prompts[promptIndex];
        
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Store the generated entry
        const entry = {
            signature,
            content: text,
            timestamp: new Date().toISOString(),
            wallet: wallet.slice(0, 8) + '...',
            ipfsHash: 'Qm' + signature.slice(0, 44) // Simulated IPFS hash
        };
        
        diaryEntries.set(signature, entry);
        
        res.json({ success: true, entry });
        
    } catch (error) {
        console.error('Diary generation failed:', error);
        
        // Fallback to enhanced static content if AI fails
        const fallbackEntries = [
            "Today I experimented with a new LEGO technique using overlapping plates to create a stronger foundation. The result was incredibly sturdy and opened up new possibilities for my castle build!",
            "Found some rare transparent yellow pieces at a local store today! They're perfect for the lighthouse beacon I've been planning. The way they catch the light is absolutely magical.",
            "Completed my most ambitious build yet - a working LEGO clock mechanism! It took weeks of trial and error, but seeing those gears turn for the first time was pure joy.",
            "Spent the afternoon teaching my young cousin how to build. Watching their face light up when they created their first stable tower reminded me why I love LEGO so much.",
            "Discovered that combining different shades of blue creates an amazing ocean effect. My pirate ship now sits on the most realistic water I've ever built!"
        ];
        
        const index = parseInt(signature.slice(-1), 16) % fallbackEntries.length;
        const entry = {
            signature,
            content: fallbackEntries[index],
            timestamp: new Date().toISOString(),
            wallet: wallet.slice(0, 8) + '...',
            ipfsHash: 'Qm' + signature.slice(0, 44)
        };
        
        diaryEntries.set(signature, entry);
        res.json({ success: true, entry });
    }
});

// Get diary entry by signature
app.get('/diary/:signature', (req, res) => {
    const entry = diaryEntries.get(req.params.signature);
    if (entry) {
        res.json(entry);
    } else {
        res.status(404).json({ error: 'Entry not found' });
    }
});

// Get all diary entries
app.get('/diary', (req, res) => {
    const entries = Array.from(diaryEntries.values())
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(entries);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🧱 LEGO Diary Service running on port ${PORT}`);
    console.log(`📝 Generate diary: POST /generate-diary`);
    console.log(`📖 Get diary: GET /diary/:signature`);
    console.log(`📚 Get all diaries: GET /diary`);
});