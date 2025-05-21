// AI-Powered Home Remodeling Visualization Tool - main.js (Final Cleanup)

// Import required libraries
import { marked } from "https://cdn.jsdelivr.net/npm/marked@15.0.11/+esm";

// --- Constants ---
let IMAGE_MODEL = "gemini-2.0-flash-preview-image-generation";
let ORCHESTRATOR_MODEL = "gemini-2.5-flash-preview-04-17";

// Orchestrator System Prompt
const ORCHESTRATOR_PROMPT = `You are an AI interior designer specializing in home remodeling visualization.
Your primary goal is to help the user visualize changes to their room based on an uploaded photo and guide them through a remodeling process.

You have access to two key functions:
1. "generateImage" - Generates a modified image of a room based on specific instructions
2. "findSimilarProducts" - Finds real products that match design elements in the room, with optional image analysis to identify changed items

FUNCTION SELECTION IS CRITICAL - YOU MUST CHOOSE BASED ON USER INTENT:

Shopping/Product Intent (use findSimilarProducts):
- "Where can I buy this table?"
- "Find products similar to this chair"
- "How much would these cost?"
- "I want to purchase these items"
- "Find more like this but in bronze"
- "Shop for similar items"
- "Show me where to buy this"
- Any message about buying, purchasing, shopping, pricing, or finding similar products

Design Visualization Intent (use generateImage):
- "Change the wall color to blue"
- "Add a plant in the corner"
- "Update the furniture arrangement"
- "Make the sofa larger"
- "Remove the coffee table"
- "Show me how it looks with wood floors"
- Any message about changing, modifying, adding, or removing design elements

The user will upload photos of rooms they want to redesign. You'll help them through the process by:
1. Understanding their design preferences and goals
2. Suggesting specific changes based on their input
3. ALWAYS calling generateImage to visualize these changes (for every message with an image)
4. Refining designs through conversation
5. Using findSimilarProducts when they're ready to shop

When the user asks to purchase items or find products that match their design:
1. If they specifically mention items ("Where can I buy this lamp?"), include these items in your function call
2. If they want to shop but don't specify items ("What items did we change?" or "What can I buy?"), use the findSimilarProducts function with options.analyzeImage=true (IMPORTANT: set this to true) to automatically identify changed items
3. CRITICAL: When users ask about changes or want to see what items were modified, you MUST use the analyzeImage option

Important guidelines:
- Always maintain the room's exact dimensions, perspective, and layout in images
- Be proactive and helpful in guiding the conversation
- After showing a design, ask follow-up questions about what they might want to change
- When the user seems satisfied with a design, offer product recommendations
- Make specific, actionable suggestions rather than vague ones`;

// Image Generation System Prompt
const IMAGE_SYSTEM_PROMPT = `You are an AI interior designer specializing in home remodeling visualization.
Your primary goal is to help the user visualize changes to their room based on an uploaded photo and guide them through a remodeling process.

### Conversation Flow Guidelines
- For open-ended or general requests (like "modernize this room" or "what would look good here?"), OFFER MULTIPLE DESIGN SUGGESTIONS first
- When appropriate, present 2-4 different options with brief descriptions before generating images
- For specific, clear instructions (like "make walls blue" or "change the sofa to leather"), generate the image directly
- Recognize when the user knows exactly what they want versus when they're seeking guidance
- Adapt your approach to the user's level of specificity - be more suggestive with vague requests, more direct with specific ones

### Visual Generation Guidelines
- When the user specifically asks to see a change, generate an updated image showing that change
- ONLY modify elements the user specifically mentioned - maintain everything else about the image EXACTLY as is
- Preserve the exact room layout, dimensions, camera angle, and proportions in all generated images
- The user will ALWAYS submit the most up-to-date version of their room image with each message - modify THAT image, not an earlier version
- THIS IS THE MOST IMPORTANT PART: **NEVER change the perspective of the image, the room should be viewed from the exact same distance and angle in every iteration!**
- ALWAYS accompany images with descriptive commentary explaining your design choices and how they address the user's request
- Keep descriptions concise and focused on the specific changes made
- CRITICAL: If the user asks to "start from scratch" or mentions working with "the original room," ALWAYS generate an image with your response

### "Start from Scratch" Handling
- When the user starts a message with "Starting from the original room:" treat this as a RESET request
- For such requests, ALWAYS:
  1. Ignore all previous design iterations
  2. Apply the requested changes to the original room image
  3. Generate and include a new image in your response
  4. Explain what changes you made to the original room
- Treat these requests as high priority for image generation

### Critical Reasoning Guidelines
- Before making changes, make sure you're ONLY changing things that the user explicitly asked you to change
- Before editing an image, always think step by step and make sure that your change makes sense in the context of the room and general logic
- Don't make physically impossible changes - for example:
  * Don't hang a picture on a window
  * Don't move a window to a different wall
  * Don't make furniture float in the air
  * Don't change the fundamental architecture of the room
- Only make changes that would be realistic in a real remodeling scenario
- Keep the room functional - don't block doorways, windows, or create unusable layouts

### Conversation Style
- Be proactive and helpful in guiding the conversation
- After showing a design, always ask a specific follow-up question about what the user might want to adjust
- Provide 2-3 specific options when appropriate (e.g., "Would you prefer warmer lighting, additional plants, or different wall art?")
- As the design stabilizes, you can help identify elements that would need to be purchased
- When the user seems satisfied with the overall design, you can offer to create shopping queries for the new elements

### Product Recommendations and Visual Analysis
- When the user expresses interest in purchasing items from their design, use the findSimilarProducts function
- The function will automatically analyze the latest design image to identify what's been changed
- You do not need to specify the items manually - the function will detect them visually
- The findSimilarProducts function takes these parameters:
  * itemDescriptions: (Optional) Array of specific item descriptions to focus on (e.g., ["blue sofa", "wooden table"])
  * context: (Optional) Additional guidance for the analysis (e.g., "Focus on the living room changes")
- The visual analysis will:
  1. Compare the original room image with the latest design
  2. Identify exactly which items have been changed or added
  3. Generate optimized search queries for each changed item
  4. Find real products that match those items
- This provides a seamless way to connect the user's design with purchasable products

### Product Search through Visual Analysis
- When the user wants to find products for their design changes, use the findSimilarProducts function
- This function will automatically analyze the changes between the original image and the latest remodel, **based on the conversation history**. Pay special attention to when the user starts from scratch or references an older version.
- The function will identify exactly what items have been modified in the design based on the conversation so far (e.g., if the user asked 'make the table black and the light fixture blue' in one message and in a previous one that still refers to the same room remodel 'add a bearskin rug', the items to analyze are ONLY the new table, light fixture, and rug) and find matching products
- The simplest way to call the function is:

  findSimilarProducts({})

- If the user is asking about specific items, you can include those in the call:

  findSimilarProducts({ 
    itemDescriptions: ["blue L-shaped leather couch", "round oak coffee table with 3 legs"], 
    context: "Describe the items that were changed in the interaction so far" 
  })

- Always use this function whenever:
  * The user asks about buying or shopping for items
  * The user wants to see products related to their design
  * The user wants to know what items have changed
  * The user asks "what can I buy" or "where can I get these"

- The chat history analysis will identify exactly which items have been changed in the design (pay special attention to when the user starts from scratch or references an older version)
- It will analyze only the modified elements, not the entire room

### When to Use the Product Recommendations Function
- When the user says they love the design and want to know where to buy items
- When the user asks "where can I find this lamp?" or similar shopping questions
- When the user explicitly asks for product recommendations or shopping links
- When the design is finalized and the conversation is shifting to implementation
- When the user wants to see a shopping list of all modifications made
- DO NOT use the function prematurely - wait until the design is relatively stable or you're asked for it

### Parallel Function Calling Support
- You can make MULTIPLE separate findSimilarProducts function calls in a single response
- Use this when the user wants to search for different types of items at once
- For example, if they ask about both a "black table" and "blue chairs", make two separate parallel function calls
- Each call should focus on a different category of item to ensure specific results
- This is more efficient than combining all items in a single search
- Example of multiple calls:
  1. First call: findSimilarProducts with items similar to "round oak coffee table with 3 legs", based on the visual analysis of the items that were changed in the conversations so far
  2. Second call: findSimilarProducts with items related to "blue L-shaped leather couch", based on the visual analysis of the items that were changed in the conversations so far
  3. Third call: findSimilarProducts with items related to "black mesh office chair with headrest", based on the visual analysis of the items that were changed in the conversations so far

Always ensure your responses maintain the integrity of their original room while making the requested changes.`;

// Define functions for the orchestrator model
const ORCHESTRATOR_FUNCTION_DEFINITIONS = [
    {
        name: "generateImage",
        description: "Generate a modified image of the room based on user instructions",
        parameters: {
            type: "object",
            properties: {
                imageId: { 
                    type: "string", 
                    description: "ID of the image to modify ('original', 'latest', or a specific version number)" 
                },
                instructions: { 
                    type: "string", 
                    description: "Detailed instructions for modifications. ALWAYS maintain the exact room layout, dimensions, camera angle, and proportions in all generated images." 
                }
            },
            required: ["imageId", "instructions"]
        }
    },
    {
        name: "findSimilarProducts",
        description: "Analyze current image to identify changes and find real products matching the modified items. If specific items are known, provide them directly. If not, the system will use image analysis to identify changes.",
        parameters: {
            type: "object",
            properties: {
                itemDescriptions: {
                    type: "array",
                    description: "Specific product descriptions (e.g., 'black round table', 'blue pendant light') that have been identified in the room design, to be used for product searches",
                    items: {
                        type: "string"
                    }
                },
                context: {
                    type: "string",
                    description: "Additional context to guide the product search and analysis"
                }
            },
            required: []
        }
    }
];

// Configuration for normal image generation requests
const DEFAULT_GENERATION_CONFIG = {
    temperature: 0.0,
    topK: 32,
    topP: 0.95,
    responseModalities: ['TEXT', 'IMAGE'], // Expect both text and image responses
    stopSequences: [],
    maxOutputTokens: 15000 // Increased to allow for larger image data
};

// --- DOM Elements ---
const roomPhotoInput = document.getElementById("room-photo-input");
const uploadBtn = document.getElementById("upload-btn");
const uploadCheckmark = document.getElementById("upload-checkmark");

const chatForm = document.getElementById("chat-form");
const queryInput = document.getElementById("query-input");
const submitBtn = document.getElementById("submit-btn");
const conversationArea = document.getElementById("conversation-area");
const errorDisplay = document.getElementById("error-display");
const imagePreviewContainer = document.createElement("div");
imagePreviewContainer.className = "image-preview-container";
chatForm.insertBefore(imagePreviewContainer, submitBtn);

const remodeledImagesContainer = document.getElementById("remodeled-images-container");
const remodelPlaceholder = document.getElementById("remodel-placeholder");

// --- State Management Objects ---
/**
 * Manages all state related to images.
 */
const imageState = {
    original: null,
    remodels: [],
    pasted: null,
    selectedIndex: -1, // -1 for none, -999 for original, 0+ for remodels array

    /** @type {string | null} Gets the latest AI-generated image, or null if none. */
    get latestRemodel() { return this.remodels.length > 0 ? this.remodels[0] : null; },

    /** Sets the original uploaded image and resets dependent states. */
    setOriginalImage(imageDataUrl) {
        this.original = imageDataUrl; this.remodels = []; this.pasted = null; this.selectedIndex = -1;
        console.log("Original image set. Remodels and selection reset.");
    },
    /** Adds a new AI-generated image to the list of remodels. */
    addRemodeledImage(imageDataUrl) { this.remodels.unshift(imageDataUrl); console.log("New remodeled image added."); },
    /** Stores base64 data of a pasted image. */
    setPastedImage(imageDataUrl) { this.pasted = imageDataUrl; console.log("Pasted image data stored."); },
    /** Clears any stored pasted image data. */
    clearPastedImage() { this.pasted = null; console.log("Pasted image data cleared."); },
    /** Sets the index of the currently selected image for editing. Toggles off if same index is provided. */
    setSelectedIndex(index) { this.selectedIndex = this.selectedIndex === index ? -1 : index; console.log("Selected image index set to:", this.selectedIndex); },
    /** Resets any active image selection. */
    resetSelection() { this.selectedIndex = -1; console.log("Image selection reset."); },

    /** Determines the current image to be sent to the API. */
    getImageDataForApi() {
        if (this.pasted) return this.pasted;
        if (this.selectedIndex === -999) return this.original; // -999 for original image
        if (this.selectedIndex !== -1 && this.remodels[this.selectedIndex]) return this.remodels[this.selectedIndex];
        return this.latestRemodel || this.original; // Fallback to latest remodel, then original
    },
    /** Gets the image that should be displayed inline with the user's message in chat for context. */
    getImageToAttachToUserMessageInChat() {
        if (this.pasted) return this.pasted;
        if (this.selectedIndex === -999) return this.original;
        if (this.selectedIndex !== -1 && this.remodels[this.selectedIndex]) return this.remodels[this.selectedIndex];
        return this.latestRemodel; // Show latest remodel as context if no specific selection
    }
};

/**
 * Manages the conversation history.
 */
const conversationManager = {
    history: [],
    /** Adds a message to the conversation history. */
    addMessage(role, content, imageDetails = {}) {
        this.history.push({ role, content, timestamp: new Date().toISOString(), ...imageDetails });
        console.log(`${role} message added to history.`);
    },
    /** Formats history for the Gemini API. */
    getFormattedHistoryForApi(isStartingFresh) {
        const formattedHistory = [];
        // Exclude the current user query (last message) if not starting fresh
        const historyToProcess = isStartingFresh ? [] : this.history.slice(0, -1);
        console.log(`Including ${historyToProcess.length} previous exchanges in API context (isStartingFresh: ${isStartingFresh}).`);

        for (const message of historyToProcess) {
            const messageParts = [];
            if (message.content) messageParts.push({ text: message.content });

            const imageDataSource = message.role === "user" ? message.inlineImage : message.image;
            if (imageDataSource) {
                const base64Data = imageDataSource.replace(/^data:image\/[a-z]+;base64,/, "");
                const imgMimeType = imageDataSource.match(/^data:(image\/[a-z]+);base64,/)?.[1] || 'image/jpeg';
                messageParts.push({ inline_data: { mime_type: imgMimeType, data: base64Data } });
            }
            if (messageParts.length > 0) formattedHistory.push({ role: message.role === "user" ? "user" : "model", parts: messageParts });
        }
        return formattedHistory;
    },
    /** Clears all messages from the history. */
    resetHistory() { this.history = []; console.log("Conversation history reset."); }
};

// --- UI Initialization Functions ---
function displayWelcomeMessage() {
    conversationArea.innerHTML = '';
    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = 'welcome-message';
    welcomeDiv.innerHTML = `
        <h2>Welcome to the AI Home Design Studio!</h2>
        <p>Upload a photo of your room and start your remodeling journey. The AI will guide you through the process:</p>
        <ol style="text-align:left; margin-top:15px; padding-left:20px;">
            <li>First, describe your style preferences or changes you'd like</li>
            <li>The AI will offer multiple design suggestions</li>
            <li>Choose an option to see it visualized</li>
            <li>Refine the design through conversation until you're satisfied</li>
            <li>Get shopping queries to find similar products online</li>
        </ol>
        <p class="example-query"><strong>Example:</strong> "Give this room a cozy, rustic feel with natural wood elements."</p>
    `;
    conversationArea.appendChild(welcomeDiv);
    remodelPlaceholder.style.display = 'block';
    remodeledImagesContainer.innerHTML = '';
}

function clearWelcomeMessage() {
    const welcomeMsg = conversationArea.querySelector('.welcome-message');
    if (welcomeMsg) welcomeMsg.remove();
}

// --- File Upload & Paste Logic ---
uploadBtn.addEventListener('click', () => roomPhotoInput.click());

function handlePastedOrDroppedImage(imageData) {
    imagePreviewContainer.innerHTML = ''; // Clear previous preview
    imagePreviewContainer.classList.add('active');
    const img = document.createElement('img');
    img.src = imageData;
    imagePreviewContainer.appendChild(img);
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-image';
    removeBtn.innerHTML = '✕'; // Close icon
    removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        clearPastedImagePreview();
    });
    imagePreviewContainer.appendChild(removeBtn);
    imageState.setPastedImage(imageData); // Update state
}

function clearPastedImagePreview() {
    imagePreviewContainer.innerHTML = '';
    imagePreviewContainer.classList.remove('active');
    imageState.clearPastedImage(); // Update state
}

queryInput.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            if (blob) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (event.target?.result) handlePastedOrDroppedImage(event.target.result.toString());
                };
                reader.readAsDataURL(blob);
            }
        }
    }
});

queryInput.addEventListener('dragover', (e) => { e.preventDefault(); queryInput.classList.add('drag-over'); });
queryInput.addEventListener('dragleave', () => queryInput.classList.remove('drag-over'));
queryInput.addEventListener('drop', (e) => {
    e.preventDefault();
    queryInput.classList.remove('drag-over');
    if (e.dataTransfer?.files?.[0]) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) handlePastedOrDroppedImage(event.target.result.toString());
            };
            reader.readAsDataURL(file);
        }
    }
});

roomPhotoInput.addEventListener("change", (event) => {
    const file = (event.target).files?.[0];
    if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageDataUrl = e.target?.result?.toString() || null;
            if (imageDataUrl) {
                imageState.setOriginalImage(imageDataUrl);
                uploadCheckmark.style.display = "inline";
                setTimeout(() => { uploadCheckmark.style.display = "none"; }, 3000);
                errorDisplay.textContent = "";
                clearWelcomeMessage();
                renderRemodeledImages();
                queryInput.disabled = false;
                submitBtn.disabled = false;
            } else {
                errorDisplay.textContent = "Could not read the image file.";
            }
        };
        reader.onerror = () => {
            console.error("Error reading file:", reader.error);
            errorDisplay.textContent = "Error loading the image file.";
            imageState.setOriginalImage(null);
        };
        reader.readAsDataURL(file);
    } else {
        errorDisplay.textContent = "Please select a valid image file (e.g., JPG, PNG).";
        roomPhotoInput.value = ''; // Reset file input
    }
});

// --- Image Display & Selection Logic ---
function renderRemodeledImages() {
    remodeledImagesContainer.innerHTML = ''; // Clear existing images
    if (imageState.original) {
        const originalItemDiv = document.createElement('div');
        originalItemDiv.className = 'remodeled-image-item image-wrapper';
        if (imageState.selectedIndex === -999) originalItemDiv.classList.add('selected-for-edit');
        originalItemDiv.innerHTML = `
            <div class="image-header">
                <h4>Original Room</h4>
                <button type="button" class="select-for-edit-btn start-fresh-btn" data-index="-999">
                    ${imageState.selectedIndex === -999 ? '✓ Selected' : 'Start from Scratch'}
                </button>
            </div>
            <img src="${imageState.original}" alt="Original room">
        `;
        remodeledImagesContainer.appendChild(originalItemDiv);
        originalItemDiv.querySelector('.select-for-edit-btn')?.addEventListener('click', () => selectImageForEditing(-999));
    }

    if (imageState.remodels.length > 0) {
        remodelPlaceholder.style.display = 'none';
        imageState.remodels.forEach((imageData, index) => {
            const versionNumber = imageState.remodels.length - index;
            const itemDiv = document.createElement('div');
            itemDiv.className = 'remodeled-image-item image-wrapper';
            if (imageState.selectedIndex === index) itemDiv.classList.add('selected-for-edit');
            itemDiv.innerHTML = `
                <div class="image-header">
                    <h4>Design Version ${versionNumber}</h4>
                    <button type="button" class="select-for-edit-btn" data-index="${index}">
                        ${imageState.selectedIndex === index ? '✓ Selected' : 'Edit This Design'}
                    </button>
                </div>
                <img src="${imageData}" alt="Design version ${versionNumber}">
            `;
            remodeledImagesContainer.appendChild(itemDiv);
            itemDiv.querySelector('.select-for-edit-btn')?.addEventListener('click', function() {
                selectImageForEditing(parseInt(this.getAttribute('data-index')));
            });
        });
    } else if (!imageState.original) { // Only show placeholder if no original image and no designs
        remodelPlaceholder.style.display = 'block';
    }
}

function selectImageForEditing(index) {
    imageState.setSelectedIndex(index);
    renderRemodeledImages(); // Re-render to update UI based on new selection

    queryInput.classList.remove('with-selected-image', 'with-original-image'); // Reset classes
    if (imageState.selectedIndex === -999) {
        queryInput.placeholder = "Describe changes to the original room...";
        queryInput.classList.add('with-selected-image', 'with-original-image');
    } else if (imageState.selectedIndex !== -1) {
        queryInput.placeholder = "Describe changes to the selected design...";
        queryInput.classList.add('with-selected-image');
    } else {
        queryInput.placeholder = "Describe your vision...";
    }
}

// --- Gemini API Interaction ---
async function fetchApiKeys() {
    console.log("Fetching API keys from server...");
    const keyResponse = await fetch('/api/gemini-key');
    if (!keyResponse.ok) {
        const errorText = await keyResponse.text();
        console.error("Failed to get Gemini API key from server:", errorText);
        throw new Error(`Server error fetching API key (${keyResponse.status}).`);
    }
    const { apiKey, imageModelId, orchestratorModelId } = await keyResponse.json();
    if (!apiKey) {
        throw new Error("No Gemini API key returned from server. Ensure it's configured.");
    }
    
    // Update global model variables if provided by server
    if (imageModelId) IMAGE_MODEL = imageModelId;
    if (orchestratorModelId) ORCHESTRATOR_MODEL = orchestratorModelId;
    
    console.log(`Using models - Orchestrator: ${ORCHESTRATOR_MODEL}, Image Generation: ${IMAGE_MODEL}`);
    
    return apiKey;
}

// Build image generation request for the specialized image model
function buildImageGenerationRequestBody(imageData, instructions) {
    const parts = [];
    parts.push({ text: IMAGE_SYSTEM_PROMPT + "\n\n" }); // System prompt for image generation
    
    // Add image data
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, "");
    const imgMimeType = imageData.match(/^data:(image\/[a-z]+);base64,/)?.[1] || 'image/jpeg';
    parts.push({ inline_data: { mime_type: imgMimeType, data: base64Data } });
    
    // Add specific instructions with directives for image consistency
    const enhancedInstructions = instructions + 
        "\n\n[IMPORTANT: Maintain the EXACT SAME camera angle and distance in your generated image. " +
        "Do not alter the room layout, dimensions, or perspective.]";
    
    parts.push({ text: enhancedInstructions });
    
    return {
        contents: [{ parts: parts, role: "user" }],
        generationConfig: {
            temperature: 0.0,
            topK: 32, 
            topP: 0.95,
            responseModalities: ['TEXT', 'IMAGE'],
            maxOutputTokens: 15000
        }
    };
}

// Build orchestrator request with conversation history and current user message
function buildOrchestratorRequestBody(formattedHistory, userMessage, currentImage = null) {
    const currentMessageParts = [];
    
    // Add the system prompt for the orchestrator
    currentMessageParts.push({ text: ORCHESTRATOR_PROMPT });
    
    // Add user message text
    currentMessageParts.push({ text: userMessage });
    
    // Flag to track if an image is included in this message
    let imageIncluded = false;
    
    // Add image to the message if provided
    if (currentImage) {
        imageIncluded = true;
        const base64Data = currentImage.replace(/^data:image\/[a-z]+;base64,/, "");
        const imgMimeType = currentImage.match(/^data:(image\/[a-z]+);base64,/)?.[1] || 'image/jpeg';
        currentMessageParts.push({ inline_data: { mime_type: imgMimeType, data: base64Data } });
    }
    
    // Check if this is likely a purchase/product search request
    const isPurchaseRequest = 
        userMessage.toLowerCase().includes("buy") || 
        userMessage.toLowerCase().includes("purchase") ||
        userMessage.toLowerCase().includes("find similar product") ||
        userMessage.toLowerCase().includes("find more like") ||
        userMessage.toLowerCase().includes("shop") ||
        userMessage.toLowerCase().includes("where can i get") ||
        userMessage.toLowerCase().includes("how much") ||
        userMessage.toLowerCase().includes("cost") ||
        userMessage.toLowerCase().includes("price");
        
    // For non-purchase requests with images, gently suggest image generation
    if (imageIncluded && !isPurchaseRequest) {
        // Only if it seems like a design request, suggest image generation
        if (userMessage.toLowerCase().includes("change") || 
            userMessage.toLowerCase().includes("update") ||
            userMessage.toLowerCase().includes("modify") ||
            userMessage.toLowerCase().includes("redesign") ||
            userMessage.toLowerCase().includes("make it") ||
            userMessage.toLowerCase().includes("add") ||
            userMessage.toLowerCase().includes("remove")) {
            
            currentMessageParts.push({ 
                text: "\n\nI'd like to see a visualization if my request is about changing the room design."
            });
        }
    }
    
    // Log the function definitions being sent
    console.log("Sending function definitions:", JSON.stringify(ORCHESTRATOR_FUNCTION_DEFINITIONS));
    
    // Create a fresh copy of the function definitions to avoid any caching issues
    const functionDefinitions = JSON.parse(JSON.stringify(ORCHESTRATOR_FUNCTION_DEFINITIONS));
    
    // For purchase requests, add a stronger hint to use findSimilarProducts
    if (isPurchaseRequest) {
        // Add at the end of the message for recency bias
        currentMessageParts.push({
            text: "\n\nCRITICAL INSTRUCTION: Please DO NOT generate an image for this message. " +
                  "Since I'm asking about products/shopping, use the findSimilarProducts function instead."
        });
    }
    
    return {
        contents: [...formattedHistory, { parts: currentMessageParts, role: "user" }],
        tools: [{ function_declarations: functionDefinitions }],
        generationConfig: {
            temperature: 0.0,
            topK: 32,
            topP: 0.95,
            maxOutputTokens: 15000
        }
    };
}

// Format conversation history for the orchestrator model
function formatHistoryForOrchestrator(history) {
    const formattedHistory = [];
    
    // Process each message in history
    for (let i = 0; i < history.length; i++) {
        const message = history[i];
        const messageParts = [];
        
        // Add text content for all messages
        if (message.content) messageParts.push({ text: message.content });
        
        // Check if message has an associated image
        const imageData = message.role === "user" ? message.inlineImage : message.image;
        if (imageData) {
            const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, "");
            const imgMimeType = imageData.match(/^data:(image\/[a-z]+);base64,/)?.[1] || 'image/jpeg';
            messageParts.push({ inline_data: { mime_type: imgMimeType, data: base64Data } });
        }
        
        // Add if message has parts
        if (messageParts.length > 0) {
            formattedHistory.push({
                role: message.role === "user" ? "user" : "model",
                parts: messageParts
            });
        }
    }
    
    return formattedHistory;
}

// Parse responses from the image generation model
function parseImageModelResponse(responseData) {
    const result = { text: "", image: null };
    console.log("Parsing image model response");
    
    // Extract text and images from parts
    if (responseData.candidates?.[0]?.content?.parts) {
        responseData.candidates[0].content.parts.forEach(part => {
            if (part.text) result.text += part.text;
            if (part.inlineData?.data) {
                result.image = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        });
    }
    
    // Fallback for images potentially in markdown links
    if (!result.image && result.text) {
        const markdownImageRegex = /!\[.*?\]\((data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+)\)/g;
        const matches = [...result.text.matchAll(markdownImageRegex)];
        if (matches.length > 0 && matches[0]?.[1]) result.image = matches[0][1];
    }
    
    return result;
}

// Parse responses from the orchestrator model
function parseOrchestratorResponse(responseData) {
    const result = { text: "", functionCalls: [] };
    console.log("Parsing orchestrator response:", JSON.stringify(responseData).substring(0, 300) + "...");
    
    // Extract text from parts
    if (responseData.candidates?.[0]?.content?.parts) {
        responseData.candidates[0].content.parts.forEach(part => {
            if (part.text) result.text += part.text;
            
            // Check for function call in the part
            if (part.functionCall) {
                console.log("Function call found in part:", part.functionCall.name);
                try {
                    const parsedArgs = typeof part.functionCall.args === 'string' ? 
                        JSON.parse(part.functionCall.args) : part.functionCall.args;
                    
                    result.functionCalls.push({
                        name: part.functionCall.name,
                        args: parsedArgs
                    });
                } catch (e) {
                    console.error("Error parsing function args in part:", e);
                    result.functionCalls.push({
                        name: part.functionCall.name,
                        args: part.functionCall.args
                    });
                }
            }
        });
    }
    
    // Extract function calls from the response (alternate format)
    if (responseData.candidates?.[0]?.content?.functionCalls) {
        const functionCalls = responseData.candidates[0].content.functionCalls;
        console.log("Function calls detected in content.functionCalls:", functionCalls.length);
        
        functionCalls.forEach(call => {
            let parsedArgs;
            try {
                // Parse function arguments if they're in string format
                parsedArgs = typeof call.args === 'string' ? 
                    JSON.parse(call.args) : call.args;
            } catch (e) {
                console.error("Error parsing function args:", e);
                parsedArgs = call.args;
            }
            
            result.functionCalls.push({
                name: call.name,
                args: parsedArgs
            });
        });
    }
    
    return result;
}

// Call the orchestrator model with the current conversation context
async function callOrchestratorModel(userMessage, conversationHistory, currentImage = null) {
    try {
        console.log("Calling orchestrator model...");
        const apiKey = await fetchApiKeys();
        
        // Format the conversation history for the orchestrator
        const formattedHistory = formatHistoryForOrchestrator(conversationHistory);
        
        // Build the request body
        const requestBody = buildOrchestratorRequestBody(formattedHistory, userMessage, currentImage);
        
        // Log the full request for debugging
        console.log("Orchestrator API request:", JSON.stringify({
            ...requestBody,
            contents: "[[CONTENTS ABBREVIATED]]" // Don't log full contents with images
        }));
        
        // Call the Gemini API with the orchestrator model
        const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${ORCHESTRATOR_MODEL}:generateContent?key=${apiKey}`;
        
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: { message: "Unknown API error." } }));
            throw new Error(`Orchestrator API Error (${response.status}): ${errorData.error?.message || "Request failed"}`);
        }
        
        const responseData = await response.json();
        
        // If we sent an image but didn't get any function calls, try a second attempt with explicit instructions
        if (currentImage && 
            (!responseData?.candidates?.[0]?.content?.functionCalls || 
             responseData.candidates[0].content.functionCalls.length === 0) &&
            (!responseData?.candidates?.[0]?.content?.parts?.some(p => p.functionCall))) {
            
            console.log("WARNING: First attempt didn't return function calls with image. Trying backup approach...");
            
            // Create a modified request with stronger instructions in the message
            const backupParts = [...requestBody.contents[requestBody.contents.length - 1].parts];
            
            // Add very explicit instructions as the last part
            backupParts.push({ 
                text: "\n\nCRITICAL: You MUST use the generateImage function to generate an image based on my request. This is required and not optional. Call the generateImage function with 'instructions' containing my request and 'imageId' set to 'original' or 'latest'."
            });
            
            const backupContents = [...requestBody.contents.slice(0, -1), {
                role: "user",
                parts: backupParts
            }];
            
            const backupRequest = {
                ...requestBody,
                contents: backupContents,
                generationConfig: {
                    ...requestBody.generationConfig,
                    temperature: 0.1 // Slight change to temperature 
                }
            };
            
            console.log("Backup request:", JSON.stringify({
                ...backupRequest,
                contents: "[[CONTENTS ABBREVIATED]]" // Don't log full contents with images
            }));
            
            // Try again with the modified request
            const backupResponse = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(backupRequest)
            });
            
            if (backupResponse.ok) {
                const backupResponseData = await backupResponse.json();
                // Only use backup if it contains function calls
                if ((backupResponseData?.candidates?.[0]?.content?.functionCalls?.length > 0) ||
                    (backupResponseData?.candidates?.[0]?.content?.parts?.some(p => p.functionCall))) {
                    console.log("Backup approach successful! Using backup response.");
                    return parseOrchestratorResponse(backupResponseData);
                } else {
                    console.log("Backup approach also failed to generate function calls.");
                    
                    // Last resort: Call the image generation model directly
                    try {
                        console.log("Attempting final fallback: Direct call to image generation model");
                        
                        // Extract the user's message text
                        const userText = backupParts.find(part => part.text && !part.text.includes("CRITICAL"))?.text || userMessage;
                        
                        // Call the image generation model directly
                        const imageResult = await callImageGenerationModel(currentImage, userText);
                        
                        if (imageResult.image) {
                            console.log("Direct image generation successful!");
                            
                            // Create synthetic function call response
                            return {
                                text: responseData.candidates?.[0]?.content?.parts?.find(p => p.text)?.text || 
                                      "Here's the visualization based on your request:",
                                functionCalls: [{
                                    name: "generateImage",
                                    args: {
                                        imageId: "original",
                                        instructions: userText
                                    },
                                    result: imageResult
                                }]
                            };
                        }
                    } catch (directError) {
                        console.error("Direct image generation also failed:", directError);
                    }
                }
            } else {
                console.log("Backup request failed with status:", backupResponse.status);
                
                // Try direct image generation here too if the backup request failed
                try {
                    console.log("Attempting final fallback after backup request failure");
                    const imageResult = await callImageGenerationModel(currentImage, userMessage);
                    
                    if (imageResult.image) {
                        console.log("Direct image generation successful!");
                        return {
                            text: responseData.candidates?.[0]?.content?.parts?.find(p => p.text)?.text || 
                                  "Here's the visualization based on your request:",
                            functionCalls: [{
                                name: "generateImage",
                                args: {
                                    imageId: "original",
                                    instructions: userMessage
                                },
                                result: imageResult
                            }]
                        };
                    }
                } catch (directError) {
                    console.error("Direct image generation also failed:", directError);
                }
            }
        }
        
        return parseOrchestratorResponse(responseData);
    } catch (error) {
        console.error("Error calling orchestrator model:", error);
        throw error;
    }
}

// Call the image generation model with specific instructions
async function callImageGenerationModel(imageData, instructions) {
    try {
        console.log("Calling image generation model...");
        const apiKey = await fetchApiKeys();
        
        // Build the request body for image generation
        const requestBody = buildImageGenerationRequestBody(imageData, instructions);
        
        // Call the Gemini API with the image generation model
        const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${apiKey}`;
        
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: { message: "Unknown API error." } }));
            throw new Error(`Image Generation API Error (${response.status}): ${errorData.error?.message || "Request failed"}`);
        }
        
        const responseData = await response.json();
        return parseImageModelResponse(responseData);
    } catch (error) {
        console.error("Error calling image generation model:", error);
        throw error;
    }
}

// Function handlers for orchestrator model functions
const functionHandlers = {
    // Handler for generateImage function
    async generateImage(args) {
        console.log("Handling generateImage function call:", args);
        
        // Get the image data based on imageId
        let imageToModify;
        
        if (args.imageId === "original") {
            imageToModify = imageState.original;
            console.log("Using original image for modification");
        } else if (args.imageId === "latest") {
            imageToModify = imageState.latestRemodel || imageState.original;
            console.log("Using latest remodeled image for modification");
        } else {
            // Try to parse as a version number
            const versionIndex = parseInt(args.imageId);
            if (!isNaN(versionIndex) && versionIndex >= 0 && versionIndex < imageState.remodels.length) {
                imageToModify = imageState.remodels[versionIndex];
                console.log(`Using specific remodel version ${versionIndex} for modification`);
            } else {
                // Default to latest if not found
                imageToModify = imageState.latestRemodel || imageState.original;
                console.log("Invalid imageId, using latest available image");
            }
        }
        
        if (!imageToModify) {
            throw new Error("No image available to modify. Please upload an image first.");
        }
        
        // Call the image generation model with the image and instructions
        const result = await callImageGenerationModel(imageToModify, args.instructions);
        
        // If an image was generated, add it to the remodels collection
        if (result.image) {
            imageState.addRemodeledImage(result.image);
            renderRemodeledImages();
        }
        
        return {
            text: result.text,
            image: result.image
        };
    },
    
    // Handler for findSimilarProducts function
    async findSimilarProducts(args) {
        console.log("Handling findSimilarProducts function call:", args);
        
        // Extract any specific item descriptions the user is looking for
        const itemDescriptions = args.itemDescriptions || [];
        const context = args.context || "Focus on furniture and decor items that have been changed in the room design";
        
        // Verify we have images to analyze
        if (!imageState.latestRemodel || !imageState.original) {
            throw new Error("Need both original and modified room images for analysis.");
        }
        
        // Add loading message
        addMessageToConversation("Analyzing your design to identify changed items...", "ai", true);
        
        try {
            // Always analyze the latest remodel with the original for comparison
            let analysisContext = context;
            
            // If specific item descriptions were provided, include them in the context
            if (itemDescriptions && itemDescriptions.length > 0) {
                analysisContext = `${context}. Specifically look for these items: ${itemDescriptions.join(', ')}`;
            }
            
            // Perform the image analysis
            console.log("Analyzing image with context:", analysisContext);
            const analyzedItems = await analyzeImageForProducts(
                imageState.latestRemodel,
                'room',
                analysisContext,
                imageState.original
            );
            
            if (!analyzedItems || analyzedItems.length === 0) {
                conversationArea.querySelectorAll('.loading-message').forEach(msg => msg.remove());
                throw new Error("No changes were detected in the room design.");
            }
            
            // Log the results
            console.log(`Image analysis produced ${analyzedItems.length} items:`, analyzedItems);
            
            // Remove loading message
            conversationArea.querySelectorAll('.loading-message').forEach(msg => msg.remove());
            
            // Add analysis results message
            const itemNames = analyzedItems.map(item => item.name).join(', ');
            addMessageToConversation(
                `I've identified these changed items in your design: ${itemNames}. Let me find similar products you can purchase.`,
                "ai"
            );
            conversationManager.addMessage(
                "assistant", 
                `I've identified these changed items in your design: ${itemNames}. Let me find similar products you can purchase.`
            );
            
            // Call the Vetted API to find similar products for the analyzed items
            await findProductsWithVettedApi(analyzedItems);
            
            return {
                text: `Found product recommendations for ${analyzedItems.length} items.`
            };
        } catch (error) {
            conversationArea.querySelectorAll('.loading-message').forEach(msg => msg.remove());
            console.error("Error analyzing image for changes:", error);
            throw new Error(`Could not analyze room design: ${error.message}`);
        }
        
        // Call the Vetted API to find similar products
        await findProductsWithVettedApi(items);
        
        return {
            text: `Found product recommendations for ${items.length} items.`
        };
    }
};

// Main function to process a user query with the orchestrator model
async function processQueryWithOrchestrator(userText, currentImage) {
    try {
        console.log("Processing query with orchestrator model");
        
        // Make sure we have at least an image context if needed
        if (!currentImage && !imageState.original) {
            throw new Error("Please upload a room photo first.");
        }
        
        // Add a simple loading message
        addMessageToConversation("Processing your request...", "ai", true);
        
        // Call the orchestrator model
        const orchestratorResponse = await callOrchestratorModel(
            userText, 
            conversationManager.history,
            currentImage
        );
        
        console.log("Orchestrator response:", orchestratorResponse);
        
        // Process any function calls
        let functionResults = [];
        if (orchestratorResponse.functionCalls && orchestratorResponse.functionCalls.length > 0) {
            // Group function calls by type for better handling
            const generateImageCalls = [];
            const findProductsCalls = [];
            
            // Sort function calls by type
            for (const functionCall of orchestratorResponse.functionCalls) {
                if (functionCall.name === 'generateImage') {
                    generateImageCalls.push(functionCall);
                } else if (functionCall.name === 'findSimilarProducts') {
                    // Always ensure correct format for findSimilarProducts
                    // The new simplified function definition doesn't require specific formats
                    const context = functionCall.args?.context || 
                                 "Identify items that have been changed in the room design";
                    
                    // Extract any specific item descriptions that might be in various formats
                    let itemDescriptions = [];
                    
                    if (Array.isArray(functionCall.args)) {
                        // If it's just an array, assume those are the item descriptions
                        itemDescriptions = functionCall.args.map(item => {
                            if (typeof item === 'string') return item;
                            if (typeof item === 'object' && item.name) return item.name;
                            return JSON.stringify(item);
                        });
                    } else if (functionCall.args?.items && Array.isArray(functionCall.args.items)) {
                        // Handle items as an array of objects
                        itemDescriptions = functionCall.args.items.map(item => {
                            if (typeof item === 'string') return item;
                            if (typeof item === 'object' && item.name) return item.name;
                            return JSON.stringify(item);
                        });
                    } else if (functionCall.args?.itemDescriptions && Array.isArray(functionCall.args.itemDescriptions)) {
                        // Already in the right format
                        itemDescriptions = functionCall.args.itemDescriptions;
                    }
                    
                    // Create standard format
                    const fixedArgs = {
                        itemDescriptions: itemDescriptions,
                        context: context
                    };
                    
                    // Replace the args with our standardized version
                    functionCall.args = fixedArgs;
                    console.log("Standardized function call args:", functionCall.args);
                    
                    findProductsCalls.push(functionCall);
                } else {
                    console.error(`Unknown function: ${functionCall.name}`);
                }
            }
            
            console.log(`Processing function calls: ${generateImageCalls.length} image generation and ${findProductsCalls.length} product searches`);
            
            // Execute generateImage calls first (usually just one, but could be multiple in future)
            for (const generateImageCall of generateImageCalls) {
                try {
                    console.log(`Executing image generation function`);
                    addMessageToConversation(`Processing image generation...`, "ai", true);
                    
                    const result = await functionHandlers.generateImage(generateImageCall.args);
                    functionResults.push({
                        name: 'generateImage',
                        result: result
                    });
                } catch (error) {
                    console.error(`Error executing generateImage function:`, error);
                    functionResults.push({
                        name: 'generateImage',
                        error: error.message
                    });
                }
            }
            
            // Execute findSimilarProducts calls in parallel (if multiple)
            if (findProductsCalls.length > 0) {
                addMessageToConversation(`Processing product search${findProductsCalls.length > 1 ? 'es' : ''}...`, "ai", true);
                
                // Create an array of promises for all product searches
                const productSearchPromises = findProductsCalls.map(async (findProductsCall) => {
                    try {
                        // Check if this is an image analysis request
                        const isImageAnalysis = findProductsCall.args.options?.analyzeImage === true;
                        const itemCount = findProductsCall.args.items?.length || 0;
                        
                        if (isImageAnalysis) {
                            console.log(`Executing product search with image analysis (${itemCount} initial items, will be augmented with analysis)`);
                            console.log(`Analysis context: ${findProductsCall.args.options?.context || "No specific context provided"}`);
                        } else {
                            console.log(`Executing product search function for ${itemCount} items (no image analysis)`);
                        }
                        
                        const result = await functionHandlers.findSimilarProducts(findProductsCall.args);
                        return {
                            name: 'findSimilarProducts',
                            result: result
                        };
                    } catch (error) {
                        console.error(`Error executing findSimilarProducts function:`, error);
                        return {
                            name: 'findSimilarProducts',
                            error: error.message
                        };
                    }
                });
                
                // Execute all product searches in parallel
                const productResults = await Promise.all(productSearchPromises);
                functionResults.push(...productResults);
            }
        }
        
        // Remove loading messages
        conversationArea.querySelectorAll('.loading-message').forEach(msg => msg.remove());
        
        // Add the orchestrator's text response to the conversation
        if (orchestratorResponse.text) {
            addMessageToConversation(orchestratorResponse.text, "ai");
            conversationManager.addMessage("assistant", orchestratorResponse.text);
        }
        
        // Handle function results (like showing generated images)
        for (const result of functionResults) {
            if (result.name === "generateImage" && result.result?.image) {
                // Image was already added to state in the handler
                // Just add the explanation text if any
                if (result.result.text) {
                    addMessageToConversation(result.result.text, "ai");
                    conversationManager.addMessage("assistant", result.result.text, { image: result.result.image });
                }
            }
        }
        
        return {
            text: orchestratorResponse.text,
            functionResults: functionResults
        };
    } catch (error) {
        console.error("Error in processQueryWithOrchestrator:", error);
        throw error;
    }
}

// --- Chat Form Submission & Response Handling ---
function validateChatInputs(currentUserText) {
    // Always require text input
    if (!currentUserText) {
        errorDisplay.textContent = "Please enter a message.";
        setTimeout(() => { errorDisplay.textContent = ""; }, 3000);
        return false;
    }
    
    // Check if this is a product search query that doesn't need an image
    const isProductSearchQuery = 
        currentUserText.toLowerCase().includes("find more products") || 
        currentUserText.toLowerCase().includes("search for similar") ||
        currentUserText.toLowerCase().includes("find similar products") ||
        currentUserText.toLowerCase().includes("buy") ||
        currentUserText.toLowerCase().includes("purchase") ||
        currentUserText.toLowerCase().includes("shopping") ||
        currentUserText.toLowerCase().includes("shop for") ||
        currentUserText.toLowerCase().includes("where can i get");
    
    // For non-product searches, we need an original room image
    if (!isProductSearchQuery && !imageState.original) {
        errorDisplay.textContent = "Please upload a room photo first.";
        setTimeout(() => { errorDisplay.textContent = ""; }, 3000);
        return false;
    }
    
    errorDisplay.textContent = "";
    return true;
}

function prepareUserMessageForApi(rawUserText) {
    let userTextForApi = rawUserText;
    let displayMessage = rawUserText;
    const isPasted = imageState.pasted !== null;

    if (isPasted) {
        displayMessage = "📎 " + userTextForApi;
    } else if (imageState.selectedIndex === -999) { // Using original image
        displayMessage = "🏠 " + userTextForApi;
        userTextForApi = `Starting from the original room: ${userTextForApi}`;
    } else if (imageState.selectedIndex !== -1) { // Using a selected remodel
        displayMessage = "📌 " + userTextForApi;
    } else if (imageState.latestRemodel) { // Implicitly continuing with latest remodel
        displayMessage = "🔄 " + userTextForApi;
    }
    return { userTextForApi, displayMessage, isPastedImage: isPasted };
}

function handleApiError(error) {
    console.error("API Error:", error);
    conversationArea.querySelectorAll('.loading-message').forEach(msg => msg.remove());
    addMessageToConversation(`An error occurred: ${error.message}. Please try again.`, "ai", false, true);
    conversationManager.addMessage("assistant", `Error: ${error.message}`, { isError: true });
}

chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const rawUserText = queryInput.value.trim();

    if (!validateChatInputs(rawUserText)) return;
    clearWelcomeMessage();

    const { userTextForApi, displayMessage, isPastedImage } = prepareUserMessageForApi(rawUserText);
    
    // Get image data from state
    const imageToSend = imageState.getImageDataForApi();
    
    // Always include the image in the conversation context if we have one
    const imageToAttachInChat = imageState.getImageToAttachToUserMessageInChat();
    
    // If we don't have any images yet, check if this is the first message
    if (!imageState.original && !imageState.latestRemodel && !imageState.pasted) {
        // Only require an image if we don't have one yet
        if (!imageToAttachInChat) {
            handleApiError(new Error("Please upload a room photo first."));
            return;
        }
    }

    // Add user message to conversation (with image if it's a design query)
    addMessageToConversation(displayMessage, "user", false, false, imageToAttachInChat);
    
    // Store in conversation history with image if available
    conversationManager.addMessage("user", userTextForApi, imageToAttachInChat ? { inlineImage: imageToAttachInChat } : {});

    queryInput.value = "";
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span>';

    // Determine and display initial loading message
    let loadingMessage = "Processing your request...";
    if (isPastedImage) {
        loadingMessage = "Processing your pasted image...";
    } else if (userTextForApi.startsWith("Starting from the original room:")) {
        loadingMessage = "Using your original room photo...";
    } else if (userTextForApi.toLowerCase().includes("find more products similar")) {
        loadingMessage = "Searching for similar products...";
    }
    addMessageToConversation(loadingMessage, "ai", true);

    // Clear pasted image from UI and state *after* it's been prepared for sending
    if (isPastedImage) {
        clearPastedImagePreview(); // Clears UI
        imageState.clearPastedImage(); // Clears state
    }
    
    // Reset selection state *after* its value has been used for the current query
    if (imageState.selectedIndex !== -1) {
        setTimeout(() => {
            imageState.resetSelection();
            queryInput.classList.remove('with-selected-image', 'with-original-image');
            queryInput.placeholder = "Describe your vision...";
            renderRemodeledImages();
        }, 100);
    }

    try {
        // Always send the current image context to the orchestrator
        await processQueryWithOrchestrator(userTextForApi, imageToSend);
    } catch (error) {
        handleApiError(error instanceof Error ? error : new Error(String(error)));
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = "➤";
    }
});

function addMessageToConversation(text, role, isLoading = false, isError = false, attachedImage = null) {
    clearWelcomeMessage();
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${role}-message`;
    if (isLoading) messageDiv.classList.add("loading-message");
    if (isError && role === 'ai') messageDiv.classList.add("error-message-chat");

    if (role === 'ai' && !isLoading && !isError && text) {
        messageDiv.innerHTML = marked.parse(text);
    } else {
        // For user messages, handle potential emoji prefix and escape the rest
        const userEmojiPrefixes = ['📎 ', '🏠 ', '📌 ', '🔄 '];
        let prefixFound = false;
        for (const prefix of userEmojiPrefixes) {
            if (text.startsWith(prefix)) {
                // Using createTextNode ensures text part is treated as text, not HTML
                const textNode = document.createTextNode(text.substring(prefix.length));
                messageDiv.appendChild(document.createTextNode(prefix)); // Add prefix as text
                messageDiv.appendChild(textNode); // Add escaped user text
                prefixFound = true;
                break;
            }
        }
        if (!prefixFound) messageDiv.textContent = text; // Default to textContent for safety
    }

    if (attachedImage) {
        const imgElement = document.createElement('img');
        imgElement.src = attachedImage;
        imgElement.className = 'inline-message-image';
        imgElement.alt = 'Attached image context';
        messageDiv.appendChild(document.createElement('br'));
        messageDiv.appendChild(imgElement);
    }
    conversationArea.appendChild(messageDiv);
    conversationArea.scrollTop = conversationArea.scrollHeight; // Auto-scroll
}

// --- Image Analysis and Product Search ---

/**
 * Analyzes an image using the Gemini vision model to extract detailed descriptions
 * @param {string} imageData - Base64 encoded image data
 * @param {string} analysisType - Type of analysis: 'product' or 'room'
 * @param {string} context - Additional context for the analysis
 * @param {string} originalImageData - Optional original image data for comparison
 * @returns {Promise<Array>} - Array of item descriptions
 */
async function analyzeImageForProducts(imageData, analysisType = 'room', context = '', originalImageData = null) {
    try {
        console.log(`Starting image analysis for ${analysisType} with context: ${context.substring(0, 50)}...`);
        
        // Determine the appropriate prompt based on analysis type
        let analysisPrompt = '';
        if (analysisType === 'product') {
            analysisPrompt = `
                You are a visual product analyzer specialized in home furnishings and decor.
                
                *** RESPONSE FORMAT INSTRUCTIONS ***
                Please respond with a detailed description of the product, focusing on providing specific details that would help find similar items.
                
                Include these details:
                - Name: A specific name with details (e.g., "Mid-Century Modern Black Round Dining Table")
                - Description: Include color, material, style, and distinctive features
                - Shopping Query: A detailed search query to find similar products online
                
                Format your response as:
                
                Product Name: Black Wooden Dining Table
                Description: Modern black round dining table with metal legs and a smooth surface, featuring mid-century design elements with tapered legs.
                Shopping Query: modern black round wooden dining table metal legs mid-century
                
                *** ANALYSIS INSTRUCTIONS ***
                Please analyze this product image in detail and provide a rich description of:
                
                1. The product type (e.g., chair, table, lamp)
                2. The material(s) it's made from
                3. The color and finish
                4. The style (e.g., modern, traditional, mid-century)
                5. Any distinctive design features
                6. The approximate size/dimensions if apparent
                
                For each identified product, provide in your JSON:
                - "name": A specific name for the item (e.g., "Black Wooden Dining Table")
                - "description": Detailed description including color, material, style and distinctive features
                - "google_shopping_query": A specific search query that would find similar real-world products
                
                REMEMBER: Focus on providing specific, detailed information that would help find similar products.
                
                Additional context: ${context}
            `;
        } else { // room analysis
            analysisPrompt = `
                You are a visual design analyzer specialized in interior design and home furnishings.
                
                *** RESPONSE FORMAT INSTRUCTIONS ***
                Please respond with a detailed description of each item, focusing on providing specific details that would help find similar products.
                
                For each item mentioned in the context, provide:
                - Name: A specific name with details (e.g., "Mid-Century Modern Black Round Dining Table")
                - Description: Include color, material, style, and distinctive features
                - Shopping Query: A detailed search query to find similar products online
                
                Format your response as a list with clear item separations. For example:
                
                Item 1: Black Round Dining Table
                Description: Modern black round dining table with metal legs and a smooth surface.
                Shopping Query: modern black round dining table metal legs
                
                Item 2: White Office Chair 
                Description: Ergonomic white office chair with mesh back and adjustable height.
                Shopping Query: ergonomic white office chair mesh
                
                
                *** ANALYSIS INSTRUCTIONS ***
                Please analyze this room image and identify ONLY the items that have DEFINITELY been modified or added during redesign.
                
                STRICT INSTRUCTIONS: Be extremely selective and primarily identify the changes based on the conversation history, but confirm by analyzing the before and after images (if provided)
                
                Focus EXCLUSIVELY on identifying CLEAR, DEFINITIVE changes from the original room design.
                
                For each identified change, provide in your JSON:
                - "name": A specific name for the item (e.g., "Mid-Century Modern Gray Sofa" rather than just "Sofa")
                - "description": Detailed description including color, material, style and distinctive features
                - "google_shopping_query": A Google Shopping-optimized search query that would find similar real-world products
                
                              
                REMEMBER: Focus on providing specific, detailed information that would help find similar products.
                
                IMPORTANT: Your ENTIRE RESPONSE must be this JSON array and nothing else.
                If you don't find any changes in either the conversation history or the comparison of the before and after image (if provided), return an empty array: []
                
                Additional context: ${context}
            `;
            
            // If we have both original and modified images, use a comparison prompt instead
            if (originalImageData) {
                analysisPrompt = `
                    You are a visual comparison expert who identifies items in room designs. I've provided two versions of the same room:
                    
                    The FIRST image is the MODIFIED room design (the "after" image).
                    The SECOND image is the ORIGINAL room (the "before" image).
                    
                    CRITICAL INSTRUCTION: You MUST identify and describe SPECIFIC ITEMS that appear in the context, REGARDLESS of whether they are new or changed.
                    
                    If specific items like "black round table" or "white office chairs" are mentioned in the context, you MUST include these in your response.
                    
                    The primary goal is to provide detailed descriptions of items mentioned in the context, using the images as reference.
                    
                    For items mentioned in the context, be especially detailed about:
                    - Their appearance in the current ("after") image
                    - Whether they appear to be new or changed from the original image
                    - Their detailed characteristics (color, style, materials)
                    
                    If you cannot find an item explicitly mentioned in the context, still include it in your response
                    using your best description based on what you can see in the images.
                    
                    For each item (especially those mentioned in the context), provide:
                    - "name": A specific, detailed name for the item (e.g., "Mid-Century Modern Black Round Dining Table" rather than just "Table")
                    - "description": Thorough description including color, material, style and distinctive features
                    - "google_shopping_query": A specific, detailed search query that would find this exact item
                    - "change_type": Either "added" (completely new), "replaced" (different version of same item), or "unchanged"
                    
                    *** RESPONSE FORMAT INSTRUCTIONS ***
                    Please respond with a detailed description of each item, focusing on providing specific details that would help find similar products.
                    
                    For each item mentioned in the context, provide:
                    - Name: A specific name with details (e.g., "Mid-Century Modern Black Round Dining Table")
                    - Description: Include color, material, style, and distinctive features
                    - Shopping Query: A detailed search query to find similar products online
                    - Change Type: Indicate whether the item is "added", "replaced", or "unchanged"
                    
                    Format your response as a list with clear item separations. For example:
                    
                    Item 1: Black Round Dining Table
                    Description: Modern black round dining table with metal legs and a smooth surface.
                    Shopping Query: modern black round dining table metal legs
                    Change Type: added
                    
                    Item 2: White Office Chair 
                    Description: Ergonomic white office chair with mesh back and adjustable height.
                    Shopping Query: ergonomic white office chair mesh
                    Change Type: replaced
                    
                    If you don't find any relevant items, please indicate this clearly.
                    
                    Additional context: ${context}
                `;
            }
        }
        
        // Prepare the request body for image analysis
        const apiKey = await fetchApiKeys();
        
        // Extract base64 data for the main image
        const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, "");
        const imgMimeType = imageData.match(/^data:(image\/[a-z]+);base64,/)?.[1] || 'image/jpeg';
        
        // Build the request parts starting with the prompt
        const requestParts = [
            { text: analysisPrompt },
            { inline_data: { mime_type: imgMimeType, data: base64Data } }
        ];
        
        // If we have original image data for comparison (room analysis only)
        if (analysisType === 'room' && originalImageData) {
            // Add the original image as a second image
            const originalBase64Data = originalImageData.replace(/^data:image\/[a-z]+;base64,/, "");
            const originalImgMimeType = originalImageData.match(/^data:(image\/[a-z]+);base64,/)?.[1] || 'image/jpeg';
            
            // Add original image to request parts
            requestParts.push({ inline_data: { mime_type: originalImgMimeType, data: originalBase64Data } });
            
            console.log("Added original image for comparison analysis");
        }
        
        // Build the complete request for the image model
        const requestBody = {
            contents: [{
                parts: requestParts,
                role: "user"
            }],
            generationConfig: {
                temperature: 0.0, // Zero temperature for most deterministic responses
                topK: 32,
                topP: 0.95,
                responseModalities: ['TEXT', 'IMAGE'],
                maxOutputTokens: 4000
            }
        };
        
        // Call the Gemini API with the image generation model
        const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${apiKey}`;
        
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: { message: "Unknown API error." } }));
            throw new Error(`Image Analysis API Error (${response.status}): ${errorData.error?.message || "Request failed"}`);
        }
        
        const responseData = await response.json();
        
        // Extract text response
        let analysisText = '';
        if (responseData.candidates?.[0]?.content?.parts) {
            for (const part of responseData.candidates[0].content.parts) {
                if (part.text) analysisText += part.text;
            }
        }
        
        // Log raw response first for debugging
        console.log("Raw image analysis response (first 200 chars):", analysisText.substring(0, 200));
        
        // Clean up the analysis text
        analysisText = analysisText.trim();
        
        // Remove any markdown indicators or introductory text
        analysisText = analysisText.replace(/```.*?```/gs, '')
                                 .replace(/'''.*?'''/gs, '')
                                 .replace(/^Outputting.*?:/i, '')
                                 .replace(/^Here is the analysis.*?:/i, '')
                                 .trim();
        
        console.log("Clean analysis result:", analysisText);
        
        // Check if the response is JSON-formatted (looks like a JSON object)
        if (analysisText.trim().startsWith('{') && analysisText.trim().endsWith('}')) {
            try {
                console.log("Detected JSON format response, attempting to parse");
                const jsonObject = JSON.parse(analysisText);
                
                // Create a structured item from the JSON
                if (jsonObject.name || jsonObject.description || jsonObject.google_shopping_query) {
                    const item = {
                        name: jsonObject.name || "Product",
                        description: jsonObject.description || "",
                        google_shopping_query: jsonObject.google_shopping_query || jsonObject.name || ""
                    };
                    
                    console.log("Successfully extracted item from JSON:", item);
                    return [item];
                }
            } catch (jsonError) {
                console.warn("Failed to parse as JSON, continuing with text extraction:", jsonError.message);
            }
        }
        
        // Extract item information from text format
        try {
            // These variables were previously defined but are now used in a different way
            // Keep compatible declarations to avoid other code breaking
            const requestedItemNames = [];
            const requestedItemsSimple = [];
            
            // Extract items from context
            if (context) {
                const contextItems = context.match(/Specifically look for these items: ([^\n]*)/i);
                if (contextItems && contextItems[1]) {
                    const itemNames = contextItems[1].split(/,\s*/);
                    console.log(`Looking for these specific items in analysis: ${itemNames.join(', ')}`);
                    // Populate the compatibility arrays
                    itemNames.forEach(item => {
                        if (item && item.trim()) {
                            const itemName = item.trim();
                            requestedItemNames.push(itemName.toLowerCase());
                            requestedItemsSimple.push({
                                name: itemName,
                                description: `${itemName} - identified in the context`,
                                google_shopping_query: itemName
                            });
                        }
                    });
                }
            }
            
            // Try to parse the text directly using patterns for our formatted output
            const items = [];
            
            // Skip JSON-like text for segment splitting - we already tried JSON parsing above
            if (!analysisText.trim().startsWith('{')) {
                // Split the text into segments - each segment is a potential item
                // Look for patterns like "Item N:" or "Product Name:"
                const itemSegments = analysisText.split(/(?:Item \d+:|Product Name:)/g).filter(Boolean);
                
                if (itemSegments.length > 0) {
                    console.log(`Found ${itemSegments.length} potential item segments`);
                    
                    itemSegments.forEach((segment, index) => {
                        // Parse each segment
                        const nameMatch = segment.match(/(?:^:|^)\s*(.*?)(?:\n|$)/);
                        const descMatch = segment.match(/Description:\s*(.*?)(?:\n|$)/i);
                        const queryMatch = segment.match(/(?:Shopping Query|Search Query):\s*(.*?)(?:\n|$)/i);
                        const changeMatch = segment.match(/Change Type:\s*(.*?)(?:\n|$)/i);
                        
                        if (nameMatch || descMatch || queryMatch) {
                            const item = {
                                name: (nameMatch && nameMatch[1].trim()) || `Item ${index + 1}`,
                                description: (descMatch && descMatch[1].trim()) || "",
                                google_shopping_query: (queryMatch && queryMatch[1].trim()) || 
                                                      (nameMatch && nameMatch[1].trim()) || "",
                            };
                            
                            // Add change type if available
                            if (changeMatch && changeMatch[1].trim()) {
                                item.change_type = changeMatch[1].trim();
                            }
                            
                            items.push(item);
                        }
                    });
                    
                    if (items.length > 0) {
                        console.log(`Successfully extracted ${items.length} items from text format:`, items);
                        return items;
                    }
                }
            }
            
            // If we don't find our expected format, look for product specifics (skip if we have JSON)
            if (analysisType === 'product' && !analysisText.trim().startsWith('{')) {
                const nameMatch = analysisText.match(/Product Name:\s*(.*?)(?:\n|$)/i);
                const descMatch = analysisText.match(/Description:\s*(.*?)(?:\n|$)/i);
                const queryMatch = analysisText.match(/(?:Shopping Query|Search Query):\s*(.*?)(?:\n|$)/i);
                
                if (nameMatch || descMatch || queryMatch) {
                    const item = {
                        name: (nameMatch && nameMatch[1].trim()) || "Product",
                        description: (descMatch && descMatch[1].trim()) || "",
                        google_shopping_query: (queryMatch && queryMatch[1].trim()) || 
                                               (nameMatch && nameMatch[1].trim()) || "",
                    };
                    
                    console.log("Extracted single product information:", item);
                    return [item];
                }
            }
            
            // Try a more generic approach - look for any paragraphs that might contain item descriptions
            const paragraphs = analysisText.split(/\n\s*\n/).filter(p => p.trim().length > 10);
            if (paragraphs.length > 0) {
                console.log(`Found ${paragraphs.length} paragraphs to analyze`);
                
                // If there's a reasonable number of paragraphs, assume each is a description
                if (paragraphs.length <= 5) {
                    const items = paragraphs.map((paragraph, i) => {
                        // Try to extract a name, or use a generic one
                        const nameMatch = paragraph.match(/^([^\.,:;]+)[\.,:;]/);
                        const name = nameMatch ? nameMatch[1].trim() : `Item ${i+1}`;
                        
                        return {
                            name: name,
                            description: paragraph.trim(),
                            google_shopping_query: name
                        };
                    });
                    
                    console.log(`Extracted ${items.length} items from paragraphs:`, items);
                    return items;
                }
            }
            
            // Last resort: Create items from the context
            if (context && context.includes("Specifically look for these items")) {
                const specificItems = context.split("Specifically look for these items:")[1].split(",").map(item => item.trim());
                if (specificItems.length > 0) {
                    console.log("Creating items from context as fallback");
                    const contextItems = specificItems.map(item => ({
                        name: item,
                        description: `${item} as mentioned in context`,
                        google_shopping_query: item
                    }));
                    return contextItems;
                }
            }
            
            // Last resort fallback - create a generic item
            return [{
                name: analysisType === 'product' ? "Furniture Item" : "Room Item",
                description: analysisText.substring(0, 200),
                google_shopping_query: context || (analysisType === 'product' 
                    ? `modern ${analysisType} furniture home decor` 
                    : "modern home furniture decor")
            }];
        } catch (parseError) {
            console.error("Error parsing image analysis response:", parseError);
            throw new Error("Failed to parse product information from image analysis");
        }
    } catch (error) {
        console.error("Error in image analysis:", error);
        throw error;
    }
}

// --- Vetted API Integration ---

/**
 * Implements retry logic with exponential backoff
 * @param {Function} fn - The async function to retry
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} baseDelay - Base delay in milliseconds between retries
 * @param {Function} shouldRetry - Function that determines if the error is retryable
 * @returns {Promise<any>} - Result of the function call
 */
async function withRetry(fn, maxRetries = 3, baseDelay = 500, shouldRetry = () => true) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // First attempt (attempt=0) or retry attempts
            if (attempt > 0) {
                // Calculate exponential backoff delay
                const delay = baseDelay * Math.pow(2, attempt - 1);
                // Add some jitter (± 20% randomness)
                const jitter = delay * 0.2 * (Math.random() - 0.5);
                const finalDelay = delay + jitter;
                
                console.log(`Retry attempt ${attempt}/${maxRetries} after ${Math.round(finalDelay)}ms delay...`);
                await new Promise(resolve => setTimeout(resolve, finalDelay));
            }
            
            // Attempt the function call
            return await fn();
        } catch (error) {
            lastError = error;
            
            // Check if we should retry based on the error
            if (attempt < maxRetries && shouldRetry(error)) {
                console.warn(`Attempt ${attempt + 1}/${maxRetries + 1} failed:`, error.message);
                // Continue to next iteration which will retry after delay
            } else {
                // Either we've exhausted retries or error is not retryable
                console.error(`All ${attempt + 1} attempts failed:`, error);
                throw error;
            }
        }
    }
    
    // This shouldn't be reached but just in case
    throw lastError;
}

// Implementation of product search using findproducts_v3 endpoint
async function fetchQuery(name, body, options = {}) {
    const { headers } = options;
    
    console.log(`fetchQuery called: ${name}`, body);
    
    // For findProducts queries, use the new v3 endpoint via proxy
    if (name === "findProducts") {
        try {
            // Format the request payload according to the API documentation
            const requestPayload = {
                context: body.query, // Search query goes in the context field
                localization: "us", // Default to US localization
                meta: {
                    user: {
                        subscription: {
                            plan: "free"
                        },
                        location: {
                            uule: "" // Optional user location parameter
                        }
                    }
                }
            };
            
            console.log(`Using proxy to call findproducts_v3 endpoint with:`, requestPayload);
            
            // IMPORTANT: We're always using the proxy to avoid CORS issues
            const proxyUrl = '/api/proxy/https://research-function.reefpig.com/v3/research/findproducts';
            
            // Start the server if it's not running
            try {
                // Make a simple request to check if the server is up
                // Use GET method instead of HEAD which might not be supported
                await fetch('/api/vetted-key', { method: 'GET' });
            } catch (serverCheckError) {
                console.error("Server connection check failed:", serverCheckError);
                throw new Error("Server is not running. Please start the server with 'npm run dev'");
            }
            
            // Define a function to check if an error is retryable
            const isRetryableError = (error) => {
                // Network errors are retryable
                if (error.message.includes("Network error")) return true;
                
                // Certain status codes are retryable
                if (error.message.includes("522") || // Connection timed out
                    error.message.includes("500") || // Server error
                    error.message.includes("503") || // Service unavailable
                    error.message.includes("504"))   // Gateway timeout
                {
                    return true;
                }
                
                // Rate limiting should use exponential backoff
                if (error.message.includes("429")) return true;
                
                // Default to not retrying
                return false;
            };
            
            // Make the API call with retry logic
            const result = await withRetry(
                async () => {
                    // Generate a new correlation ID for each attempt
                    const correlationId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
                    
                    const response = await fetch(proxyUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            // Include required headers for the v3 API, but let the proxy handle them
                            'x-correlation-id': correlationId,
                            'x-session-id': '${SESSION_ID}',
                            'vetted-caller-id': '${CALLER_ID}',
                            ...(headers || {})
                        },
                        body: JSON.stringify(requestPayload)
                    }).catch(error => {
                        console.error("Network error during API call:", error);
                        throw new Error(`Network error: ${error.message}`);
                    });
                    
                    // Check for successful response
                    if (!response.ok) {
                        // Try to get error text, but handle the case where we can't
                        let errorText = "";
                        try {
                            errorText = await response.text();
                        } catch (err) {
                            errorText = "Unable to get error details";
                        }
                        
                        console.error(`API error (${response.status}):`, errorText);
                        
                        // For certain status codes, add more specific error information
                        if (response.status === 522) {
                            console.error("Connection timed out - server may be overloaded or down");
                            throw new Error(`API error: Connection timed out (522)`);
                        } else if (response.status === 429) {
                            console.error("Rate limit exceeded");
                            throw new Error(`API error: Rate limit exceeded (429)`);
                        } else {
                            throw new Error(`API error: ${response.status}`);
                        }
                    }
                    
                    // Parse the response according to the API documentation format
                    const data = await response.json();
                    console.log(`Received response from findproducts_v3:`, data);
                    
                    // Return the results from the API (products array)
                    return data.products || [];
                },
                3,  // maxRetries - try up to 3 times
                1000, // baseDelay - start with 1 second, then 2s, then 4s
                isRetryableError // only retry specific errors
            );
            
            return result;
            
        } catch (error) {
            console.error(`Error with findproducts_v3 after all retries:`, error);
            
            // Fallback to mock data if the proxy also fails
            console.warn(`Falling back to mock data for query: "${body.query}"`);
            return generateMockProducts(body.query, body.limit || 6);
        }
    } else {
        // For other query types, just return empty results
        console.warn(`Query type '${name}' not supported with the v3 API`);
        return [];
    }
}

async function fetchApiKeyForVetted() {
    console.log("Fetching Vetted API key from server...");
    try {
        const keyResponse = await fetch('/api/vetted-key');
        if (!keyResponse.ok) {
            throw new Error(`Failed to get Vetted API key (${keyResponse.status})`);
        }
        const { apiKey } = await keyResponse.json();
        if (!apiKey) {
            throw new Error("No Vetted API key returned from server");
        }
        return apiKey;
    } catch (error) {
        console.error("Error fetching Vetted API key:", error);
        return null;
    }
}

async function findProductsWithVettedApi(items) {
    // Create a unique ID for this product search instance
    const searchId = Date.now().toString();
    
    try {
        // Show loading indicator for products
        const productsContainer = document.createElement('div');
        productsContainer.className = 'product-recommendations';
        productsContainer.id = `product-search-${searchId}`;
        productsContainer.innerHTML = '<h3>Finding products that match your design...</h3><div class="product-loading"><span class="spinner"></span></div>';
        conversationArea.appendChild(productsContainer);
        conversationArea.scrollTop = conversationArea.scrollHeight;
        
        // Get API key
        const apiKey = await fetchApiKeyForVetted();
        
        // Process items in parallel with batches of 3 max to avoid overloading
        const productResults = {};
        const batchSize = 3; // Process 3 items at a time max
        
        // Break items into batches
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            
            // Create array of promises for parallel execution
            const batchPromises = batch.map(async (item) => {
                try {
                    console.log(`Searching for products matching: "${item.google_shopping_query}"`);
                    
                    // Use real fetchQuery to search for products
                    const results = await fetchQuery("findProducts", {
                        query: item.google_shopping_query,
                        limit: 6,
                        includeOutOfStock: false
                    }, {
                        headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : undefined
                    });
                    
                    return {
                        name: item.name,
                        data: {
                            query: item.google_shopping_query,
                            description: item.description || '',
                            results: results || []
                        }
                    };
                } catch (error) {
                    console.error(`Error searching for "${item.name}":`, error);
                    return {
                        name: item.name,
                        data: {
                            query: item.google_shopping_query,
                            description: item.description || '',
                            results: [],
                            error: error.message
                        }
                    };
                }
            });
            
            // Wait for all items in this batch to complete
            const batchResults = await Promise.all(batchPromises);
            
            // Add results to the productResults object
            batchResults.forEach(result => {
                productResults[result.name] = result.data;
            });
        }
        
        // Make sure the container still exists (user might have cleared the conversation)
        const container = document.getElementById(`product-search-${searchId}`);
        if (container) {
            // Display the product results
            displayProductRecommendations(container, productResults);
        } else {
            console.warn("Product search container no longer exists - results not displayed");
        }
        
        return { success: true, count: Object.keys(productResults).length };
    } catch (error) {
        console.error("Error finding products:", error);
        
        // Check if container still exists
        const container = document.getElementById(`product-search-${searchId}`);
        if (container) {
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorMessage.textContent = `Unable to find product recommendations: ${error.message}`;
            container.innerHTML = ''; // Clear the loading spinner
            container.appendChild(errorMessage);
        } else {
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorMessage.textContent = `Unable to find product recommendations: ${error.message}`;
            conversationArea.appendChild(errorMessage);
        }
        
        return { success: false, error: error.message };
    }
}

// Generate mock products based on search query
function generateMockProducts(query, count = 4) {
    console.log(`Generating ${count} mock products for query: "${query}"`);
    
    const queryLower = query.toLowerCase();
    const products = [];
    
    // Detect product category
    const categories = {
        furniture: ['table', 'chair', 'sofa', 'couch', 'desk', 'bed', 'dresser', 'cabinet'],
        lighting: ['lamp', 'light', 'chandelier', 'sconce', 'pendant'],
        decor: ['rug', 'carpet', 'curtain', 'curtains', 'art', 'painting', 'mirror', 'vase'],
        kitchen: ['kitchen', 'cookware', 'dinnerware', 'utensil']
    };
    
    let category = 'furniture'; // Default category
    for (const [cat, terms] of Object.entries(categories)) {
        if (terms.some(term => queryLower.includes(term))) {
            category = cat;
            break;
        }
    }
    
    // Price ranges by category
    const priceRanges = {
        furniture: [99, 1999],
        lighting: [49, 699],
        decor: [29, 499],
        kitchen: [39, 899]
    };
    
    // Detect colors
    const colors = ['white', 'black', 'gray', 'grey', 'brown', 'blue', 'green', 'red', 'yellow', 'beige'];
    let detectedColors = colors.filter(color => queryLower.includes(color));
    if (detectedColors.length === 0) detectedColors = ['natural']; // Default
    
    // Detect materials
    const materials = ['wood', 'wooden', 'metal', 'glass', 'plastic', 'leather', 'fabric'];
    let detectedMaterials = materials.filter(material => queryLower.includes(material));
    if (detectedMaterials.length === 0) {
        // Default materials by category
        const defaultMaterials = {
            furniture: 'wood',
            lighting: 'metal',
            decor: 'fabric',
            kitchen: 'stainless steel'
        };
        detectedMaterials = [defaultMaterials[category]];
    }
    
    // Store names
    const stores = [
        'Modern Home',
        'Comfort Living',
        'Design Haven',
        'Urban Decor',
        'HomeStyle'
    ];
    
    // Generate products
    for (let i = 0; i < count; i++) {
        const color = detectedColors[i % detectedColors.length];
        const material = detectedMaterials[i % detectedMaterials.length];
        const store = stores[Math.floor(Math.random() * stores.length)];
        
        // Generate price
        const [minPrice, maxPrice] = priceRanges[category];
        const price = (Math.random() * (maxPrice - minPrice) + minPrice).toFixed(2);
        
        // Extract main product type from query
        let productType = query;
        for (const term of [...Object.values(categories).flat()]) {
            if (queryLower.includes(term)) {
                productType = term;
                break;
            }
        }
        
        // Generate unique ID
        const id = `mock-${Date.now()}-${i}`;
        
        // Create mock product with a more reliable placeholder image source 
        // Using placeholder.pics which is more reliable than via.placeholder.com
        let productImage;
        
        // Different image approaches based on category
        if (category === 'furniture') {
            productImage = `https://placehold.co/400x300/f0e5d3/333333?text=${encodeURIComponent(productType)}`;
        } else if (category === 'lighting') {
            productImage = `https://placehold.co/400x300/fdf2cc/333333?text=${encodeURIComponent(productType)}`;
        } else if (category === 'decor') {
            productImage = `https://placehold.co/400x300/e8f4f8/333333?text=${encodeURIComponent(productType)}`;
        } else {
            productImage = `https://placehold.co/400x300/f4f4f5/333333?text=${encodeURIComponent(productType)}`;
        }
        
        // Create mock product
        const product = {
            id,
            name: `${color.charAt(0).toUpperCase() + color.slice(1)} ${material} ${productType}`,
            price: `$${price}`,
            brand: store,
            merchant: store,
            description: `${color} ${material} ${productType} by ${store}. High-quality home decor that complements any style.`,
            image_url: productImage,
            url: `https://example.com/product/${id}`
        };
        
        products.push(product);
    }
    
    return products;
}

function displayProductRecommendations(container, productResults) {
    // Clear any loading indicators
    container.innerHTML = '';
    
    // Add title
    const title = document.createElement('h3');
    title.textContent = 'Product Recommendations';
    container.appendChild(title);
    
    // Create container for all product categories
    const productsGrid = document.createElement('div');
    productsGrid.className = 'products-grid';
    
    // Add each product category
    for (const [itemName, itemData] of Object.entries(productResults)) {
        const categorySection = document.createElement('div');
        categorySection.className = 'product-category';
        
        const categoryTitle = document.createElement('h4');
        categoryTitle.textContent = itemName;
        categorySection.appendChild(categoryTitle);
        
        if (itemData.description) {
            const description = document.createElement('p');
            description.className = 'product-description';
            description.textContent = itemData.description;
            categorySection.appendChild(description);
        }
        
        const productsList = document.createElement('div');
        productsList.className = 'products-list';
        
        // Add product items
        if (itemData.results && itemData.results.length > 0) {
            itemData.results.slice(0, 4).forEach(product => {
                const productCard = createProductCard(product);
                productsList.appendChild(productCard);
            });
        } else {
            const noResults = document.createElement('p');
            noResults.className = 'no-results';
            noResults.textContent = `No matches found for "${itemData.query}"`;
            productsList.appendChild(noResults);
        }
        
        categorySection.appendChild(productsList);
        productsGrid.appendChild(categorySection);
    }
    
    container.appendChild(productsGrid);
    
    // Scroll to show the recommendations
    setTimeout(() => {
        conversationArea.scrollTop = conversationArea.scrollHeight;
    }, 100);
}

function createProductCard(product) {
    try {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        // Debug the product structure to understand what we're working with
        console.log('Creating product card for:', product);
        
        // Get image URL with more robust fallbacks for the v3 API response format
        let imageUrl = null;
        
        // Try multiple possible image properties, including the new v3 API format
        if (product.imageUrls && product.imageUrls.length > 0) {
            imageUrl = product.imageUrls[0];
        } else if (product.image_url) {
            imageUrl = product.image_url;
        } else if (product.imageUrl) {
            imageUrl = product.imageUrl;
        } else if (product.image) {
            imageUrl = product.image;
        } else if (product.images && product.images.length > 0) {
            imageUrl = product.images[0];
        }
        
        if (imageUrl) {
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = (product.title || product.name || 'Product image');
            img.className = 'product-image';
            img.onerror = () => {
                // Fallback to a data URI if the placeholder service fails
                img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSIgZmlsbD0iIzZiNzI4MCI+SW1hZ2UgbWlzc2luZzwvdGV4dD48L3N2Zz4=';
                console.log(`Image failed to load, using fallback for: ${product.name}`);
            };
            card.appendChild(img);
        } else {
            // Add placeholder image if no image URL is found
            const placeholderImg = document.createElement('div');
            placeholderImg.className = 'product-image placeholder';
            placeholderImg.textContent = 'No Image';
            card.appendChild(placeholderImg);
        }
        
        // Add product details
        const details = document.createElement('div');
        details.className = 'product-details';
        
        // Add title with robust fallbacks for v3 API
        const title = document.createElement('h5');
        title.className = 'product-title';
        title.textContent = product.title || product.name || product.productName || 'Unknown Product';
        details.appendChild(title);
        
        // Add price with enhanced format handling for v3 API format
        let price = null;
        
        // Try all possible price formats based on API response format
        if (product.affiliatePages && product.affiliatePages.length > 0 && product.affiliatePages[0].price) {
            price = product.affiliatePages[0].price;
        } else if (product.price) {
            price = product.price;
        } else if (product.priceInfo?.amount) {
            price = product.priceInfo.amount;
        } else if (product.currentPrice) {
            price = product.currentPrice;
        } else if (product.priceInfo?.currentPrice) {
            price = product.priceInfo.currentPrice;
        }
        
        if (price) {
            const priceContainer = document.createElement('div');
            priceContainer.className = 'product-price-container';
            
            const priceElement = document.createElement('p');
            priceElement.className = 'product-price';
            
            // Always treat prices as cents (divide by 100 to get dollars)
            if (typeof price === 'number') {
                const dollars = (price / 100).toFixed(2);
                priceElement.textContent = `$${dollars}`;
            } else if (typeof price === 'string') {
                // Extract numeric value from string and convert to dollars
                const numericPrice = parseFloat(price.replace(/[^0-9.]/g, ''));
                if (!isNaN(numericPrice)) {
                    const dollars = (numericPrice / 100).toFixed(2);
                    priceElement.textContent = `$${dollars}`;
                } else {
                    priceElement.textContent = price.startsWith('$') ? price : `$${price}`;
                }
            } else if (typeof price === 'object' && price.currency) {
                const currencySymbol = price.currency === 'USD' ? '$' : price.currency;
                if (typeof price.amount === 'number') {
                    const dollars = (price.amount / 100).toFixed(2);
                    priceElement.textContent = `${currencySymbol}${dollars}`;
                } else {
                    const numericAmount = parseFloat(String(price.amount).replace(/[^0-9.]/g, ''));
                    if (!isNaN(numericAmount)) {
                        const dollars = (numericAmount / 100).toFixed(2);
                        priceElement.textContent = `${currencySymbol}${dollars}`;
                    } else {
                        priceElement.textContent = `${currencySymbol}${price.amount}`;
                    }
                }
            } else if (typeof price === 'object' && price.amount) {
                // For v3 API price format - always convert to dollars
                if (typeof price.amount === 'number') {
                    const dollars = (price.amount / 100).toFixed(2);
                    priceElement.textContent = `$${dollars}`;
                } else {
                    const numericAmount = parseFloat(String(price.amount).replace(/[^0-9.]/g, ''));
                    if (!isNaN(numericAmount)) {
                        const dollars = (numericAmount / 100).toFixed(2);
                        priceElement.textContent = `$${dollars}`;
                    } else {
                        priceElement.textContent = `$${price.amount}`;
                    }
                }
            } else {
                // If we can't determine the price format, show a generic message
                priceElement.textContent = 'See price';
            }
            
            priceContainer.appendChild(priceElement);
            
            // Add action buttons next to price
            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'product-actions';
            
            // Add a "Add to Cart" button
            const cartButton = document.createElement('button');
            cartButton.className = 'product-action-btn cart-btn';
            cartButton.innerHTML = '🛒'; // Shopping cart emoji
            cartButton.title = 'Add to cart';
            cartButton.onclick = (e) => {
                e.preventDefault();
                cartButton.classList.add('added');
                setTimeout(() => cartButton.classList.remove('added'), 1500);
                alert(`Added "${product.title || product.name || 'this product'}" to cart`);
                // Future feature: Add to cart and update LLM to replace placeholders with real items
            };
            actionsContainer.appendChild(cartButton);
            
            // Add a "More like this" button to find similar items
            const similarButton = document.createElement('button');
            similarButton.className = 'product-action-btn similar-btn';
            similarButton.innerHTML = '🔍'; // Magnifying glass emoji
            similarButton.title = 'Find more like this';
            similarButton.onclick = async (e) => {
                e.preventDefault();
                
                // Get product info for the UI
                const productName = product.title || product.name || 'this product';
                
                // Add a message to show what's happening
                const userMessage = `Finding more products similar to this ${productName}...`;
                addMessageToConversation(userMessage, "user");
                conversationManager.addMessage("user", userMessage);
                
                // Add loading message
                addMessageToConversation("Analyzing product and searching for similar items...", "ai", true);
                
                try {
                    // Extract product image if available
                    let productImageUrl = null;
                    if (product.imageUrls && product.imageUrls.length > 0) {
                        productImageUrl = product.imageUrls[0];
                    } else if (product.image_url) {
                        productImageUrl = product.image_url;
                    } else if (product.imageUrl) {
                        productImageUrl = product.imageUrl;
                    } else if (product.image) {
                        productImageUrl = product.image;
                    } else if (product.images && product.images.length > 0) {
                        productImageUrl = product.images[0];
                    }
                    
                    // If we don't have an image, use text-based search as fallback
                    if (!productImageUrl) {
                        console.log("No product image found. Using text-based search as fallback.");
                        
                        // Create a text-based description
                        const textDescription = product.description || 
                            `${productName} ${product.brand || product.merchant || ''} ${product.color || ''} ${product.material || ''}`;
                        
                        const searchItem = {
                            name: productName,
                            description: textDescription,
                            google_shopping_query: `${productName} similar style design`
                        };
                        
                        // Log the search item
                        console.log("Searching for similar products using text fallback:", searchItem);
                        
                        // Call the product search API
                        await findProductsWithVettedApi([searchItem]);
                    } else {
                        // We have an image URL, fetch it and convert to base64 - use proxy to avoid CORS issues
                        console.log("Product image found. Using visual analysis for search:", productImageUrl);
                        
                        let base64Image = null;
                        let useTextFallback = false;
                        
                        try {
                            // Use our proxy to avoid CORS issues
                            // First make sure to properly encode the URL
                            const encodedUrl = encodeURIComponent(productImageUrl);
                            const proxyUrl = `/api/proxy/${encodedUrl}`;
                            console.log("Using proxy to fetch image:", proxyUrl);
                            
                            // Convert image URL to base64 by fetching it via proxy
                            const response = await fetch(proxyUrl);
                            
                            if (!response.ok) {
                                throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
                            }
                            
                            const blob = await response.blob();
                            
                            // Verify we got an image
                            if (!blob.type.startsWith('image/')) {
                                throw new Error(`Received non-image content: ${blob.type}`);
                            }
                            
                            // Create a FileReader to convert the blob to base64
                            base64Image = await new Promise((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onloadend = () => resolve(reader.result);
                                reader.onerror = reject;
                                reader.readAsDataURL(blob);
                            });
                        } catch (fetchError) {
                            console.error("Error fetching product image:", fetchError);
                            useTextFallback = true;
                            addMessageToConversation(
                                `I couldn't retrieve the product image, so I'll use text-based search instead.`,
                                "ai"
                            );
                            conversationManager.addMessage(
                                "assistant",
                                `I couldn't retrieve the product image, so I'll use text-based search instead.`
                            );
                        }
                        
                        if (useTextFallback) {
                            // Fallback to text-based search
                            console.log("Falling back to text-based search due to image fetch failure");
                            const textDescription = product.description || 
                                `${productName} ${product.brand || product.merchant || ''} ${product.color || ''} ${product.material || ''}`;
                            
                            const searchItem = {
                                name: productName,
                                description: textDescription,
                                google_shopping_query: `${productName} similar style design`
                            };
                            
                            // Log the search item
                            console.log("Searching for similar products using text fallback:", searchItem);
                            
                            // Call the product search API
                            addMessageToConversation("Searching for products...", "ai", true);
                            await findProductsWithVettedApi([searchItem]);
                        } else {
                            // Create a context with existing product information
                            const analysisContext = `${productName} ${product.description || ''} ${product.brand || product.merchant || ''}`;
                            
                            // Analyze the product image
                            addMessageToConversation("Analyzing product details...", "ai", true);
                            const analyzedItems = await analyzeImageForProducts(base64Image, 'product', analysisContext);
                            
                            // Show analysis message
                            addMessageToConversation(
                                `Based on my analysis of the ${productName}, I'll find similar products that match its style and features.`, 
                                "ai"
                            );
                            conversationManager.addMessage(
                                "assistant", 
                                `Based on my analysis of the ${productName}, I'll find similar products that match its style and features.`
                            );
                            
                            // Log the analyzed items
                            console.log(`Image analysis produced ${analyzedItems.length} items:`, analyzedItems);
                            
                            // Start the product search
                            addMessageToConversation("Searching for products...", "ai", true);
                            await findProductsWithVettedApi(analyzedItems);
                        }
                    }
                    
                    // Add a success message
                    addMessageToConversation(
                        `Here are some products similar to the ${productName} you were interested in. I focused on matching the style, materials, and design features.`, 
                        "ai"
                    );
                    conversationManager.addMessage(
                        "assistant", 
                        `Here are some products similar to the ${productName} you were interested in. I focused on matching the style, materials, and design features.`
                    );
                } catch (error) {
                    console.error("Error analyzing product and searching for similar items:", error);
                    
                    // Remove any remaining loading messages
                    conversationArea.querySelectorAll('.loading-message').forEach(msg => msg.remove());
                    
                    // Show error message
                    addMessageToConversation(
                        `I had trouble finding similar products to the ${productName}. ${error.message}`, 
                        "ai", 
                        false, 
                        true
                    );
                }
            };
            actionsContainer.appendChild(similarButton);
            
            priceContainer.appendChild(actionsContainer);
            details.appendChild(priceContainer);
        }
        
        // Add store/brand name with robust fallbacks for v3 API
        let merchant = null;
        if (product.affiliatePages && product.affiliatePages.length > 0) {
            // Extract merchant name from affiliate URL
            const url = product.affiliatePages[0].url;
            if (url) {
                try {
                    const urlObj = new URL(url);
                    merchant = urlObj.hostname.replace('www.', '');
                } catch (e) {
                    // If URL parsing fails, use a generic name
                    merchant = "Online Retailer";
                }
            }
        }
        
        // Fallback to other merchant properties
        merchant = merchant || product.store || product.brand || product.merchant || product.retailer || product.seller;
        
        if (merchant) {
            const store = document.createElement('p');
            store.className = 'product-store';
            store.textContent = merchant;
            details.appendChild(store);
        }
        
        // Add "View Product" button with robust link fallbacks for v3 API
        let linkUrl = null;
        if (product.affiliatePages && product.affiliatePages.length > 0) {
            linkUrl = product.affiliatePages[0].affiliateUrl || product.affiliatePages[0].url;
        }
        
        // Fallback to other URL properties
        linkUrl = linkUrl || product.product_url || product.url || product.productUrl || 
                        product.link || product.productLink || product.productUrl;
        
        if (linkUrl) {
            const buyButton = document.createElement('a');
            buyButton.href = linkUrl;
            buyButton.target = '_blank';
            buyButton.className = 'buy-button';
            buyButton.textContent = 'View Product';
            details.appendChild(buyButton);
        }
        
        card.appendChild(details);
        return card;
    } catch (error) {
        console.error('Error creating product card:', error, product);
        
        // Return a fallback card if there are any errors
        const fallbackCard = document.createElement('div');
        fallbackCard.className = 'product-card error';
        fallbackCard.innerHTML = `
            <div class="product-image placeholder">Error</div>
            <div class="product-details">
                <h5 class="product-title">Product information unavailable</h5>
                <p class="product-store">There was an error displaying this product</p>
            </div>
        `;
        return fallbackCard;
    }
}

// --- Initialization on Page Load ---
(async function init() {
    displayWelcomeMessage();
    queryInput.disabled = true; // Disabled until an image is uploaded
    submitBtn.disabled = true;  // Disabled until an image is uploaded
    renderRemodeledImages(); // Initial render
    
    try {
        // Initialize API keys and update model IDs from server config
        await fetchApiKeys();
        console.log("Application initialized. Using models:", 
            { orchestrator: ORCHESTRATOR_MODEL, imageGeneration: IMAGE_MODEL });
    } catch (error) {
        console.error("Error initializing application:", error);
        errorDisplay.textContent = "Error initializing application. Please reload the page.";
    }
})();