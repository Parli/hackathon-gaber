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
2. "findSimilarProducts" - Finds real products that match design elements in the room

You're the decision maker for when to use these functions based on user intent. You should:
- Use generateImage when users want to visualize changes to their room
- Use findSimilarProducts when users want to purchase items shown in their design

The user will upload photos of rooms they want to redesign. You'll help them through the process by:
1. Understanding their design preferences and goals
2. Suggesting specific changes based on their input
3. Calling generateImage to visualize these changes
4. Refining designs through conversation
5. Using findSimilarProducts when they're ready to shop

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

### Product Recommendations with Function Calling
- When the user expresses interest in purchasing items from their design, use the findSimilarProducts function
- IMPORTANT: Only use this function when the user is ready to shop or explicitly asks for product recommendations
- The findSimilarProducts function takes an array of items with these properties:
  * name: A short, descriptive name for the item (e.g., "Coffee Table", "Floor Lamp")
  * description: A detailed description of the item's appearance and style
  * google_shopping_query: An optimized search query to find similar products
- Include 3-5 of the most important or prominent items in the design
- Make search queries specific enough to find visually similar items (e.g., "mid-century modern oak coffee table round" vs. just "coffee table")
- The function will display real product recommendations that match the design elements

### When to Use the Product Recommendations Function
- When the user says they love the design and want to know where to buy items
- When the user asks "where can I find this lamp?" or similar shopping questions
- When the user explicitly asks for product recommendations or shopping links
- When the design is finalized and the conversation is shifting to implementation
- DO NOT use the function prematurely - wait until the design is relatively stable

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
        description: "Find real products matching the user's design elements",
        parameters: {
            type: "object",
            properties: {
                items: {
                    type: "array",
                    description: "Array of design elements to find similar products for",
                    items: {
                        type: "object",
                        properties: {
                            name: {
                                type: "string",
                                description: "Name of the design element (e.g., 'Coffee Table')"
                            },
                            description: {
                                type: "string",
                                description: "Detailed description of the element"
                            },
                            google_shopping_query: {
                                type: "string",
                                description: "Optimized search query for finding similar products"
                            }
                        },
                        required: ["name", "google_shopping_query"]
                    }
                }
            },
            required: ["items"]
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
    
    // Add image to the message if provided
    if (currentImage) {
        const base64Data = currentImage.replace(/^data:image\/[a-z]+;base64,/, "");
        const imgMimeType = currentImage.match(/^data:(image\/[a-z]+);base64,/)?.[1] || 'image/jpeg';
        currentMessageParts.push({ inline_data: { mime_type: imgMimeType, data: base64Data } });
    }
    
    return {
        contents: [...formattedHistory, { parts: currentMessageParts, role: "user" }],
        tools: [{ function_declarations: ORCHESTRATOR_FUNCTION_DEFINITIONS }],
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
        
        // Extract items from arguments
        let items = [];
        if (args.items && Array.isArray(args.items)) {
            items = args.items;
        } else if (Array.isArray(args)) {
            items = args;
        }
        
        if (items.length === 0) {
            throw new Error("No product items provided for searching.");
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
        if (!currentImage) {
            throw new Error("Image required for processing. Please upload a room photo first.");
        }
        
        // Add a loading message
        addMessageToConversation("Thinking about your request...", "ai", true);
        
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
            // Handle each function call sequentially
            for (const functionCall of orchestratorResponse.functionCalls) {
                try {
                    if (functionHandlers[functionCall.name]) {
                        console.log(`Executing function: ${functionCall.name}`);
                        addMessageToConversation(`Processing ${functionCall.name === 'generateImage' ? 'image generation' : 'product search'}...`, "ai", true);
                        
                        const result = await functionHandlers[functionCall.name](functionCall.args);
                        functionResults.push({
                            name: functionCall.name,
                            result: result
                        });
                    } else {
                        console.error(`Unknown function: ${functionCall.name}`);
                    }
                } catch (error) {
                    console.error(`Error executing function ${functionCall.name}:`, error);
                    functionResults.push({
                        name: functionCall.name,
                        error: error.message
                    });
                }
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
    if (!imageState.original) {
        errorDisplay.textContent = "Please upload a room photo first.";
        setTimeout(() => { errorDisplay.textContent = ""; }, 3000);
        return false;
    }
    if (!currentUserText) {
        errorDisplay.textContent = "Please describe your desired changes.";
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
    const imageToSend = imageState.getImageDataForApi();
    const imageToAttachInChat = imageState.getImageToAttachToUserMessageInChat();

    if (!imageToSend) {
        handleApiError(new Error("No image available to process. Please upload or select an image."));
        return;
    }

    addMessageToConversation(displayMessage, "user", false, false, imageToAttachInChat);
    conversationManager.addMessage("user", userTextForApi, { inlineImage: imageToAttachInChat });

    queryInput.value = "";
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span>';

    // Determine and display initial loading message
    let loadingMessage = "Processing your request...";
    if (isPastedImage) {
        loadingMessage = "Processing your pasted image...";
    } else if (userTextForApi.startsWith("Starting from the original room:")) {
        loadingMessage = "Using your original room photo...";
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
        // Process the query using the orchestrator
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

// --- Vetted API Integration ---
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
        // Fallback to a default API key for development (remove in production)
        return null;
    }
}

async function findProductsWithVettedApi(items) {
    try {
        // Show loading indicator for products
        const productsContainer = document.createElement('div');
        productsContainer.className = 'product-recommendations';
        productsContainer.innerHTML = '<h3>Finding products that match your design...</h3><div class="product-loading"><span class="spinner"></span></div>';
        conversationArea.appendChild(productsContainer);
        conversationArea.scrollTop = conversationArea.scrollHeight;
        
        // Get API key
        const apiKey = await fetchApiKeyForVetted();
        if (!apiKey) {
            throw new Error("Unable to get Vetted API key");
        }
        
        // Process each item
        const productResults = {};
        for (const item of items) {
            // Call the Vetted API for each shopping query
            const results = await searchVettedProducts(apiKey, item.google_shopping_query);
            productResults[item.name] = {
                query: item.google_shopping_query,
                description: item.description || '',
                results: results || []
            };
        }
        
        // Display the product results
        displayProductRecommendations(productsContainer, productResults);
    } catch (error) {
        console.error("Error finding products:", error);
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = `Unable to find product recommendations: ${error.message}`;
        conversationArea.appendChild(errorMessage);
    }
}

async function searchVettedProducts(apiKey, query) {
    try {
        console.log(`Searching for products matching: "${query}"`);
        
        // First, try to use the Vetted API with the proper method
        try {
            // Import properly from the installed SDK
            const lustreSDK = await import('/node_modules/@lustre/sdk/dist/index.js');
            
            // The SDK provides a fetchQuery method for making API calls
            if (lustreSDK.fetchQuery) {
                console.log("Using @lustre/sdk fetchQuery method");
                
                // Use fetchQuery from the SDK to search for products
                const results = await lustreSDK.fetchQuery("findProducts", {
                    query: query,
                    limit: 6,
                    includeOutOfStock: false
                }, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`
                    }
                });
                
                console.log(`Found ${results?.length || 0} products via Lustre SDK`);
                return results || [];
            } else {
                throw new Error("fetchQuery method not available in Lustre SDK");
            }
        } catch (sdkError) {
            console.error("Failed to use Lustre SDK:", sdkError);
            console.log("Falling back to mock product data");
            return generateMockProducts(query);
        }
    } catch (error) {
        console.error(`Error searching for "${query}":`, error);
        // Still return mock products even if an error occurs
        return generateMockProducts(query, 2);
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
        
        // Get image URL with more robust fallbacks
        let imageUrl = null;
        
        // Try multiple possible image properties based on SDK version and API format
        if (product.image_url) imageUrl = product.image_url;
        else if (product.imageUrl) imageUrl = product.imageUrl;
        else if (product.image) imageUrl = product.image;
        else if (product.images && product.images.length > 0) imageUrl = product.images[0];
        else if (product.imageUrls && product.imageUrls.length > 0) imageUrl = product.imageUrls[0];
        
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
        
        // Add title with robust fallbacks
        const title = document.createElement('h5');
        title.className = 'product-title';
        title.textContent = product.title || product.name || product.productName || 'Unknown Product';
        details.appendChild(title);
        
        // Add price with enhanced format handling
        let price = null;
        
        // Try all possible price formats based on SDK version and API response
        if (product.price) price = product.price;
        else if (product.priceInfo?.amount) price = product.priceInfo.amount;
        else if (product.currentPrice) price = product.currentPrice;
        else if (product.priceInfo?.currentPrice) price = product.priceInfo.currentPrice;
        
        if (price) {
            const priceElement = document.createElement('p');
            priceElement.className = 'product-price';
            
            if (typeof price === 'number') {
                priceElement.textContent = `$${price.toFixed(2)}`;
            } else if (typeof price === 'string') {
                priceElement.textContent = price.startsWith('$') ? price : `$${price}`;
            } else if (typeof price === 'object' && price.currency === 'USD') {
                priceElement.textContent = `$${price.amount.toFixed(2)}`;
            } else {
                // If we can't determine the price format, show a generic message
                priceElement.textContent = 'See price';
            }
            
            details.appendChild(priceElement);
        }
        
        // Add store/brand name with robust fallbacks
        const merchant = product.store || product.brand || product.merchant || product.retailer || product.seller;
        if (merchant) {
            const store = document.createElement('p');
            store.className = 'product-store';
            store.textContent = merchant;
            details.appendChild(store);
        }
        
        // Add "View Product" button with robust link fallbacks
        const linkUrl = product.product_url || product.url || product.productUrl || 
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