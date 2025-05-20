// AI-Powered Home Remodeling Visualization Tool - main.js (Updated)

// Import required libraries
import { marked } from "https://cdn.jsdelivr.net/npm/marked@15.0.11/+esm";

// --- Constants ---
const MODEL = "gemini-2.0-flash-preview-image-generation";
const systemPrompt = `You are an AI interior designer specializing in home remodeling visualization.
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

### Shopping Query Generation
- When the user is ready, identify key new elements in the design that would need to be purchased
- For each element, create a clear, specific Google Shopping query that would find similar items
- Queries should be specific enough to find visually similar items but not overly complex
- Example: "mid-century modern oak coffee table round" instead of just "coffee table"
- Focus on the most visually important or distinctive new elements in the design
- Generate a JSON with the following structure: It needs to consist of an array of "items", with each object in the array having a "name", "description", and "google_shopping_query" field that you need to fill out.

Always ensure your responses maintain the integrity of their original room while making the requested changes.`;


// --- DOM Elements ---
const roomPhotoInput = document.getElementById("room-photo-input");
const uploadBtn = document.getElementById("upload-btn");
const uploadCheckmark = document.getElementById("upload-checkmark");

const chatForm = document.getElementById("chat-form");
const queryInput = document.getElementById("query-input");
const submitBtn = document.getElementById("submit-btn");
const conversationArea = document.getElementById("conversation-area");
const errorDisplay = document.getElementById("error-display");
const imagePreviewContainer = document.createElement("div"); // Container for image preview
imagePreviewContainer.className = "image-preview-container";
chatForm.insertBefore(imagePreviewContainer, submitBtn);

const imageDisplayArea = document.getElementById("image-display-area");
// Removed references to the original image toggle and container - using "Start from Scratch" button instead

const remodeledImagesContainer = document.getElementById("remodeled-images-container");
const remodelPlaceholder = document.getElementById("remodel-placeholder");

// const shareButton = document.getElementById("share-button"); // Removed shareButton reference

// --- State Variables ---
let originalRoomImage = null;
let displayedRemodeledImages = [];
let latestModifiedImage = null;
let conversationHistory = [];
let pastedImage = null; // Store pasted image data
// Removed conversation phase tracking - letting the LLM handle context awareness
// Removed isTextOnlyRequestGlobal as LLM will decide image generation.

// Removed phase tracking completely - letting the LLM handle contextual responses

// --- Initialization ---
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
    if (welcomeMsg) {
        welcomeMsg.remove();
    }
}

// --- File Upload Logic ---
uploadBtn.addEventListener('click', () => {
    roomPhotoInput.click();
});

// Function to handle pasted or dropped images
function handlePastedImage(imageData) {
    // Create the image preview
    imagePreviewContainer.innerHTML = '';
    imagePreviewContainer.classList.add('active');
    
    // Create the image element
    const img = document.createElement('img');
    img.src = imageData;
    imagePreviewContainer.appendChild(img);
    
    // Create remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-image';
    removeBtn.innerHTML = '✕';
    removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        clearPastedImage();
    });
    imagePreviewContainer.appendChild(removeBtn);
    
    // Store the image data
    pastedImage = imageData;
    
    console.log("Image pasted and ready to send with message");
}

// Function to clear pasted image
function clearPastedImage() {
    imagePreviewContainer.innerHTML = '';
    imagePreviewContainer.classList.remove('active');
    pastedImage = null;
    console.log("Pasted image cleared");
}

// Paste event handler for the input field
queryInput.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    
    for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
            // We found an image in the clipboard
            const blob = item.getAsFile();
            const reader = new FileReader();
            
            reader.onload = function(event) {
                const imageData = event.target.result;
                handlePastedImage(imageData);
            };
            
            reader.readAsDataURL(blob);
            // Don't prevent default - still allow text to paste if any
        }
    }
});

// Drag and drop handling for the input area
queryInput.addEventListener('dragover', (e) => {
    e.preventDefault(); // Allow drop
    queryInput.classList.add('drag-over');
});

queryInput.addEventListener('dragleave', () => {
    queryInput.classList.remove('drag-over');
});

queryInput.addEventListener('drop', (e) => {
    e.preventDefault(); // Prevent browser from opening the file
    queryInput.classList.remove('drag-over');
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            
            reader.onload = function(event) {
                const imageData = event.target.result;
                handlePastedImage(imageData);
            };
            
            reader.readAsDataURL(file);
        }
    }
});

roomPhotoInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = function(e) {
            originalRoomImage = e.target.result;
            
            uploadCheckmark.style.display = "inline";
            setTimeout(() => { uploadCheckmark.style.display = "none"; }, 3000);
            errorDisplay.textContent = "";

            clearWelcomeMessage();

            latestModifiedImage = null;
            displayedRemodeledImages = [];
            renderRemodeledImages(); // This will now show the original image with "Start from scratch" button
            
            queryInput.disabled = false;
            submitBtn.disabled = false;
        };
        reader.onerror = function(e) {
            console.error("Error reading file:", e);
            errorDisplay.textContent = "Error loading the image file.";
            originalRoomImage = null;
        };
        reader.readAsDataURL(file);
    } else {
        errorDisplay.textContent = "Please select a valid image file (e.g., JPG, PNG).";
        roomPhotoInput.value = '';
        originalRoomImage = null;
    }
});

// --- Image Display Logic ---
// Removed toggleOriginalImage and resetToOriginalBtn - using "Start from Scratch" button instead

// Track which image is currently selected for editing
let selectedImageIndex = -1;

function renderRemodeledImages() {
    remodeledImagesContainer.innerHTML = '';
    
    // First, add the "Start from scratch" button for the original image
    if (originalRoomImage) {
        const originalItemDiv = document.createElement('div');
        originalItemDiv.className = 'remodeled-image-item image-wrapper';
        
        // Add selection status class if original is selected
        if (selectedImageIndex === -999) {  // Special index for original
            originalItemDiv.classList.add('selected-for-edit');
        }
        
        originalItemDiv.innerHTML = `
            <div class="image-header">
                <h4>Original Room</h4>
                <button type="button" class="select-for-edit-btn start-fresh-btn" data-index="-999">
                    ${selectedImageIndex === -999 ? '✓ Selected' : 'Start from Scratch'}
                </button>
            </div>
            <img src="${originalRoomImage}" alt="Original room">
        `;
        
        remodeledImagesContainer.appendChild(originalItemDiv);
        
        // Add click handler for the original image button
        const selectOriginalBtn = originalItemDiv.querySelector('.select-for-edit-btn');
        selectOriginalBtn.addEventListener('click', function() {
            selectImageForEditing(-999);  // Special index for original
        });
    }
    
    // Then add all the design versions
    if (displayedRemodeledImages.length > 0) {
        remodelPlaceholder.style.display = 'none';
        displayedRemodeledImages.forEach((imgData, index) => {
            const versionNumber = displayedRemodeledImages.length - index;
            const itemDiv = document.createElement('div');
            itemDiv.className = 'remodeled-image-item image-wrapper';
            
            // Add selection status class if this image is selected
            if (selectedImageIndex === index) {
                itemDiv.classList.add('selected-for-edit');
            }
            
            itemDiv.innerHTML = `
                <div class="image-header">
                    <h4>Design Version ${versionNumber}</h4>
                    <button type="button" class="select-for-edit-btn" data-index="${index}">
                        ${selectedImageIndex === index ? '✓ Selected' : 'Edit This Design'}
                    </button>
                </div>
                <img src="${imgData}" alt="Design version ${versionNumber}">
            `;
            
            remodeledImagesContainer.appendChild(itemDiv);
            
            // Add click handler for the selection button
            const selectBtn = itemDiv.querySelector('.select-for-edit-btn');
            selectBtn.addEventListener('click', function() {
                const imageIndex = parseInt(this.getAttribute('data-index'));
                selectImageForEditing(imageIndex);
            });
        });
    } else if (!originalRoomImage) {
        remodelPlaceholder.style.display = 'block';
    }
}

// Function to handle image selection for editing
function selectImageForEditing(index) {
    // Toggle selection if clicking the same image again
    if (selectedImageIndex === index) {
        selectedImageIndex = -1;
    } else {
        selectedImageIndex = index;
    }
    
    // Re-render to update selection UI
    renderRemodeledImages();
    
    // First, reset all classes to ensure a clean state
    queryInput.classList.remove('with-selected-image');
    queryInput.classList.remove('with-original-image');
    
    // Then provide visual feedback in the input area
    if (selectedImageIndex === -999) {
        // Special handling for original image
        queryInput.placeholder = "Describe changes to the original room...";
        queryInput.classList.add('with-selected-image');
        queryInput.classList.add('with-original-image');
    } else if (selectedImageIndex !== -1) {
        queryInput.placeholder = "Describe changes to the selected design...";
        queryInput.classList.add('with-selected-image');
    } else {
        queryInput.placeholder = "Describe your vision...";
    }
}

// --- Gemini API Interaction ---
async function processWithGemini(currentImageData, userText) {
    try {
        console.log("Preparing Gemini request with conversation history...");

        if (!currentImageData) {
            console.error("No image data provided to processWithGemini");
            throw new Error("Internal error: Image data is missing for AI processing.");
        }

        // Convert conversation history to Gemini API format
        const formattedHistory = [];
        
        // Add system prompt as a preamble that won't be in the conversation history
        // We'll include it with each user message since Gemini doesn't have a system role
        const preamble = { text: systemPrompt + "\n\n" };
        
        // Special case for "Start from scratch" requests
        const isStartingFresh = userText.toLowerCase().includes("starting from the original room:");
        
        // Include conversation history, but possibly limit it for "start from scratch" cases
        let recentHistory;
        
        if (isStartingFresh) {
            // For "start from scratch" requests, don't include previous history to avoid confusion
            recentHistory = [];
            console.log("Starting from original image - excluding previous conversation history");
        } else {
            // Normal case - include history except for the latest message
            recentHistory = conversationHistory.slice(0, -1);
        }
        
        console.log("Including " + recentHistory.length + " previous exchanges in context");
        
        // Add past exchanges to history
        for (let i = 0; i < recentHistory.length; i++) {
            const message = recentHistory[i];
            const messageParts = [];
            
            // Add text content
            if (message.content) {
                messageParts.push({ text: message.content });
            }
            
            // Add image if present (user can have inline image, assistant can have generated image)
            if (message.role === "user" && message.inlineImage) {
                const base64Data = message.inlineImage.replace(/^data:image\/[a-z]+;base64,/, "");
                const imgMimeType = message.inlineImage.match(/^data:(image\/[a-z]+);base64,/)?.[1] || 'image/jpeg';
                
                messageParts.push({
                    inline_data: {
                        mime_type: imgMimeType,
                        data: base64Data
                    }
                });
            } else if (message.role === "assistant" && message.image) {
                const base64Data = message.image.replace(/^data:image\/[a-z]+;base64,/, "");
                const imgMimeType = message.image.match(/^data:(image\/[a-z]+);base64,/)?.[1] || 'image/jpeg';
                
                messageParts.push({
                    inline_data: {
                        mime_type: imgMimeType,
                        data: base64Data
                    }
                });
            }
            
            if (messageParts.length > 0) {
                formattedHistory.push({
                    role: message.role === "user" ? "user" : "model",
                    parts: messageParts
                });
            }
        }
        
        // Create parts for current message
        const currentParts = [];
        
        // Always add system prompt to the user's message
        currentParts.push(preamble);
        
        // Add current image
        const base64Data = currentImageData.replace(/^data:image\/[a-z]+;base64,/, "");
        const imgMimeType = currentImageData.match(/^data:(image\/[a-z]+);base64,/)?.[1] || 'image/jpeg';
        console.log("Including current image in request. Base64 length:", base64Data.length, "Format:", imgMimeType);
        
        currentParts.push({
            inline_data: {
                mime_type: imgMimeType,
                data: base64Data
            }
        });
        
        // Simple enhancement that doesn't rely on phases
        let enhancedUserText = userText;
        
        // Add a consistent instruction for image perspective maintenance
        enhancedUserText += "\n\n[Remember to maintain the EXACT SAME camera angle and distance in any images you generate.]";
        
        // Special case for "Start from scratch" - make it explicit that we need an image
        if (isStartingFresh) {
            enhancedUserText += "\n\n[IMPORTANT: I want to see a visual for this change. Please include an image of the room in your response.]";
        }
        
        console.log("Enhanced user query:", enhancedUserText);
        currentParts.push({ text: enhancedUserText });
        
        console.log("Relying on LLM to decide on image generation based on conversation context.");

        // Build the full request with history and current message
        const requestBody = {
            contents: [
                ...formattedHistory,
                {
                    parts: currentParts,
                    role: "user"
                }
            ],
            generationConfig: {
                temperature: 0.4,
                topK: 32,
                topP: 0.95,
                responseModalities: ['TEXT', 'IMAGE'],
                stopSequences: [], // Prevent early stopping
                maxOutputTokens: 3048 // Allow more tokens to ensure image completion
            }
        };

        console.log("Fetching API key from server...");
        const keyResponse = await fetch('/api/gemini-key');
        if (!keyResponse.ok) {
            const errorText = await keyResponse.text();
            console.error("Failed to get Gemini API key from server:", errorText);
            throw new Error(`Server error fetching API key (${keyResponse.status}).`);
        }
        const { apiKey } = await keyResponse.json();
        if (!apiKey) {
            throw new Error("No Gemini API key returned from server. Ensure it's configured.");
        }

        const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
        console.log("Sending API call to Gemini endpoint:", apiEndpoint);

        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: { message: "Unknown API error format." } }));
            console.error("Gemini API Error Response:", errorData);
            throw new Error(`Gemini API Error (${response.status}): ${errorData.error?.message || JSON.stringify(errorData)}`);
        }

        const responseData = await response.json();
        console.log("Gemini Response data:", JSON.stringify(responseData, null, 2));

        const result = { text: "", image: null };
        if (responseData.candidates && responseData.candidates.length > 0) {
            const candidate = responseData.candidates[0];
            if (candidate.content && candidate.content.parts) {
                candidate.content.parts.forEach(part => {
                    if (part.text) {
                        result.text += part.text;
                    }
                    if (part.inlineData && part.inlineData.data) { 
                        result.image = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`; 
                        console.log("Found image in response via inlineData. MIME type:", part.inlineData.mimeType); 
                    }
                });
            }
        }
        
        if (!result.image && result.text) {
            const markdownImageRegex = /!\[.*?\]\((data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+)\)/g;
            const matches = [...result.text.matchAll(markdownImageRegex)];
            if (matches.length > 0 && matches[0][1]) {
                result.image = matches[0][1];
                console.log("Found image in response via Markdown link in text.");
            }
        }
        
        console.log("Final result from processWithGemini:", {
            textLength: result.text?.length,
            imagePresent: !!result.image,
            imageDataType: result.image ? typeof result.image : 'N/A',
            imageDataStart: result.image ? result.image.substring(0, 50) + '...' : 'N/A' 
        });

        return result;
    } catch (error) {
        console.error("Error in processWithGemini:", error);
        throw error; 
    }
}

// Function to check if user is requesting to start over with original image
function isRequestingOriginalImage(text) {
    const resetPhrases = [
        "start over", "start again", "reset", "begin again", "original image",
        "use original", "go back to original", "start fresh", "let's try again",
        "from scratch", "from the beginning", "redo", "start from scratch",
        "don't like this", "don't like these changes", "restart"
    ];
    
    const lowerText = text.toLowerCase();
    return resetPhrases.some(phrase => lowerText.includes(phrase));
}


// --- Chat Interaction ---
chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const userText = queryInput.value.trim();
    
    // No phase tracking - letting the LLM handle context

    if (!originalRoomImage) {
        errorDisplay.textContent = "Please upload a room photo first.";
        setTimeout(() => { errorDisplay.textContent = ""; }, 3000);
        return;
    }
    if (!userText) {
        errorDisplay.textContent = "Please describe your desired changes.";
        setTimeout(() => { errorDisplay.textContent = ""; }, 3000);
        return;
    }
    errorDisplay.textContent = ""; 

    clearWelcomeMessage(); 

    // Create message content including any images
    const hasInlineImage = pastedImage !== null;
    let displayMessage = userText;
    
    // Determine which image to use for this request
    let imageToSend;
    let selectedImageForMsg = null;
    
    // If an image was pasted, add an indicator in the display message
    if (hasInlineImage) {
        displayMessage = "📎 " + userText;  // Add paperclip emoji to indicate attachment
        imageToSend = pastedImage;
    } else if (selectedImageIndex === -999) {
        // Special case: User selected "Start from scratch" with original image
        imageToSend = originalRoomImage;
        displayMessage = "🏠 " + userText;  // Add house emoji to indicate starting fresh with original
        selectedImageForMsg = originalRoomImage; // Attach the original image to the message
        
        // Let's add an explicit instruction to reinforce starting from the original image
        userText = `Starting from the original room: ${userText}`;
    } else if (selectedImageIndex !== -1) {
        // Use the selected image if one is selected
        imageToSend = displayedRemodeledImages[selectedImageIndex];
        displayMessage = "📌 " + userText;  // Add thumbtack emoji to indicate editing a specific design
        selectedImageForMsg = imageToSend; // Attach the selected image to the message
    } else {
        // Default to latest modified image or original image
        imageToSend = latestModifiedImage || originalRoomImage;
        
        // Attach the latest modified image to help maintain context
        if (latestModifiedImage) {
            selectedImageForMsg = latestModifiedImage;
            displayMessage = "🔄 " + userText;  // Add recycling emoji to indicate continuing with latest design
        }
    }
    
    // Add the user message to the conversation with appropriate emoji indicators
    // 📎: Pasted image, 🏠: Starting from original room, 📌: Selected specific design, 🔄: Continuing with latest design
    addMessageToConversation(displayMessage, "user", false, false, hasInlineImage ? pastedImage : selectedImageForMsg);
    conversationHistory.push({ 
        role: "user", 
        content: userText, 
        inlineImage: hasInlineImage ? pastedImage : selectedImageForMsg, 
        timestamp: new Date().toISOString() 
    });
    
    queryInput.value = ""; 
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span>'; 

    // Add loading message based on which image we're using
    if (hasInlineImage) {
        addMessageToConversation("Processing your image and request...", "ai", true);
        
        // Clear the image preview after sending
        clearPastedImage();
    } else if (isRequestingOriginalImage(userText)) {
        addMessageToConversation("Using your original room photo for this design...", "ai", true);
    } else if (selectedImageIndex !== -1) {
        addMessageToConversation(`Modifying design version ${displayedRemodeledImages.length - selectedImageIndex}...`, "ai", true);
    } else {
        addMessageToConversation("Generating your design...", "ai", true);
    }
    
    // Reset the selected image after using it
    if (selectedImageIndex !== -1) {
        // After sending, clear the selection
        setTimeout(() => {
            selectedImageIndex = -1; 
            
            // Reset input field state
            queryInput.classList.remove('with-selected-image');
            queryInput.classList.remove('with-original-image');
            queryInput.placeholder = "Describe your vision...";
            
            // Update UI
            renderRemodeledImages();
        }, 500);
    }

    try {
        const result = await processWithGemini(imageToSend, userText);
        console.log("Gemini Result in submit handler:", {
            textLength: result.text?.length,
            imagePresent: !!result.image,
        });

        // Remove all loading messages
        const loadingMsgs = conversationArea.querySelectorAll('.loading-message');
        loadingMsgs.forEach(msg => msg.remove()); 

        let aiMessageText = result.text || "";
        let aiMessageImage = result.image || null;

        if (!aiMessageText && aiMessageImage) {
             aiMessageText = "Here's the visualized update based on your request.";
        }

        // Let the LLM decide when to generate images - no need to check ourselves
                               
        if (aiMessageImage) {
            // Successfully got an image
            latestModifiedImage = aiMessageImage; 
            displayedRemodeledImages.unshift(aiMessageImage); 
            renderRemodeledImages(); 
            
            // No need to update reset button - using "Start from Scratch" instead
            
            // Always display the text response when we have an image
            if (aiMessageText) {
                addMessageToConversation(aiMessageText, "ai");
            }
            
            conversationHistory.push({ role: "assistant", content: aiMessageText, image: aiMessageImage, timestamp: new Date().toISOString() });
        // We removed the shouldHaveImage check - all cases are handled by the next condition
        } else if(aiMessageText) {
            // Normal text-only response
            addMessageToConversation(aiMessageText, "ai");
            conversationHistory.push({ role: "assistant", content: aiMessageText, timestamp: new Date().toISOString() });
        } else {
            // Empty response
            addMessageToConversation("I received an empty response. Please try rephrasing your request.", "ai", false, true);
        }

    } catch (error) {
        console.error("Error during chat form submission:", error);
        const loadingMsg = conversationArea.querySelector('.loading-message');
        if (loadingMsg) loadingMsg.remove();
        addMessageToConversation(`An error occurred: ${error.message}. Please try again.`, "ai", false, true);
        conversationHistory.push({ role: "assistant", content: `Error: ${error.message}`, isError: true, timestamp: new Date().toISOString() });
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = "➤"; 
    }
});

function addMessageToConversation(text, role, isLoading = false, isError = false, attachedImage = null) {
    clearWelcomeMessage(); 

    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${role}-message`;
    if (isLoading) {
        messageDiv.classList.add("loading-message");
    }
    if (role === 'ai' && isError) {
        messageDiv.classList.add("error-message-chat"); 
    }

    if (role === 'ai' && !isLoading && !isError && text) {
        messageDiv.innerHTML = marked.parse(text);
    } else {
        // For user messages that might have an emoji at the beginning (for image indicators)
        // we want to preserve that, but we need to escape any HTML in the actual text
        if (text.startsWith('📎 ') && role === 'user') {
            messageDiv.innerHTML = '📎 ' + document.createTextNode(text.substring(2)).textContent;
        } else {
            messageDiv.textContent = text;
        }
    }
    
    // If there's an attached image, add it to the message
    if (attachedImage) {
        const imgElement = document.createElement('img');
        imgElement.src = attachedImage;
        imgElement.className = 'inline-message-image';
        imgElement.alt = 'Attached image';
        messageDiv.appendChild(document.createElement('br'));
        messageDiv.appendChild(imgElement);
    }
    
    conversationArea.appendChild(messageDiv);
    conversationArea.scrollTop = conversationArea.scrollHeight; 
}

// --- Share Functionality (REMOVED) ---
// shareButton.addEventListener("click", async () => { ... }); // Entire event listener removed


// --- Initialization on Page Load ---
(async function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get('s'); 

    // Since sharing is removed, we simplify the init logic.
    // If you later re-introduce sharing via URL, this part would need to be restored/adapted.
    if (shareId) {
        console.warn("Share functionality via URL (s= parameter) is currently disabled.");
        // Potentially display a message to the user that the shared link is no longer active
        // or attempt a simplified load if the backend API for /api/store/ still exists.
        // For now, we'll just fall through to the default welcome message.
    }

    displayWelcomeMessage(); 
    queryInput.disabled = true; // Disabled until an image is uploaded
    submitBtn.disabled = true;  // Disabled until an image is uploaded
    
    renderRemodeledImages(); 
    console.log("Application initialized. Model:", MODEL);
})();
