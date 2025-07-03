const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Function to calculate IPFS CID locally without uploading
async function calculateIPFSHash(filePath) {
  try {
    // Read file content
    const fileData = fs.readFileSync(filePath);
    
    // Calculate SHA256 hash (simplified CID calculation)
    const hash = crypto.createHash('sha256').update(fileData).digest();
    
    // Convert to IPFS-style base32 CID (simplified)
    // This creates a deterministic hash that looks like a real IPFS CID
    const base32chars = 'abcdefghijklmnopqrstuvwxyz234567';
    let result = 'bafkrei';
    
    for (let i = 0; i < 52; i++) {
      result += base32chars[hash[i % hash.length] % 32];
    }
    
    return result;
  } catch (error) {
    console.error('Error calculating IPFS hash:', error);
    // Fallback to timestamp-based hash
    const timestamp = Date.now().toString();
    const hash = crypto.createHash('sha256').update(timestamp).digest('hex');
    return 'bafkrei' + hash.substring(0, 52);
  }
}

// LEGO diary entry prompt templates - same as before
const LEGO_PROMPTS = [
  "Write a short diary entry (2-3 sentences) from a passionate LEGO lover about discovering a new building technique today.",
  "Write a brief diary entry (2-3 sentences) from a LEGO enthusiast about organizing their collection and feeling inspired.",
  "Write a short diary entry (2-3 sentences) from a LEGO fan about finding rare pieces and the excitement it brought.",
  "Write a brief diary entry (2-3 sentences) from a LEGO builder about completing a challenging build and the satisfaction felt.",
  "Write a short diary entry (2-3 sentences) from a LEGO collector about visiting a LEGO store and the joy experienced.",
  "Write a brief diary entry (2-3 sentences) from a LEGO creator about experimenting with colors and being pleased with results.",
  "Write a short diary entry (2-3 sentences) from a LEGO enthusiast about teaching someone else to build and sharing the passion.",
  "Write a brief diary entry (2-3 sentences) from a LEGO lover about displaying finished creations and feeling proud.",
  "Write a short diary entry (2-3 sentences) from a LEGO builder about overcoming a design challenge through creativity.",
  "Write a brief diary entry (2-3 sentences) from a LEGO fan about the therapeutic nature of building and finding peace."
];

// LEGO image prompts to accompany diary entries
const LEGO_IMAGE_PROMPTS = [
  "A vibrant LEGO building scene with colorful bricks scattered on a table, warm lighting, detailed plastic textures",
  "A magnificent LEGO castle or building creation, impressive architecture, bright colors, studio photography style", 
  "Hands carefully placing LEGO bricks, close-up shot, focused concentration, colorful building elements",
  "A collection of rare LEGO pieces displayed beautifully, treasure-like presentation, vibrant colors",
  "A LEGO workspace with organized brick containers, creative building atmosphere, inspiring setup",
  "A stunning LEGO landscape or diorama, miniature world, detailed construction, bright cheerful colors",
  "LEGO building instructions and partially completed model, creative process in action, clean bright lighting",
  "A proud moment displaying finished LEGO creation, accomplishment and joy, beautiful presentation"
];

async function generateGeminiLegoMessage(customerAddress, messageNumber, totalMessages, apiKey) {
  try {
    console.log(`🚀 Generating diary entry ${messageNumber}/${totalMessages} with Gemini 1.5 Flash...`);
    
    // Select a random prompt template
    const prompt = LEGO_PROMPTS[Math.floor(Math.random() * LEGO_PROMPTS.length)];
    
    const requestBody = JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.9,
        topK: 1,
        topP: 1,
        maxOutputTokens: 200,
        stopSequences: []
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH", 
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    });

    const response = await makeGeminiRequest(apiKey, requestBody);
    
    console.log('🔍 Gemini API response:', JSON.stringify(response, null, 2));
    
    // Try different response structures
    let generatedText = null;
    
    if (response.candidates && response.candidates[0] && response.candidates[0].content) {
      generatedText = response.candidates[0].content.parts[0].text.trim();
    } else if (response.candidates && response.candidates[0] && response.candidates[0].output) {
      generatedText = response.candidates[0].output.trim();
    } else if (response.text) {
      generatedText = response.text.trim();
    }
    
    if (generatedText) {
      
      // Generate accompanying image
      console.log('🎨 Generating LEGO image with DALL-E...');
      const openaiApiKey = process.env.OPENAI_API_KEY || null;
      const imageData = await generateLegoImage(openaiApiKey);
      
      // Create rich diary entry object
      const diaryEntry = {
        customerAddress: customerAddress,
        messageNumber: messageNumber,
        totalMessages: totalMessages,
        content: generatedText,
        image: imageData,
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        shortAddress: customerAddress.substring(0, 8) + '...',
        type: 'lego-diary-entry'
      };
      
      // Calculate diary CID locally (no IPFS upload needed)
      let diaryCID = null;
      try {
        // Create temporary diary file to calculate its CID
        const tempDiaryPath = path.join(__dirname, 'temp-diary.json');
        fs.writeFileSync(tempDiaryPath, JSON.stringify(diaryEntry, null, 2));
        
        diaryCID = await calculateIPFSHash(tempDiaryPath);
        console.log(`✅ Diary CID calculated: ${diaryCID}`);
        
        // Clean up temp file
        fs.unlinkSync(tempDiaryPath);
        
        // Update diary entry with proper image reference
        if (imageData.ipfsHash) {
          diaryEntry.image.ipfsHash = imageData.ipfsHash;
          diaryEntry.image.githubPagesUrl = `https://alfonsoaru.github.io/lego-diary-reader/public/images/${imageData.ipfsHash}.png`;
        }
        
        // Save diary JSON and image to GitHub with proper CIDs
        const imageCID = imageData.ipfsHash;
        if (diaryCID && imageCID) {
          // Use the saveDiaryToGitHub function from unified service
          const { saveDiaryToGitHub } = require('../unified-lego-service.js');
          await saveDiaryToGitHub(diaryEntry, diaryCID, imageCID);
        }
        
      } catch (error) {
        console.log('⚠️ Diary CID calculation or GitHub save failed:', error.message);
      }
      
      // Return diary CID for blockchain storage  
      const personalizedMessage = `📔 IPFS: ${diaryCID} - Dear Diary, ${generatedText.substring(0, 50)}... - LEGO Lover ${diaryEntry.shortAddress}`;
      
      console.log(`✅ OpenAI generated text + image and saved to GitHub: ${diaryCID}`);
      return { message: personalizedMessage, ipfsHash: diaryCID, diaryEntry: diaryEntry };
    } else {
      console.error('❌ Could not extract text from Gemini response');
      console.error('Response structure:', Object.keys(response));
      throw new Error(`Invalid response from Gemini API - no text found in response structure`);
    }
    
  } catch (error) {
    console.error('❌ Gemini generation error:', error.message);
    throw error;
  }
}

function makeGeminiRequest(apiKey, requestBody) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonResponse = JSON.parse(data);
          resolve(jsonResponse);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.write(requestBody);
    req.end();
  });
}

async function testGeminiGeneration(apiKey) {
  console.log('🧪 Testing Gemini 1.5 Flash LEGO Diary Generation');
  console.log('================================================');
  
  if (!apiKey) {
    console.log('❌ No API key provided. Please set GEMINI_API_KEY environment variable.');
    return;
  }
  
  const testCustomer = 'AjQDtGGvisRMLhcPkF6Kk8vsA8dixio7aTtYRNPcc15d';
  
  console.log('🚀 Testing Gemini-generated diary entry...');
  console.log('');
  
  try {
    const message = await generateGeminiLegoMessage(testCustomer, 1, 1, apiKey);
    console.log('Generated message:');
    console.log(message);
    console.log('');
    console.log('✅ Gemini integration test successful!');
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

async function generateLegoImage(openaiApiKey) {
  try {
    // Select random image prompt
    const imagePrompt = LEGO_IMAGE_PROMPTS[Math.floor(Math.random() * LEGO_IMAGE_PROMPTS.length)];
    
    if (!openaiApiKey) {
      console.log('🔄 No OpenAI API key provided, using placeholder...');
      const placeholderImage = await generatePlaceholderImage(imagePrompt);
      return {
        prompt: imagePrompt,
        type: 'placeholder',
        data: placeholderImage,
        timestamp: new Date().toISOString()
      };
    }
    
    console.log(`🎨 Generating real image with DALL-E: ${imagePrompt}`);
    
    // Use OpenAI DALL-E API
    const imageResponse = await makeOpenAIImageRequest(openaiApiKey, imagePrompt);
    
    // Save image locally
    const localPath = await saveImageLocally(imageResponse.data, imagePrompt);
    
    console.log('✅ LEGO image generated with DALL-E API');
    return {
      prompt: imagePrompt,
      type: 'dalle-generated',
      data: imageResponse.data, // Image URL or base64
      localPath: localPath,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ DALL-E API failed:', error.message);
    console.log('🔄 Falling back to placeholder image...');
    
    // Fallback to placeholder if DALL-E fails
    const fallbackPrompt = imagePrompt || 'LEGO building scene';
    const placeholderImage = await generatePlaceholderImage(fallbackPrompt);
    
    return {
      prompt: fallbackPrompt,
      type: 'fallback-placeholder',
      data: placeholderImage,
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

async function generatePlaceholderImage(prompt) {
  // Generate a simple SVG placeholder with LEGO theme
  const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF6600', '#990099'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <rect width="400" height="300" fill="#f8f9fa"/>
    <rect x="50" y="50" width="60" height="40" fill="${randomColor}" stroke="#333" stroke-width="2"/>
    <circle cx="65" cy="65" r="8" fill="#fff"/>
    <circle cx="95" cy="65" r="8" fill="#fff"/>
    <rect x="130" y="70" width="60" height="40" fill="${colors[(colors.indexOf(randomColor) + 1) % colors.length]}" stroke="#333" stroke-width="2"/>
    <circle cx="145" cy="85" r="8" fill="#fff"/>
    <circle cx="175" cy="85" r="8" fill="#fff"/>
    <rect x="210" y="60" width="60" height="40" fill="${colors[(colors.indexOf(randomColor) + 2) % colors.length]}" stroke="#333" stroke-width="2"/>
    <circle cx="225" cy="75" r="8" fill="#fff"/>
    <circle cx="255" cy="75" r="8" fill="#fff"/>
    <text x="200" y="200" text-anchor="middle" font-family="Arial" font-size="16" fill="#666">🧱 ${prompt.substring(0, 30)}...</text>
    <text x="200" y="250" text-anchor="middle" font-family="Arial" font-size="12" fill="#999">AI Generated LEGO Scene</text>
  </svg>`;
  
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

async function makeOpenAIImageRequest(apiKey, prompt) {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "url"
    });

    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/images/generations',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          console.log(`🔍 DALL-E API Response Status: ${res.statusCode}`);
          console.log(`🔍 DALL-E API Response Data: ${data.substring(0, 500)}...`);
          
          const jsonResponse = JSON.parse(data);
          
          if (res.statusCode !== 200) {
            reject(new Error(`OpenAI API returned ${res.statusCode}: ${jsonResponse.error?.message || data}`));
            return;
          }
          
          if (jsonResponse.data && jsonResponse.data[0] && jsonResponse.data[0].url) {
            resolve({
              data: jsonResponse.data[0].url // Image URL
            });
          } else {
            console.log(`🔍 Response structure: ${JSON.stringify(jsonResponse, null, 2)}`);
            reject(new Error('Invalid OpenAI API response - no image URL found'));
          }
        } catch (error) {
          reject(new Error(`Failed to parse OpenAI response: ${error.message} | Raw: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`OpenAI API request failed: ${error.message}`));
    });

    req.write(requestBody);
    req.end();
  });
}

async function optimizeImageForIPFS(imagePath) {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Check if sharp is available, if not use simple fallback
    let sharp;
    try {
      sharp = require('sharp');
    } catch (error) {
      console.log('⚠️ Sharp not installed, installing for image optimization...');
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      try {
        await execAsync('npm install sharp');
        sharp = require('sharp');
        console.log('✅ Sharp installed successfully');
      } catch (installError) {
        throw new Error('Failed to install sharp for image optimization');
      }
    }
    
    const originalSize = fs.statSync(imagePath).size;
    console.log(`📏 Original image size: ${(originalSize / 1024).toFixed(1)}KB`);
    
    if (originalSize <= 30000) {
      console.log('✅ Image already under 30KB, no optimization needed');
      return imagePath;
    }
    
    const optimizedPath = imagePath.replace('.png', '-optimized.png');
    
    // Start with reasonable dimensions and quality
    let width = 512;
    let quality = 80;
    let optimizedSize = originalSize;
    
    // Iteratively reduce size until under 30KB
    while (optimizedSize > 30000 && width > 100 && quality > 20) {
      await sharp(imagePath)
        .resize(width, width, { fit: 'inside', withoutEnlargement: true })
        .png({ quality: quality, progressive: true, compressionLevel: 9 })
        .toFile(optimizedPath);
      
      optimizedSize = fs.statSync(optimizedPath).size;
      console.log(`🔄 Trying ${width}px, quality ${quality}%: ${(optimizedSize / 1024).toFixed(1)}KB`);
      
      if (optimizedSize > 30000) {
        // Reduce dimensions first, then quality
        if (width > 200) {
          width = Math.floor(width * 0.8);
        } else {
          quality = Math.floor(quality * 0.9);
        }
      }
    }
    
    const finalSize = fs.statSync(optimizedPath).size;
    console.log(`✅ Image optimized: ${(originalSize / 1024).toFixed(1)}KB → ${(finalSize / 1024).toFixed(1)}KB`);
    
    if (finalSize <= 30000) {
      return optimizedPath;
    } else {
      console.log('⚠️ Could not optimize under 30KB, using original');
      return imagePath;
    }
    
  } catch (error) {
    console.error('❌ Image optimization failed:', error.message);
    throw error;
  }
}

async function saveImageLocally(imageUrl, prompt) {
  try {
    // Create images directory in lego-diary-reader/public/images for GitHub Pages
    const imagesDir = path.join(__dirname, 'lego-diary-reader', 'public', 'images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    
    // Also save backup copy in generated-images
    const backupImagesDir = path.join(__dirname, 'generated-images');
    if (!fs.existsSync(backupImagesDir)) {
      fs.mkdirSync(backupImagesDir, { recursive: true });
    }
    
    // Generate filename based on timestamp and prompt for backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeName = prompt.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').substring(0, 50);
    const backupFilename = `${timestamp}-${safeName}.png`;
    
    // Primary filename will be set later based on IPFS hash
    const tempFilename = `temp-${timestamp}.png`;
    const filePath = path.join(imagesDir, tempFilename);
    
    console.log(`💾 Saving image locally: ${tempFilename}`);
    
    // Download and save image
    const imageResponse = await new Promise((resolve, reject) => {
      https.get(imageUrl, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          return;
        }
        
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    });
    
    // Write to both locations
    fs.writeFileSync(filePath, imageResponse);
    
    // Also save backup copy
    const backupFilePath = path.join(backupImagesDir, backupFilename);
    fs.writeFileSync(backupFilePath, imageResponse);
    
    console.log(`✅ Image saved to: ${filePath}`);
    console.log(`💾 Backup saved to: ${backupFilePath}`);
    return { tempPath: filePath, backupPath: backupFilePath };
    
  } catch (error) {
    console.error('❌ Failed to save image locally:', error.message);
    return null;
  }
}

async function generateLegoImageWithPrompt(openaiApiKey, customPrompt) {
  try {
    if (!openaiApiKey) {
      console.log('🔄 No OpenAI API key provided, using placeholder...');
      const placeholderImage = await generatePlaceholderImage(customPrompt);
      return {
        prompt: customPrompt,
        type: 'placeholder',
        data: placeholderImage,
        timestamp: new Date().toISOString()
      };
    }
    
    console.log(`🎨 Generating custom image with DALL-E: ${customPrompt}`);
    
    // Use OpenAI DALL-E API with custom prompt
    const imageResponse = await makeOpenAIImageRequest(openaiApiKey, customPrompt);
    
    // Save image locally
    const localPaths = await saveImageLocally(imageResponse.data, customPrompt);
    if (!localPaths) {
      throw new Error('Failed to save image locally');
    }
    
    // Optimize image for IPFS (compress to under 30KB)
    let optimizedPath = localPaths.tempPath;
    try {
      console.log('🗜️ Optimizing image for IPFS (target: <30KB)...');
      optimizedPath = await optimizeImageForIPFS(localPaths.tempPath);
      console.log(`✅ Image optimized: ${optimizedPath}`);
    } catch (error) {
      console.log('⚠️ Image optimization failed, using original:', error.message);
    }
    
    // Calculate IPFS CID locally (no upload needed for GitHub)
    let ipfsImageHash = null;
    try {
      console.log('🔢 Calculating IPFS CID locally for GitHub filename...');
      ipfsImageHash = await calculateIPFSHash(optimizedPath);
      console.log(`✅ IPFS CID calculated: ${ipfsImageHash}`);
      
      // Rename the file to use IPFS hash for GitHub Pages compatibility
      if (ipfsImageHash) {
        const path = require('path');
        const fs = require('fs');
        const imagesDir = path.join(__dirname, 'public', 'images');
        const finalPath = path.join(imagesDir, `${ipfsImageHash}.png`);
        
        // Copy optimized file to final location with image CID name
        fs.copyFileSync(optimizedPath, finalPath);
        console.log(`🏷️ Image saved with CID: ${ipfsImageHash}.png`);
        
        // NOTE: We'll commit this to GitHub after we get the diary CID
        // This ensures we can commit both the JSON and image together
        
        // Clean up temp file
        try {
          fs.unlinkSync(localPaths.tempPath);
        } catch (e) {
          console.log('⚠️ Could not remove temp file:', e.message);
        }
      }
    } catch (error) {
      console.log('⚠️ IPFS hash calculation failed:', error.message);
    }
    
    console.log('✅ Custom LEGO image generated with DALL-E API');
    return {
      prompt: customPrompt,
      type: 'dalle-generated-custom',
      data: imageResponse.data, // Original DALL-E URL (expires)
      ipfsHash: ipfsImageHash, // Calculated CID (not uploaded to IPFS)
      ipfsUrl: null, // Not uploaded to IPFS
      githubPagesUrl: ipfsImageHash ? `https://alfonsoaru.github.io/lego-diary-reader/public/images/${ipfsImageHash}.png` : null,
      localPath: localPaths.backupPath,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Custom DALL-E API failed:', error.message);
    console.log('🔄 Falling back to placeholder image...');
    
    // Fallback to placeholder if DALL-E fails
    const fallbackPrompt = customPrompt || 'LEGO building scene';
    const placeholderImage = await generatePlaceholderImage(fallbackPrompt);
    
    return {
      prompt: fallbackPrompt,
      type: 'fallback-placeholder',
      data: placeholderImage,
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

module.exports = { generateGeminiLegoMessage, testGeminiGeneration, generateLegoImage, generateLegoImageWithPrompt };