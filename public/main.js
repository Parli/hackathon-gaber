// Import required libraries
import { marked } from "https://cdn.jsdelivr.net/npm/marked@15.0.11/+esm";

// --- Constants ---
let IMAGE_MODEL = "gemini-2.0-flash-preview-image-generation";
let ORCHESTRATOR_MODEL = "gemini-2.5-flash-preview-04-17";

// Orchestrator System Prompt
const ORCHESTRATOR_PROMPT = `You are an AI interior designer specializing in home remodeling visualization.
Your primary goal is to help the user visualize changes to their room based on an uploaded photo and guide them through a remodeling process.

You have access to three key functions:
1. "generateImage" - Generates a modified image of a room based on specific instructions
2. "addToImage" - Replaces a placeholder item in the room design with an actual product image
3. "findSimilarProducts" - Finds real products that match design elements in the room, with optional image analysis to identify changed items

CRITICAL IMAGE GENERATION RULES:
- ONLY use the generateImage function when the user gives SPECIFIC, ACTIONABLE design instructions (e.g., "make the walls blue", "add a wooden table", "change the sofa to leather")
- DO NOT generate images for opinion/suggestion requests (e.g., "what do you think we could change?", "any suggestions?", "what would look good here?", "tell me what you see")
- DO NOT generate images when the user is asking for advice, brainstorming, exploring possibilities, or seeking analysis
- DO NOT generate images for questions about the current room ("what styles would work here?", "describe this room", "what do you see?")
- BE CONVERSATIONAL first when users ask for opinions - discuss options and get their agreement before generating images
- Generate images ONLY when users express clear intent to visualize a specific change

You're the decision maker for when to use these functions based on user intent:
- Use generateImage when users want to visualize changes to their room
- Use addToImage when users want to incorporate a specific product into their room design
- Use findSimilarProducts when users want to purchase items shown in their design

The user will upload photos of rooms they want to redesign. You'll help them through the process by:
1. Understanding their design preferences and goals
2. Suggesting specific changes based on their input
3. Using generateImage to visualize changes ONLY when users request specific modifications
4. Refining designs through conversation
5. Using findSimilarProducts when they're ready to shop
6. Using addToImage when they want to visualize specific products in their room

When the user asks to purchase items or find products that match their design:
1. If they specifically mention items ("Where can I buy this lamp?"), include these items in your function call
2. If they want to shop but don't specify items ("What items did we change?" or "What can I buy?" or "buy these items"), use the findSimilarProducts function with options.analyzeImage=true (IMPORTANT: set this to true) to automatically identify changed items
3. CRITICAL: When users ask about changes or want to see what items were modified, you MUST use the analyzeImage option
4. IMPORTANT: When users say "buy these items" or similar phrases, they typically mean the NEW items that were added or changed in the AI-generated design, NOT all the existing items in the original room. Focus the analysis on identifying what was modified, added, or replaced compared to the original room.

When the user wants to add a specific product to their room design:
1. Use the addToImage function with the product image URL and a description of the item to replace
2. The function will automatically use the latest room design as the base image
3. This function is best used after finding products with findSimilarProducts

Important guidelines:
- Always maintain the room's exact dimensions, perspective, and layout in images
- Be proactive and helpful in guiding the conversation
- When users ask for opinions or suggestions, ENGAGE CONVERSATIONALLY first:
  * Discuss multiple design options with them
  * Ask what style they prefer (modern, traditional, etc.)
  * Suggest specific changes and get their feedback
  * Only generate images once they agree on specific changes
- After showing a design, ask follow-up questions about what they might want to change
- When the user seems satisfied with a design, offer product recommendations
- Make specific, actionable suggestions rather than vague ones
- Balance being helpful with letting users guide the conversation when they're exploring ideas`;

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
- THIS IS THE MOST IMPORTANT PART: **DO NOT CHANGE ANY ITEM BEYOND THE ONES REQUESTED AND DON'T CHANGE THE PERSPECTIVE OF THE ROOM IN ANY WAY!**
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
  * brand: (Optional) Brand name for brand-specific searches. Extract from product titles (e.g., "Samsung TV" → "Samsung", "IKEA table" → "IKEA")
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
  * The user requests products from a specific brand

### Brand-Specific Product Searches
- When the user requests products from a specific brand (e.g., "Find more Samsung products", "Show me IKEA furniture"), use the brand parameter:

  findSimilarProducts({ 
    brand: "Samsung",
    context: "Finding products from Samsung brand" 
  })

- IMPORTANT: Always extract the brand name accurately from product titles:
  * "Samsung 55-inch 4K Smart TV" → brand: "Samsung"
  * "IKEA BILLY Bookcase White" → brand: "IKEA"  
  * "West Elm Mid-Century Dining Table" → brand: "West Elm"
  * "Herman Miller Aeron Chair" → brand: "Herman Miller"
  * "Generic Coffee Table" → brand: "unknown" (skip brand parameter)

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
        name: "addToImage",
        description: "Replace a placeholder item in the room design with an actual product image",
        parameters: {
            type: "object",
            properties: {
                productImageUrl: { 
                    type: "string", 
                    description: "URL or base64 data of the product image to add to the room" 
                },
                itemToReplace: { 
                    type: "string", 
                    description: "Description of the item to replace in the room design (e.g., 'table', 'lamp', 'sofa')" 
                },
                instructions: { 
                    type: "string", 
                    description: "Additional instructions for placing the product in the room" 
                }
            },
            required: ["productImageUrl", "itemToReplace"]
        }
    },
    {
        name: "findSimilarProducts",
        description: "Find real products matching items that have been CHANGED, ADDED, or REPLACED in the AI-generated design compared to the original room. Focuses specifically on NEW design elements, NOT existing items from the original room. When user says 'buy these items', they mean the items that were modified in the latest design iteration.",
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
                    description: "Additional context to guide the product search and analysis. Use this to specify focus on changed/new items vs existing items from the original room."
                },
                brand: {
                    type: "string",
                    description: "Brand name for 'More From This Brand' searches. Extract the brand name from product titles (e.g., 'Samsung 55-inch TV' → 'Samsung', 'IKEA BILLY Bookcase' → 'IKEA', 'West Elm Dining Table' → 'West Elm'). Return only the brand name, or 'unknown' if no clear brand is present."
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
    /** Sets the index of the currently selected image for editing. */
    setSelectedIndex(index) { this.selectedIndex = index; console.log("Selected image index set to:", this.selectedIndex); },
    /** Resets any active image selection. */
    resetSelection() { this.selectedIndex = -1; console.log("Image selection reset."); },

    /** Determines the current image to be sent to the API. */
    getImageDataForApi() {
        let selectedImage = null;
        let source = "";
        
        if (this.pasted) {
            selectedImage = this.pasted;
            source = "pasted image";
        } else if (this.selectedIndex === -999) {
            selectedImage = this.original;
            source = "original image";
        } else if (this.selectedIndex !== -1 && this.remodels[this.selectedIndex]) {
            selectedImage = this.remodels[this.selectedIndex];
            const versionNumber = this.remodels.length - this.selectedIndex;
            source = `Version ${versionNumber} (array index ${this.selectedIndex})`;
        } else {
            selectedImage = this.latestRemodel || this.original;
            source = this.latestRemodel ? "latest remodel (fallback)" : "original (fallback)";
        }
        
        console.log(`getImageDataForApi() returning image from: ${source}`);
        console.log(`Selected image preview: ${selectedImage?.substring(0, 50)}...`);
        return selectedImage;
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
 * Manages the shopping cart state and operations.
 */
const cartState = {
    items: [], // Array of cart items
    isOpen: false, // Whether the cart is open/visible
    cartPanel: null, // Reference to cart panel element
    cartBadge: null, // Reference to cart badge element
    cartTotalPrice: null, // Reference to cart total price element
    cartItems: null, // Reference to cart items container
    checkoutBtn: null, // Reference to checkout button
    
    /**
     * Initialize cart UI elements and event listeners.
     * Should be called after DOM is loaded.
     */
    init() {
        // Get DOM elements
        this.cartPanel = document.getElementById('cart-panel');
        this.cartBadge = document.getElementById('cart-badge');
        this.cartTotalPrice = document.getElementById('cart-total-price');
        this.cartItems = document.getElementById('cart-items');
        this.checkoutBtn = document.getElementById('checkout-btn');
        
        // Set up event listeners
        document.getElementById('cart-toggle-btn').addEventListener('click', () => this.toggleCart());
        document.getElementById('close-cart-btn').addEventListener('click', () => this.closeCart());
        document.getElementById('clear-cart-btn').addEventListener('click', () => this.clearCart());
        
        // Initial UI update
        this.updateCartUI();
    },

    /**
     * Adds a product to the cart.
     * @param {Object} product - The product to add
     */
    addItem(product) {
        // Check if the product is already in the cart
        const existingItemIndex = this.items.findIndex(item => 
            item.id === product.id || 
            (item.name === product.name && item.price === product.price)
        );

        if (existingItemIndex >= 0) {
            // Increment quantity if product is already in cart
            this.items[existingItemIndex].quantity += 1;
            console.log(`Increased quantity of "${product.name}" in cart to ${this.items[existingItemIndex].quantity}`);
        } else {
            // Add new item with quantity 1
            this.items.push({
                ...product,
                quantity: 1,
                addedAt: new Date().toISOString()
            });
            console.log(`Added "${product.name}" to cart`);
        }

        // Update the cart UI and badge count
        this.updateCartUI();
        
        return this.items.length;
    },

    /**
     * Removes a product from the cart.
     * @param {string} productId - ID of the product to remove
     */
    removeItem(productId) {
        const initialLength = this.items.length;
        this.items = this.items.filter(item => 
            item.id !== productId && 
            !(item.uniqueId && item.uniqueId === productId)
        );
        
        if (initialLength !== this.items.length) {
            console.log(`Removed item from cart. ${this.items.length} items remaining.`);
            this.updateCartUI();
        }
        
        return this.items.length;
    },

    /**
     * Changes the quantity of a product in the cart.
     * @param {string} productId - ID of the product
     * @param {number} newQuantity - New quantity (must be positive)
     */
    updateQuantity(productId, newQuantity) {
        if (newQuantity <= 0) {
            return this.removeItem(productId);
        }

        const itemIndex = this.items.findIndex(item => 
            item.id === productId || 
            (item.uniqueId && item.uniqueId === productId)
        );

        if (itemIndex >= 0) {
            this.items[itemIndex].quantity = newQuantity;
            console.log(`Updated quantity of "${this.items[itemIndex].name}" to ${newQuantity}`);
            this.updateCartUI();
        }
        
        return this.items.length;
    },

    /**
     * Gets the total number of items in the cart.
     */
    get totalItems() {
        return this.items.reduce((total, item) => total + (item.quantity || 1), 0);
    },

    /**
     * Gets the total price of all items in the cart.
     */
    get totalPrice() {
        return this.items.reduce((total, item) => {
            // Prices should already be in cents by this point
            // If not a number, default to 0
            const itemPrice = typeof item.price === 'number' ? item.price : 0;
            
            // Log price debugging info
            if (itemPrice === 0) {
                console.warn("Item has zero or invalid price:", item);
            }
            
            return total + (itemPrice * (item.quantity || 1));
        }, 0);
    },

    /**
     * Formats a price in cents to a proper currency string.
     * All prices in the cart are stored as cents internally.
     * @param {number} cents - Price in cents
     * @returns {string} Formatted price string
     */
    formatPrice(cents) {
        // Make sure we're working with a number
        if (isNaN(cents)) {
            console.warn("Invalid price value:", cents);
            return "$0.00";
        }
        // Convert cents to dollars for display
        return `$${(cents / 100).toFixed(2)}`;
    },

    /**
     * Clears all items from the cart.
     */
    clearCart() {
        this.items = [];
        console.log("Cart cleared");
        this.updateCartUI();
    },
    
    /**
     * Opens the cart panel.
     */
    openCart() {
        this.isOpen = true;
        this.updateCartUI();
    },
    
    /**
     * Closes the cart panel.
     */
    closeCart() {
        this.isOpen = false;
        this.updateCartUI();
    },
    
    /**
     * Toggles the cart panel open/closed.
     */
    toggleCart() {
        this.isOpen = !this.isOpen;
        this.updateCartUI();
    },
    
    /**
     * Creates a cart item element.
     * @param {Object} item - The cart item
     * @returns {HTMLElement} The cart item element
     */
    createCartItemElement(item) {
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.dataset.id = item.id;
        
        // Create image
        const imageEl = document.createElement('img');
        imageEl.className = 'cart-item-image';
        imageEl.src = item.image || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSIgZmlsbD0iIzZiNzI4MCI+SW1hZ2UgbWlzc2luZzwvdGV4dD48L3N2Zz4=';
        imageEl.alt = item.name;
        imageEl.onerror = () => {
            imageEl.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSIgZmlsbD0iIzZiNzI4MCI+SW1hZ2UgbWlzc2luZzwvdGV4dD48L3N2Zz4=';
        };
        itemEl.appendChild(imageEl);
        
        // Create details container
        const detailsEl = document.createElement('div');
        detailsEl.className = 'cart-item-details';
        
        // Add name
        const nameEl = document.createElement('h4');
        nameEl.className = 'cart-item-name';
        nameEl.textContent = item.name;
        detailsEl.appendChild(nameEl);
        
        // Add price
        const priceEl = document.createElement('p');
        priceEl.className = 'cart-item-price';
        
        // Format the price - ALL prices in cart should be in cents already
        let formattedPrice = '';
        if (typeof item.price === 'number') {
            // Price is in cents - just use the formatPrice method to convert to dollars
            console.log(`Formatting cart item price: ${item.price} cents = ${(item.price / 100).toFixed(2)} dollars`);
            formattedPrice = this.formatPrice(item.price);
        } else if (typeof item.price === 'string') {
            if (item.price.startsWith('$')) {
                // Already formatted
                formattedPrice = item.price;
            } else {
                const matches = item.price.match(/[0-9]+(\.[0-9]+)?/);
                if (matches && matches.length > 0) {
                    const priceValue = parseFloat(matches[0]);
                    // Assuming the string price is in cents already
                    formattedPrice = this.formatPrice(priceValue);
                } else {
                    formattedPrice = item.price;
                }
            }
        } else if (item.price && typeof item.price === 'object') {
            if (item.price.amount) {
                if (typeof item.price.amount === 'number') {
                    // Price amount is in cents
                    formattedPrice = this.formatPrice(item.price.amount);
                } else {
                    const matches = String(item.price.amount).match(/[0-9]+(\.[0-9]+)?/);
                    if (matches && matches.length > 0) {
                        const priceValue = parseFloat(matches[0]);
                        // Assuming the amount is in cents already
                        formattedPrice = this.formatPrice(priceValue);
                    }
                }
            }
        }
        
        priceEl.textContent = formattedPrice || 'Price unavailable';
        console.log(`Cart item displayed price: ${priceEl.textContent}`);
        
        detailsEl.appendChild(priceEl);
        
        // Add merchant name
        if (item.merchant) {
            const merchantEl = document.createElement('small');
            merchantEl.className = 'cart-item-merchant';
            merchantEl.textContent = item.merchant;
            detailsEl.appendChild(merchantEl);
        }
        
        // Add controls
        const controlsEl = document.createElement('div');
        controlsEl.className = 'cart-item-controls';
        
        // Quantity controls
        const quantityControlEl = document.createElement('div');
        quantityControlEl.className = 'quantity-control';
        
        const decreaseBtn = document.createElement('button');
        decreaseBtn.className = 'quantity-btn';
        decreaseBtn.textContent = '-';
        decreaseBtn.title = 'Decrease quantity';
        decreaseBtn.addEventListener('click', () => {
            const currentQuantity = parseInt(quantityValueEl.textContent);
            this.updateQuantity(item.id, currentQuantity - 1);
        });
        quantityControlEl.appendChild(decreaseBtn);
        
        const quantityValueEl = document.createElement('span');
        quantityValueEl.className = 'quantity-value';
        quantityValueEl.textContent = item.quantity;
        quantityControlEl.appendChild(quantityValueEl);
        
        const increaseBtn = document.createElement('button');
        increaseBtn.className = 'quantity-btn';
        increaseBtn.textContent = '+';
        increaseBtn.title = 'Increase quantity';
        increaseBtn.addEventListener('click', () => {
            const currentQuantity = parseInt(quantityValueEl.textContent);
            this.updateQuantity(item.id, currentQuantity + 1);
        });
        quantityControlEl.appendChild(increaseBtn);
        
        controlsEl.appendChild(quantityControlEl);
        
        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-item-btn';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => {
            this.removeItem(item.id);
        });
        controlsEl.appendChild(removeBtn);
        
        detailsEl.appendChild(controlsEl);
        itemEl.appendChild(detailsEl);
        
        return itemEl;
    },
    
    /**
     * Updates the cart UI to reflect the current state.
     */
    updateCartUI() {
        // Make sure all UI elements are initialized
        if (!this.cartPanel || !this.cartBadge || !this.cartTotalPrice || !this.cartItems || !this.checkoutBtn) {
            console.warn("Cart UI elements not initialized. Call cartState.init() first.");
            return;
        }
        
        // Update cart panel visibility
        if (this.isOpen) {
            this.cartPanel.classList.add('open');
        } else {
            this.cartPanel.classList.remove('open');
        }
        
        // Update badge count
        const totalItems = this.totalItems;
        if (totalItems > 0) {
            this.cartBadge.textContent = totalItems > 99 ? '99+' : totalItems;
            this.cartBadge.style.display = 'flex';
        } else {
            this.cartBadge.style.display = 'none';
        }
        
        // Update total price (totalPrice is in cents, formatPrice converts to dollars)
        const totalInCents = this.totalPrice;
        const totalInDollars = totalInCents / 100;
        console.log(`Cart total: ${totalInCents} cents = $${totalInDollars.toFixed(2)}`);
        this.cartTotalPrice.textContent = this.formatPrice(totalInCents);
        
        // Update checkout button
        this.checkoutBtn.disabled = totalItems === 0;
        
        // Update cart items
        this.cartItems.innerHTML = '';
        
        if (this.items.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-cart-message';
            emptyMessage.textContent = 'Your cart is empty';
            this.cartItems.appendChild(emptyMessage);
        } else {
            // Sort by added time, newest first
            const sortedItems = [...this.items].sort((a, b) => 
                new Date(b.addedAt || 0) - new Date(a.addedAt || 0)
            );
            
            // Create and append cart items
            sortedItems.forEach(item => {
                const itemEl = this.createCartItemElement(item);
                this.cartItems.appendChild(itemEl);
            });
        }
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

// --- Vision Mode State Management ---
/**
 * Manages vision mode settings and model selection.
 */
const visionModeState = {
    isPro: false,
    quality: 'low', // Default Pro mode to low quality
    hasShownProWarning: false,

    /** Initialize vision mode from localStorage */
    init() {
        const saved = localStorage.getItem('visionMode');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.isPro = parsed.isPro || false;
                this.quality = parsed.quality || 'low';
                this.hasShownProWarning = parsed.hasShownProWarning || false;
            } catch (e) {
                console.log('Error parsing saved vision mode:', e);
            }
        }
        this.updateUI();
        this.updateModels();
        console.log('Vision mode initialized:', { isPro: this.isPro, quality: this.quality });
    },

    /** Save current state to localStorage */
    save() {
        const state = {
            isPro: this.isPro,
            quality: this.quality,
            hasShownProWarning: this.hasShownProWarning
        };
        localStorage.setItem('visionMode', JSON.stringify(state));
        console.log('Vision mode saved:', state);
    },

    /** Toggle between Fast and Pro mode */
    async toggleMode() {
        console.log('toggleMode() called, current isPro:', this.isPro);
        
        // If switching FROM Fast TO Pro, show warning
        if (!this.isPro && !this.hasShownProWarning) {
            console.log('Switching to Pro mode - showing warning...');
            const confirmed = await this.showProModeWarning();
            if (!confirmed) {
                console.log('User declined Pro mode - staying in Fast mode');
                // Make sure UI reflects the current state (Fast mode)
                this.updateUI();
                return;
            }
            this.hasShownProWarning = true;
        }

        // Toggle the mode
        const previousMode = this.isPro;
        this.isPro = !this.isPro;
        console.log(`Mode changed from ${previousMode ? 'Pro' : 'Fast'} to ${this.isPro ? 'Pro' : 'Fast'}`);
        
        this.updateUI();
        this.updateModels();
        this.save();
        console.log('Vision mode toggled to:', this.isPro ? 'Pro' : 'Fast');
    },

    /** Set quality level */
    setQuality(quality) {
        this.quality = quality;
        this.save();
        console.log('Vision quality set to:', quality);
    },

    /** Update UI to reflect current state */
    updateUI() {
        const controls = document.querySelector('.vision-controls');
        const toggle = document.getElementById('vision-mode-toggle');
        const qualitySelect = document.getElementById('vision-quality');

        console.log('updateUI() called', { controls, toggle, qualitySelect, isPro: this.isPro });

        if (controls) {
            if (this.isPro) {
                controls.classList.add('pro-mode');
                controls.classList.add('activating-pro');
                setTimeout(() => controls.classList.remove('activating-pro'), 500);
            } else {
                controls.classList.remove('pro-mode');
            }
        }

        if (toggle) {
            toggle.checked = this.isPro;
            console.log('Checkbox updated to:', this.isPro);
        }

        if (qualitySelect) {
            qualitySelect.value = this.quality;
            console.log('Quality dropdown updated to:', this.quality);
        }
    },

    /** Update model constants based on current mode */
    updateModels() {
        console.log('updateModels() called, isPro:', this.isPro);
        
        if (this.isPro) {
            IMAGE_MODEL = "gpt-image-1"; // Use gpt-image-1 for Pro mode images
            ORCHESTRATOR_MODEL = "gemini-2.5-flash-preview-04-17"; // Keep orchestrator as Gemini
            console.log('Set to Pro models (GPT Image 1 + Gemini orchestrator)');
        } else {
            IMAGE_MODEL = "gemini-2.0-flash-preview-image-generation";
            ORCHESTRATOR_MODEL = "gemini-2.5-flash-preview-04-17";
            console.log('Set to Fast models (Gemini)');
        }
        console.log('Models updated:', { IMAGE_MODEL, ORCHESTRATOR_MODEL });
    },

    /** Show Pro mode warning dialog */
    showProModeWarning() {
        return new Promise((resolve) => {
            console.log('Creating Pro mode warning dialog...');
            
            const overlay = document.createElement('div');
            overlay.className = 'pro-warning-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                backdrop-filter: blur(5px);
            `;

            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: white;
                padding: 30px;
                border-radius: 12px;
                max-width: 500px;
                margin: 20px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                text-align: center;
            `;

            // Create buttons as DOM elements instead of innerHTML
            const title = document.createElement('div');
            title.style.cssText = 'font-size: 2rem; margin-bottom: 16px;';
            title.textContent = '⚡ Pro Mode';

            const heading = document.createElement('h3');
            heading.style.cssText = 'color: #9333ea; margin: 0 0 16px 0;';
            heading.textContent = 'Enhanced AI Vision';

            const description = document.createElement('p');
            description.style.cssText = 'color: #6b7280; margin: 0 0 20px 0; line-height: 1.5;';
            description.textContent = 'Pro mode uses advanced AI models for superior image generation and analysis. This provides higher quality results but may take longer and cost more per request.';

            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = 'display: flex; gap: 12px; justify-content: center;';

            const cancelBtn = document.createElement('button');
            cancelBtn.id = 'pro-cancel-btn';
            cancelBtn.textContent = 'Keep Fast Mode';
            cancelBtn.style.cssText = `
                padding: 10px 20px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                background: white;
                color: #374151;
                cursor: pointer;
                font-size: 14px;
            `;

            const confirmBtn = document.createElement('button');
            confirmBtn.id = 'pro-confirm-btn';
            confirmBtn.textContent = 'Enable Pro Mode';
            confirmBtn.style.cssText = `
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                background: #9333ea;
                color: white;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
            `;

            buttonContainer.appendChild(cancelBtn);
            buttonContainer.appendChild(confirmBtn);

            dialog.appendChild(title);
            dialog.appendChild(heading);
            dialog.appendChild(description);
            dialog.appendChild(buttonContainer);

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            console.log('Dialog added to DOM, setting up event listeners...');

            // Add event listeners directly to the created elements
            const handleCancel = (e) => {
                console.log('Cancel button clicked via', e.type);
                e.preventDefault();
                e.stopPropagation();
                console.log('Attempting to remove overlay...');
                try {
                    if (document.body.contains(overlay)) {
                        document.body.removeChild(overlay);
                        console.log('Dialog closed - keeping Fast mode');
                        resolve(false);
                    } else {
                        console.log('Overlay already removed');
                        resolve(false);
                    }
                } catch (err) {
                    console.error('Error removing overlay:', err);
                    resolve(false);
                }
            };

            const handleConfirm = (e) => {
                console.log('Confirm button clicked via', e.type);
                e.preventDefault();
                e.stopPropagation();
                console.log('Attempting to remove overlay...');
                try {
                    if (document.body.contains(overlay)) {
                        document.body.removeChild(overlay);
                        console.log('Dialog closed - enabling Pro mode');
                        resolve(true);
                    } else {
                        console.log('Overlay already removed');
                        resolve(true);
                    }
                } catch (err) {
                    console.error('Error removing overlay:', err);
                    resolve(true);
                }
            };

            // Add multiple event listeners to ensure they work
            cancelBtn.addEventListener('click', handleCancel);
            cancelBtn.addEventListener('mousedown', handleCancel);
            confirmBtn.addEventListener('click', handleConfirm);
            confirmBtn.addEventListener('mousedown', handleConfirm);

            console.log('Event listeners added to buttons');

            // Test if buttons are clickable
            setTimeout(() => {
                console.log('Testing button presence:', {
                    cancelBtn: cancelBtn,
                    confirmBtn: confirmBtn,
                    cancelBtnInDom: document.contains(cancelBtn),
                    confirmBtnInDom: document.contains(confirmBtn)
                });
            }, 100);

            overlay.addEventListener('click', (e) => {
                console.log('Overlay clicked, target:', e.target, 'overlay:', overlay);
                if (e.target === overlay) {
                    console.log('Closing dialog via overlay click');
                    try {
                        document.body.removeChild(overlay);
                        resolve(false);
                    } catch (err) {
                        console.error('Error removing overlay:', err);
                        resolve(false);
                    }
                }
            });
        });
    }
};

// --- UI Initialization Functions ---
function displayWelcomeMessage() {
    conversationArea.innerHTML = '';
    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = 'welcome-message';
    welcomeDiv.innerHTML = `
        <h2>Welcome to Vetted Nest! <img src="logo_full.png" alt="Vetted Nest" style="height:64px; margin-left:8px; vertical-align:middle; opacity:0.8;"></h2>
        <p>Your AI-powered home remodeling assistant with real product integration. Upload a room photo and transform your space with purchasable products:</p>
        
        <div style="text-align:left; margin:20px 0;">
            <h3 style="margin-bottom:10px; color:#2563eb;">🏠 Core Features</h3>
            <ul style="margin-left:20px; line-height:1.6;">
                <li><strong>AI Room Redesign:</strong> Conversational design with intelligent suggestions</li>
                <li><strong>Fast/Pro Vision Modes:</strong> Toggle between Gemini (Fast) and GPT Image 1 (Pro) for different quality levels</li>
                <li><strong>Product Discovery:</strong> Find real products that match your design</li>
                <li><strong>Shopping Integration:</strong> Add items to cart and purchase directly</li>
            </ul>
        </div>

        <div style="text-align:left; margin:20px 0;">
            <h3 style="margin-bottom:10px; color:#16a34a;">🛍️ Product Card Features</h3>
            <ul style="margin-left:20px; line-height:1.6;">
                <li><strong>🖼️ "Add to Room Design":</strong> Visualize specific products in your space</li>
                <li><strong>🛒 "Add to Cart":</strong> Save items for purchase</li>
                <li><strong>🔍 "More Like This":</strong> Find similar products (by style, color, or brand)</li>
            </ul>
        </div>

        <div style="text-align:left; margin:20px 0;">
            <h3 style="margin-bottom:10px; color:#7c3aed;">🎨 Design Control Features</h3>
            <ul style="margin-left:20px; line-height:1.6;">
                <li><strong>🔄 "Start From Scratch":</strong> Reset to your original room photo for a completely new design direction</li>
                <li><strong>✏️ "Edit This Design":</strong> Modify a specific design version while keeping others intact</li>
            </ul>
        </div>

        <p style="margin:20px 0; padding:15px; background-color:#f8fafc; border-left:4px solid #3b82f6; border-radius:0 6px 6px 0;">
            <strong>💡 Pro Tip:</strong> You can use the product card buttons for quick actions, or simply talk to me naturally! 
            Say things like "show me sofa X in my room" or "add lamp Y to my cart."
        </p>
        
        <p class="example-query"><strong>Example:</strong> "Give this room a cozy, rustic feel with natural wood elements."</p>
        
        <div style="margin:20px 0; padding:15px; background-color:#fef2f2; border-left:4px solid #ef4444; border-radius:0 6px 6px 0; color:#991b1b;">
            <strong>⚠️ DISCLAIMER:</strong> This tool does not accurately represent dimensions yet, double-check to make sure that items fit in your room correctly yourself.
        </div>
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
                errorDisplay.textContent = "";
                // Don't clear welcome message on image upload - only on first text message
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
    console.log(`renderRemodeledImages called - selectedIndex: ${imageState.selectedIndex}`);
    remodeledImagesContainer.innerHTML = ''; // Clear existing images
    if (imageState.original) {
        const originalItemDiv = document.createElement('div');
        originalItemDiv.className = 'remodeled-image-item image-wrapper';
        if (imageState.selectedIndex === -999) {
            originalItemDiv.classList.add('selected-for-edit');
            console.log("Original image marked as selected-for-edit");
        }
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
        
        // Use onclick to prevent multiple listeners
        const originalEditBtn = originalItemDiv.querySelector('.select-for-edit-btn');
        if (originalEditBtn) {
            originalEditBtn.onclick = (event) => {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                
                console.log(`"Start from Scratch" clicked (original image)`);
                selectImageForEditing(-999);
            };
        }
    }

    if (imageState.remodels.length > 0) {
        remodelPlaceholder.style.display = 'none';
        imageState.remodels.forEach((imageData, index) => {
            const versionNumber = imageState.remodels.length - index;
            console.log(`Creating UI for Version ${versionNumber} at array index ${index}`);
            const itemDiv = document.createElement('div');
            itemDiv.className = 'remodeled-image-item image-wrapper';
            if (imageState.selectedIndex === index) {
                itemDiv.classList.add('selected-for-edit');
                console.log(`Version ${versionNumber} (index ${index}) marked as selected-for-edit`);
            }
            itemDiv.innerHTML = `
                <div class="image-header">
                    <h4>Version ${versionNumber}</h4>
                    <button type="button" class="select-for-edit-btn" data-index="${index}">
                        ${imageState.selectedIndex === index ? '✓ Selected' : 'Edit This Design'}
                    </button>
                </div>
                <div class="image-container">
                    <img src="${imageData}" alt="Design version ${versionNumber}">
                    <button type="button" class="get-room-btn" data-index="${index}">
                        <strong>Get This Room</strong>
                    </button>
                </div>
            `;
            remodeledImagesContainer.appendChild(itemDiv);
            
            // Create a more robust event handler to prevent multiple listeners
            const editBtn = itemDiv.querySelector('.select-for-edit-btn');
            if (editBtn) {
                editBtn.onclick = function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    
                    const clickedIndex = parseInt(this.getAttribute('data-index'));
                    const clickedVersion = imageState.remodels.length - clickedIndex;
                    console.log(`"Edit This Design" clicked for Version ${clickedVersion} (array index ${clickedIndex})`);
                    selectImageForEditing(clickedIndex);
                };
            }
            
            // Add event listener for "Get This Room" button using onclick to prevent multiple listeners
            const getRoomBtn = itemDiv.querySelector('.get-room-btn');
            if (getRoomBtn) {
                getRoomBtn.onclick = async function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    
                    const designIndex = parseInt(this.getAttribute('data-index'));
                    console.log(`Get This Room clicked for design version ${imageState.remodels.length - designIndex}`);
                
                // Show loading state
                this.disabled = true;
                this.innerHTML = '<strong>Finding products...</strong>';
                
                try {
                    // Add a user message to show what's happening
                    addMessageToConversation(`Finding products to recreate Design Version ${imageState.remodels.length - designIndex}...`, "user");
                    
                    // Call findSimilarProducts with automatic image analysis
                    await functionHandlers.findSimilarProducts({
                        context: `Find products to recreate the items shown in Design Version ${imageState.remodels.length - designIndex}. Focus on all items that were changed, added, or replaced in this design including furniture, decor, electronics, appliances, lighting, and any other products.`
                    });
                    
                } catch (error) {
                    console.error('Error finding room products:', error);
                    addMessageToConversation('Sorry, I had trouble finding products for this room design. Please try again.', 'ai', false, true);
                } finally {
                    // Reset button state
                    this.disabled = false;
                    this.innerHTML = '<strong>Get This Room</strong>';
                }
                };
            }
        });
    } else if (!imageState.original) { // Only show placeholder if no original image and no designs
        remodelPlaceholder.style.display = 'block';
    }
}

function selectImageForEditing(index) {
    console.log(`selectImageForEditing called with index: ${index}, current selectedIndex: ${imageState.selectedIndex}`);
    
    // Prevent rapid-fire clicks
    if (selectImageForEditing.lastCall && Date.now() - selectImageForEditing.lastCall < 200) {
        console.log(`Ignoring rapid-fire click (within 200ms)`);
        return;
    }
    selectImageForEditing.lastCall = Date.now();
    
    // Debug: Show what image will be selected
    if (index === -999) {
        console.log(`Selecting original image for editing`);
    } else if (index >= 0 && index < imageState.remodels.length) {
        const versionNumber = imageState.remodels.length - index;
        console.log(`Selecting Version ${versionNumber} (array index ${index}) for editing`);
        console.log(`Image data preview: ${imageState.remodels[index]?.substring(0, 50)}...`);
    } else {
        console.warn(`Invalid index ${index} for selection - remodels array has ${imageState.remodels.length} items`);
        return; // Don't proceed with invalid index
    }
    
    imageState.setSelectedIndex(index);
    console.log(`After setSelectedIndex, selectedIndex is now: ${imageState.selectedIndex}`);
    renderRemodeledImages(); // Re-render to update UI based on new selection

    queryInput.classList.remove('with-selected-image', 'with-original-image'); // Reset classes
    if (imageState.selectedIndex === -999) {
        queryInput.placeholder = "Describe changes to the original room...";
        queryInput.classList.add('with-selected-image', 'with-original-image');
        console.log("Set placeholder for original room editing");
    } else if (imageState.selectedIndex !== -1) {
        const versionNumber = imageState.remodels.length - imageState.selectedIndex;
        queryInput.placeholder = `Describe changes to Version ${versionNumber}...`;
        queryInput.classList.add('with-selected-image');
        console.log(`Set placeholder for Version ${versionNumber} editing`);
    } else {
        queryInput.placeholder = "Describe your vision...";
        console.log("Set default placeholder (no selection)");
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
    
    // If an image is included, make it explicit in the user message
    if (imageIncluded) {
        // Add explicit instructions for the model to generate an image
        currentMessageParts.push({ 
            text: "\n\nIMPORTANT: Please generate an image based on my request using the generateImage function. Do not respond with only text."
        });
    }
    
    // Log the function definitions being sent
    console.log("Sending function definitions to orchestrator");
    
    // Create a fresh copy of the function definitions to avoid any caching issues
    const functionDefinitions = JSON.parse(JSON.stringify(ORCHESTRATOR_FUNCTION_DEFINITIONS));
    
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
        console.log("Function calls detected:", functionCalls.length);
        
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
        console.log(`Calling orchestrator model - visionModeState.isPro: ${visionModeState.isPro} (${visionModeState.isPro ? 'GPT Pro' : 'Gemini Fast'} mode)...`);
        
        // Route to appropriate API based on vision mode
        if (visionModeState.isPro) {
            console.log('Routing to GPT orchestrator');
            return await callGptOrchestratorWithFallback(userMessage, conversationHistory, currentImage);
        } else {
            console.log('Routing to Gemini orchestrator');
            return await callGeminiOrchestrator(userMessage, conversationHistory, currentImage);
        }
    } catch (error) {
        console.error("Error in orchestrator model call:", error);
        throw error;
    }
}

// GPT orchestrator with fallback to Gemini
async function callGptOrchestratorWithFallback(userMessage, conversationHistory, currentImage = null) {
    try {
        console.log("Pro mode orchestration requested...");
        
        // GPT function calling works but for consistency with image generation, use Gemini until GPT Image 1 is available
        console.log("Using Gemini orchestrator for Pro mode until GPT Image 1 integration is complete.");
        // Remove Pro mode message per user request
        
        // Use Gemini orchestrator with enhanced settings for Pro mode
        return await callGeminiOrchestrator(userMessage, conversationHistory, currentImage);
        
    } catch (error) {
        console.error("Pro mode orchestration failed:", error);
        addMessageToConversation("⚠️ Request processing failed. Please try again.", "ai", true);
        throw error;
    }
}

// Gemini orchestrator implementation
async function callGeminiOrchestrator(userMessage, conversationHistory, currentImage = null) {
    try {
        console.log("Calling Gemini orchestrator...");
        const apiKey = await fetchApiKeys();
        
        // Format the conversation history for the orchestrator
        const formattedHistory = formatHistoryForOrchestrator(conversationHistory);
        
        // Build the request body
        const requestBody = buildOrchestratorRequestBody(formattedHistory, userMessage, currentImage);
        
        console.log("Calling orchestrator API...");
        
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
        console.log(`Calling image generation model - visionModeState.isPro: ${visionModeState.isPro} (${visionModeState.isPro ? 'GPT Pro' : 'Gemini Fast'} mode)...`);
        
        // Route to appropriate API based on vision mode
        if (visionModeState.isPro) {
            console.log('Routing to GPT image generation');
            return await callGptImageGenerationWithFallback(imageData, instructions);
        } else {
            console.log('Routing to Gemini image generation');
            return await callGeminiImageGeneration(imageData, instructions);
        }
    } catch (error) {
        console.error("Error calling image generation model:", error);
        throw error;
    }
}

// GPT image generation with fallback to Gemini
async function callGptImageGenerationWithFallback(imageData, instructions) {
    try {
        console.log("Pro mode image generation requested - attempting GPT Image 1...");
        
        // Try GPT Image 1 (gpt-4o-mini-2024-07-18) first
        try {
            return await callGptImageGeneration(imageData, instructions);
        } catch (gptError) {
            console.log("GPT Image 1 failed, falling back to Gemini:", gptError.message);
            
            // Check if it's a model availability issue
            if (gptError.message.includes('model') || gptError.message.includes('not found') || gptError.message.includes('unavailable')) {
                // Remove Pro mode fallback message per user request
            } else {
                addMessageToConversation("⚠️ Pro mode image generation encountered an issue. Using Fast mode for this request.", "ai", true);
            }
            
            return await callGeminiImageGeneration(imageData, instructions);
        }
        
    } catch (error) {
        console.error("Both GPT and Gemini image generation failed:", error);
        addMessageToConversation("⚠️ Image generation failed. Please try again.", "ai", true);
        throw error;
    }
}

// Gemini image generation implementation
async function callGeminiImageGeneration(imageData, instructions) {
    try {
        console.log(`Calling Gemini image generation with model: ${IMAGE_MODEL}`);
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
        console.error("Error calling Gemini image generation:", error);
        throw error;
    }
}

// GPT product integration with fallback
async function callGptProductIntegrationWithFallback(roomImageData, productImageData, instructions, itemToReplace) {
    try {
        console.log("Pro mode product integration requested - attempting GPT Image 1...");
        
        // Try GPT Image 1 first
        try {
            return await callGptProductIntegration(roomImageData, productImageData, instructions, itemToReplace);
        } catch (gptError) {
            console.log("GPT Image 1 product integration failed, falling back to Gemini:", gptError.message);
            
            // Check if it's a model availability issue
            if (gptError.message.includes('model') || gptError.message.includes('not found') || gptError.message.includes('unavailable')) {
                // Remove Pro mode product integration message per user request
            } else {
                addMessageToConversation("⚠️ Pro mode product integration encountered an issue. Using Fast mode for this request.", "ai", true);
            }
            
            return await callGeminiProductIntegration(roomImageData, productImageData, instructions, itemToReplace);
        }
        
    } catch (error) {
        console.error("Both GPT and Gemini product integration failed:", error);
        addMessageToConversation("⚠️ Product integration failed. Please try again.", "ai", true);
        throw error;
    }
}

// Gemini product integration implementation
async function callGeminiProductIntegration(roomImageData, productImageData, instructions, itemToReplace) {
    try {
        console.log(`Calling Gemini product integration with model: ${IMAGE_MODEL}`);
        const apiKey = await fetchApiKeys();
        
        // Build the request body for product integration
        const requestBody = buildProductIntegrationRequestBody(roomImageData, productImageData, instructions, itemToReplace);
        
        // Call the Gemini API with the image generation model
        const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${apiKey}`;
        
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: { message: "Unknown API error." } }));
            throw new Error(`Product Integration API Error (${response.status}): ${errorData.error?.message || "Request failed"}`);
        }
        
        const responseData = await response.json();
        return parseImageModelResponse(responseData);
    } catch (error) {
        console.error("Error calling Gemini product integration:", error);
        throw error;
    }
}

// GPT product integration implementation
async function callGptProductIntegration(roomImageData, productImageData, instructions, itemToReplace) {
    try {
        const apiKey = await fetchGptApiKey();
        
        console.log(`Calling GPT Image 1 for product integration with model: gpt-image-1`);
        
        // Build the prompt for product integration
        const productIntegrationPrompt = `
You are an AI interior design visualization expert specialized in precise product integration.

Your task is to place a real product image into a room design, replacing an existing item.

CRITICAL REQUIREMENTS - FOLLOW EXACTLY:
1. You will receive a room image to modify
2. Identify the ${itemToReplace} in the room image and replace it with the provided product
3. STRICTLY PRESERVE the exact shape, color, design, materials, and visual characteristics of the product image
4. Do NOT modify, recolor, or alter the product's appearance in any way
5. The product must look EXACTLY like it does in the reference product image
6. THIS IS THE MOST IMPORTANT PART: **DO NOT CHANGE ANY ITEM BEYOND THE ONES REQUESTED AND DON'T CHANGE THE PERSPECTIVE OF THE ROOM IN ANY WAY!**
7. Adjust ONLY the perspective, scale, lighting, and shadows to fit the room naturally
8. Do NOT change any other elements in the room
9. The product should appear as if it was photographed in that exact room location

PRODUCT FIDELITY REQUIREMENTS:
- Keep the exact colors from the product image
- Preserve all design details, patterns, textures, and materials
- Maintain the product's proportions and shape precisely
- Do not stylize or modify the product to "match" the room's style
- The product should look like the exact same item from the product photo

INTELLIGENT PRODUCT INTERPRETATION:
- For paint products: Apply the COLOR/SHADE from the product image to the appropriate surface (walls, furniture, etc.), not the paint container itself
- For fabric/textile products: Apply the material, pattern, and color to the appropriate surface, not the fabric roll or sample
- For finish/coating products: Apply the finish effect to the surface, not the container
- For other liquid/powder products: Focus on the END RESULT of using the product, not the packaging
- For solid objects (furniture, electronics, etc.): Place the actual object as shown in the product image

This is a commercial product visualization feature where accuracy to the actual product result is critical.

${instructions}
        `.trim();

        // Build FormData request similar to the working image editing approach
        const formData = buildGptProductIntegrationFormData(roomImageData, productImageData, productIntegrationPrompt);
        
        console.log("Calling GPT Image 1 editing API for product integration...");
        
        const response = await fetch('https://api.openai.com/v1/images/edits', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`
                // Note: Don't set Content-Type for FormData, browser sets it automatically with boundary
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenAI image editing API error:", errorText);
            throw new Error(`OpenAI image editing API failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.data || data.data.length === 0) {
            throw new Error("No image data returned from OpenAI API");
        }

        const imageResult = data.data[0];
        
        if (imageResult.b64_json) {
            const generatedImage = `data:image/png;base64,${imageResult.b64_json}`;
            console.log("GPT Image 1 product integration successful");
            
            return {
                text: `I've successfully integrated the ${itemToReplace} using GPT Image 1's advanced product integration capabilities.`,
                image: generatedImage
            };
        } else if (imageResult.url) {
            // Convert URL to base64 if needed
            const response = await fetch(imageResult.url);
            const blob = await response.blob();
            const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
            
            console.log("GPT Image 1 product integration successful");
            
            return {
                text: `I've successfully integrated the ${itemToReplace} using GPT Image 1's advanced product integration capabilities.`,
                image: base64
            };
        } else {
            throw new Error("No valid image format returned from OpenAI API");
        }
        
    } catch (error) {
        console.error("GPT Image 1 product integration error:", error);
        throw error;
    }
}

// Build GPT product integration request body
function buildGptProductIntegrationRequestBody(roomImageData, productImageData, instructions, itemToReplace) {
    const productIntegrationPrompt = `
        You are an AI interior design visualization expert specialized in product integration.
        
        Your task is to place a real product image into a room design, replacing an existing item.
        
        CRITICAL REQUIREMENTS:
        1. You will receive TWO images: first the room image, then the product image
        2. Identify the ${itemToReplace} in the room image and replace it with the product
        3. THIS IS THE MOST IMPORTANT PART: **DO NOT CHANGE ANY ITEM BEYOND THE ONES REQUESTED AND DON'T CHANGE THE PERSPECTIVE OF THE ROOM IN ANY WAY!**
        4. The integration should look natural and realistic
        5. Do NOT change any other elements in the room
        6. Use advanced image editing techniques to adjust perspective, scale, lighting, and shadows
        7. Your response MUST include an image showing the room with the integrated product
        
        This is a commercial product visualization feature, so quality and realism are paramount.
        
        ${instructions}
    `;

    const messages = [
        {
            role: "user",
            content: [
                {
                    type: "text",
                    text: productIntegrationPrompt
                },
                {
                    type: "image_url",
                    image_url: {
                        url: roomImageData,
                        detail: visionModeState.quality
                    }
                },
                {
                    type: "image_url", 
                    image_url: {
                        url: productImageData,
                        detail: visionModeState.quality
                    }
                }
            ]
        }
    ];

    return {
        model: "gpt-4o",
        messages: messages,
        max_tokens: 4000,
        temperature: 0.1
    };
}

// Build a request for product integration with room image and product image
function buildProductIntegrationRequestBody(roomImageData, productImageData, instructions, itemToReplace) {
    const parts = [];
    
    // Add the system prompt with special instructions for product integration
    const productIntegrationPrompt = `
        You are an AI interior design visualization expert specialized in precise product integration.
        
        Your task is to place a real product image into a room design, replacing an existing item.
        
        CRITICAL REQUIREMENTS:
        1. You will receive TWO images: first the room image, then the product image
        2. Identify the ${itemToReplace} in the room image and replace it with the product
        3. STRICTLY PRESERVE the exact appearance of the product image:
           - Keep the EXACT colors, patterns, textures, and materials from the product photo
           - Maintain the precise shape, proportions, and design details
           - Do NOT alter, recolor, or modify the product's visual characteristics in any way
           - The product must look identical to how it appears in the reference image
        4. THIS IS THE MOST IMPORTANT PART: **DO NOT CHANGE ANY ITEM BEYOND THE ONES REQUESTED AND DON'T CHANGE THE PERSPECTIVE OF THE ROOM IN ANY WAY!**
        5. Adjust ONLY the perspective, scale, positioning, lighting, and shadows to fit the product naturally in the room
        6. Do NOT change any other elements in the room
        7. Use advanced image editing techniques for realistic integration while preserving product fidelity
        8. Your response MUST include an image showing the room with the integrated product
        
        INTELLIGENT PRODUCT INTERPRETATION:
        - For paint products: Apply the COLOR/SHADE from the product image to the appropriate surface (walls, furniture, etc.), not the paint container itself
        - For fabric/textile products: Apply the material, pattern, and color to the appropriate surface, not the fabric roll or sample
        - For finish/coating products: Apply the finish effect to the surface, not the container
        - For other liquid/powder products: Focus on the END RESULT of using the product, not the packaging
        - For solid objects (furniture, electronics, etc.): Place the actual object as shown in the product image
        
        This is a commercial product visualization feature where accuracy to the actual product result is critical.
    `;
    
    parts.push({ text: productIntegrationPrompt + "\n\n" });
    
    // Add room image
    const roomBase64Data = roomImageData.replace(/^data:image\/[a-z]+;base64,/, "");
    const roomImgMimeType = roomImageData.match(/^data:(image\/[a-z]+);base64,/)?.[1] || 'image/jpeg';
    parts.push({ inline_data: { mime_type: roomImgMimeType, data: roomBase64Data } });
    
    // Add product image
    const productBase64Data = productImageData.replace(/^data:image\/[a-z]+;base64,/, "");
    const productImgMimeType = productImageData.match(/^data:(image\/[a-z]+);base64,/)?.[1] || 'image/jpeg';
    parts.push({ inline_data: { mime_type: productImgMimeType, data: productBase64Data } });
    
    // Add specific instructions with directives for integration
    parts.push({ text: instructions + "\n\nPlease include an image in your response showing the room with the integrated product." });
    
    // Return the complete request body
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

// Call the image generation model with both room and product images
async function callProductIntegrationModel(roomImageData, productImageData, instructions, itemToReplace) {
    try {
        console.log(`Calling product integration model - visionModeState.isPro: ${visionModeState.isPro} (${visionModeState.isPro ? 'GPT Pro' : 'Gemini Fast'} mode)...`);
        
        // Route to appropriate API based on vision mode
        if (visionModeState.isPro) {
            console.log('Routing to GPT product integration');
            return await callGptProductIntegrationWithFallback(roomImageData, productImageData, instructions, itemToReplace);
        } else {
            console.log('Routing to Gemini product integration');
            return await callGeminiProductIntegration(roomImageData, productImageData, instructions, itemToReplace);
        }
    } catch (error) {
        console.error("Error calling product integration model:", error);
        throw error;
    }
}

// Function handlers for orchestrator model functions
const functionHandlers = {
    // Handler for generateImage function
    async generateImage(args) {
        console.log("Handling generateImage function call");
        
        // Get the image data based on imageId
        let imageToModify;
        
        if (args.imageId === "original") {
            imageToModify = imageState.original;
            console.log("Using original image for modification");
        } else if (args.imageId === "latest") {
            // Respect user's selection when "latest" is requested
            if (imageState.selectedIndex === -999) {
                imageToModify = imageState.original;
                console.log("Using selected original image for modification");
            } else if (imageState.selectedIndex >= 0) {
                imageToModify = imageState.remodels[imageState.selectedIndex];
                console.log(`Using selected design version ${imageState.remodels.length - imageState.selectedIndex} for modification`);
            } else {
                imageToModify = imageState.latestRemodel || imageState.original;
                console.log("Using latest remodeled image for modification (no selection)");
            }
        } else {
            // Try to parse as a version number
            const versionIndex = parseInt(args.imageId);
            if (!isNaN(versionIndex) && versionIndex >= 0 && versionIndex < imageState.remodels.length) {
                imageToModify = imageState.remodels[versionIndex];
                console.log(`Using specific remodel version ${versionIndex} for modification`);
            } else {
                // Respect user's selection as fallback
                if (imageState.selectedIndex === -999) {
                    imageToModify = imageState.original;
                    console.log("Invalid imageId, using selected original image");
                } else if (imageState.selectedIndex >= 0) {
                    imageToModify = imageState.remodels[imageState.selectedIndex];
                    console.log(`Invalid imageId, using selected design version ${imageState.remodels.length - imageState.selectedIndex}`);
                } else {
                    imageToModify = imageState.latestRemodel || imageState.original;
                    console.log("Invalid imageId, using latest available image");
                }
            }
        }
        
        if (!imageToModify) {
            throw new Error("No image available to modify. Please upload an image first.");
        }
        
        // Call the image generation model with the image and instructions
        const result = await callImageGenerationModel(imageToModify, args.instructions);
        
        // If an image was generated, update the appropriate design based on user selection
        if (result.image) {
            // Always add as new design regardless of selection
            imageState.addRemodeledImage(result.image);
            console.log("Added new design version");
            renderRemodeledImages();
        }
        
        return {
            text: result.text,
            image: result.image
        };
    },
    
    // Handler for addToImage function - adding a real product to the room
    async addToImage(args) {
        console.log("Handling addToImage function call");
        
        // Get the room image to modify - use selected image if any, otherwise latest remodel
        let roomImage;
        if (imageState.selectedIndex === -999) {
            // User selected original image
            roomImage = imageState.original;
        } else if (imageState.selectedIndex >= 0) {
            // User selected a specific remodel
            roomImage = imageState.remodels[imageState.selectedIndex];
        } else {
            // No selection, use latest remodel
            roomImage = imageState.latestRemodel;
        }
        
        if (!roomImage) {
            throw new Error("No room image available. Please select a design or generate one first.");
        }
        
        console.log("Using room image from:", 
            imageState.selectedIndex === -999 ? "original" : 
            imageState.selectedIndex >= 0 ? `design version ${imageState.remodels.length - imageState.selectedIndex}` : 
            "latest design");
        
        
        // Get product image - could be URL or base64
        let productImage = args.productImageUrl;
        
        // If it's a URL, we need to fetch it and convert to base64
        if (productImage.startsWith('http')) {
            try {
                // Use our proxy to avoid CORS issues
                const encodedUrl = encodeURIComponent(productImage);
                const proxyUrl = `/api/proxy/${encodedUrl}`;
                console.log("Using proxy to fetch product image:", proxyUrl);
                
                // Fetch the image
                const response = await fetch(proxyUrl);
                if (!response.ok) {
                    throw new Error(`Failed to fetch product image: ${response.status} ${response.statusText}`);
                }
                
                // Convert to blob and then to base64
                const blob = await response.blob();
                if (!blob.type.startsWith('image/')) {
                    throw new Error(`Received non-image content: ${blob.type}`);
                }
                
                // Create a FileReader to convert the blob to base64
                productImage = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } catch (error) {
                console.error("Error fetching product image:", error);
                throw new Error(`Could not fetch product image: ${error.message}`);
            }
        }
        
        // Create specific instructions for the image generation model
        const instructions = `
            Please place the provided product image into the room design, replacing the ${args.itemToReplace}.
            
            CRITICAL PRODUCT FIDELITY REQUIREMENTS:
            1. Identify the ${args.itemToReplace} in the room image
            2. Replace it with the provided product image
            3. STRICTLY PRESERVE the exact appearance of the product image:
               - Keep the EXACT colors, patterns, and materials from the product photo
               - Maintain the precise shape, proportions, and design details
               - Do NOT alter, recolor, or modify the product's visual characteristics
               - The product must look identical to how it appears in the reference image
            4. Adjust ONLY the perspective, scale, positioning, lighting, and shadows to fit naturally in the room
            5. Do NOT change any other elements in the room
            6. THIS IS THE MOST IMPORTANT PART: **DO NOT CHANGE ANY ITEM BEYOND THE ONES REQUESTED AND DON'T CHANGE THE PERSPECTIVE OF THE ROOM IN ANY WAY!**
            7. The result should look like the exact same product from the reference photo was placed in the room
            
            INTELLIGENT PRODUCT INTERPRETATION:
            - For paint products: Apply the COLOR/SHADE from the product image to the appropriate surface (walls, furniture, etc.), not the paint container itself
            - For fabric/textile products: Apply the material, pattern, and color to the appropriate surface, not the fabric roll or sample
            - For finish/coating products: Apply the finish effect to the surface, not the container
            - For other liquid/powder products: Focus on the END RESULT of using the product, not the packaging
            - For solid objects (furniture, electronics, etc.): Place the actual object as shown in the product image
            ${args.instructions ? '\nAdditional instructions: ' + args.instructions : ''}
        `;
        
        // Call the product integration model with both images
        console.log("Calling product integration with room and product images");
        const result = await callProductIntegrationModel(roomImage, productImage, instructions, args.itemToReplace);
        
        // If a new image was generated, always add as new design
        if (result.image) {
            imageState.addRemodeledImage(result.image);
            console.log("Added product integration as new design version");
            renderRemodeledImages();
            console.log("Rendered updated images panel");
        }
        
        return {
            text: result.text || `I've integrated the ${args.itemToReplace} into your room design.`,
            image: result.image
        };
    },
    
    // Handler for findSimilarProducts function
    async findSimilarProducts(args) {
        console.log("Handling findSimilarProducts function call", args);
        
        // Extract parameters
        const itemDescriptions = args.itemDescriptions || [];
        const context = args.context || "Focus on all items that have been changed in the room design including furniture, decor, electronics, appliances, lighting, and any other products";
        const brand = args.brand; // Brand parameter for brand-specific searches
        
        // Handle brand-specific search differently
        if (brand === 'unknown') {
            console.log(`Brand search failed - brand is unknown`);
            return "I'm sorry, but I can't figure out what brand this is. Can you help me out by telling me the brand name?";
        } else if (brand && brand !== 'unknown') {
            console.log(`Brand search detected for brand: "${brand}"`);
            
            // Add loading message for brand search
            addMessageToConversation(`Finding products from ${brand}...`, "ai", true);
            
            try {
                // Create a search item based on the brand and user's request
                const productCategory = "products"; // Generic category for brand searches
                const searchItem = {
                    name: `${brand} products`,
                    description: `Products from the ${brand} brand`,
                    google_shopping_query: `${brand} ${productCategory}`,
                    roundup_query: `${brand} ${productCategory}`
                };
                
                console.log("Brand search item:", searchItem);
                
                // Use brand filtering for accurate results
                const searchResult = await findProductsWithBrandFiltering([searchItem], brand, productCategory);
                
                // Remove loading message
                conversationArea.querySelectorAll('.loading-message').forEach(msg => msg.remove());
                
                if (searchResult && searchResult.success && searchResult.displayedProducts > 0) {
                    return `Found ${searchResult.displayedProducts} products from ${brand}! Check out the Product Recommendations below.`;
                } else {
                    return `Sorry, I couldn't find any products from ${brand} right now. The brand might not be available in our current product database.`;
                }
                
            } catch (error) {
                console.error('Brand search failed:', error);
                conversationArea.querySelectorAll('.loading-message').forEach(msg => msg.remove());
                return `I had trouble finding products from ${brand}. The brand might not be in our database, or there might be a temporary issue with the search.`;
            }
        }
        
        // Regular product search (non-brand specific)
        // Verify we have images to analyze
        if (!imageState.latestRemodel || !imageState.original) {
            throw new Error("Need both original and modified room images for analysis.");
        }
        
        // Add loading message
        addMessageToConversation("Analyzing your design to identify changed items...", "ai", true);
        
        try {
            // Build comprehensive context from conversation history
            let analysisContext = context;
            
            // Add conversation history context to help identify what was changed
            if (conversationManager.history.length > 0) {
                const recentMessages = conversationManager.history.slice(-6); // Last 6 messages for context
                const conversationSummary = recentMessages
                    .filter(msg => msg.role === 'user' && msg.content && !msg.content.includes('buy') && !msg.content.includes('purchase'))
                    .map(msg => msg.content)
                    .join(' ');
                
                if (conversationSummary) {
                    analysisContext = `${context}. Recent user requests: "${conversationSummary}". Focus specifically on items that were mentioned in these requests or would have been changed based on these instructions.`;
                }
            }
            
            // If specific item descriptions were provided, include them in the context
            if (itemDescriptions && itemDescriptions.length > 0) {
                analysisContext = `${analysisContext}. Specifically look for these items: ${itemDescriptions.join(', ')}`;
            }
            
            // Perform the image analysis
            console.log("Analyzing image with enhanced context:", analysisContext);
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
            
            // Call both APIs in parallel and merge the results
            await findProductsWithBothApis(analyzedItems);
            
            return {
                text: `Found product recommendations for ${analyzedItems.length} items.`
            };
        } catch (error) {
            conversationArea.querySelectorAll('.loading-message').forEach(msg => msg.remove());
            console.error("Error analyzing image for changes:", error);
            throw new Error(`Could not analyze room design: ${error.message}`);
        }
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
            const addToImageCalls = [];
            
            // Sort function calls by type
            for (const functionCall of orchestratorResponse.functionCalls) {
                if (functionCall.name === 'generateImage') {
                    generateImageCalls.push(functionCall);
                } else if (functionCall.name === 'addToImage') {
                    // Add to image calls for product integration
                    addToImageCalls.push(functionCall);
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
                    console.log("Standardized function call args");
                    
                    findProductsCalls.push(functionCall);
                } else {
                    console.error(`Unknown function: ${functionCall.name}`);
                }
            }
            
            console.log(`Processing ${generateImageCalls.length} image generation, ${addToImageCalls.length} product integrations, and ${findProductsCalls.length} product searches`);
            
            // Create promises for ALL function calls to run in parallel
            const allFunctionPromises = [];
            
            // Add image generation promises
            for (const generateImageCall of generateImageCalls) {
                allFunctionPromises.push(
                    (async () => {
                        try {
                            console.log("Executing image generation");
                            addMessageToConversation(`Processing image generation...`, "ai", true);
                            
                            const result = await functionHandlers.generateImage(generateImageCall.args);
                            return {
                                name: 'generateImage',
                                result: result
                            };
                        } catch (error) {
                            console.error(`Error executing generateImage function:`, error);
                            return {
                                name: 'generateImage',
                                error: error.message
                            };
                        }
                    })()
                );
            }
            
            // Add product integration promises
            for (const addToImageCall of addToImageCalls) {
                allFunctionPromises.push(
                    (async () => {
                        try {
                            console.log("Executing product integration");
                            addMessageToConversation(`Integrating product into your room design...`, "ai", true);
                            
                            const result = await functionHandlers.addToImage(addToImageCall.args);
                            return {
                                name: 'addToImage',
                                result: result
                            };
                        } catch (error) {
                            console.error(`Error executing addToImage function:`, error);
                            return {
                                name: 'addToImage',
                                error: error.message
                            };
                        }
                    })()
                );
            }
            
            // Add product search loading message once if there are any
            if (findProductsCalls.length > 0) {
                addMessageToConversation(`Processing product search${findProductsCalls.length > 1 ? 'es' : ''}...`, "ai", true);
            }
            
            // Add product search promises
            for (const findProductsCall of findProductsCalls) {
                allFunctionPromises.push(
                    (async () => {
                        try {
                            // Check if this is an image analysis request
                            const isImageAnalysis = findProductsCall.args.options?.analyzeImage === true;
                            const itemCount = findProductsCall.args.items?.length || 0;
                            
                            if (isImageAnalysis) {
                                console.log(`Executing product search with image analysis (${itemCount} initial items, will be augmented with analysis)`);
                                console.log(`Analysis context: ${findProductsCall.args.options?.context || "No specific context provided"}`);
                            } else {
                                console.log(`Executing product search for ${itemCount} items`);
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
                    })()
                );
            }
            
            // Execute ALL function calls in parallel
            if (allFunctionPromises.length > 0) {
                console.log(`Executing ${allFunctionPromises.length} function calls in parallel`);
                functionResults = await Promise.all(allFunctionPromises);
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
            } else if (result.name === "addToImage" && result.result?.image) {
                // Product integration result - image already added to state in the handler
                // Add the explanation text
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

// --- GPT API Integration ---
async function fetchGptApiKey() {
    console.log("Fetching GPT API key from server...");
    const keyResponse = await fetch('/api/gpt-key');
    if (!keyResponse.ok) {
        const errorText = await keyResponse.text();
        console.error("Failed to get GPT API key from server:", errorText);
        throw new Error(`Server error fetching GPT API key (${keyResponse.status}).`);
    }
    const { apiKey } = await keyResponse.json();
    if (!apiKey) {
        throw new Error("No GPT API key returned from server. Ensure it's configured.");
    }
    console.log("GPT API key retrieved successfully");
    return apiKey;
}

// Upload image to OpenAI Files API to get File ID for image generation
async function uploadImageToOpenAI(imageData, apiKey, filename = 'image.png') {
    try {
        // Convert base64 image data to blob
        const base64Data = imageData.replace(/^data:image\/[^;]+;base64,/, '');
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });
        
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', blob, filename);
        formData.append('purpose', 'vision');
        
        // Upload file to OpenAI
        const response = await fetch('https://api.openai.com/v1/files', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenAI file upload error:", errorText);
            throw new Error(`OpenAI file upload failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const data = await response.json();
        
        if (!data.id) {
            throw new Error("No file ID returned from OpenAI upload");
        }
        
        console.log(`File uploaded successfully: ${filename} -> ${data.id}`);
        return data.id;
        
    } catch (error) {
        console.error("Error uploading image to OpenAI:", error);
        throw error;
    }
}

// Build GPT Image 1 editing request
function buildGptImageEditingRequest(imageData, instructions) {
    // Convert base64 image data to blob for OpenAI API
    const base64Data = imageData.replace(/^data:image\/[^;]+;base64,/, '');
    
    // OpenAI's image editing API requires FormData
    const formData = new FormData();
    
    // Convert base64 to blob
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });
    
    formData.append('image', blob, 'image.png');
    formData.append('prompt', instructions);
    formData.append('model', 'gpt-image-1'); // Correct GPT Image 1 model
    formData.append('size', '1024x1024');
    // Note: response_format not needed - gpt-image-1 returns b64_json by default
    
    return formData;
}

// Build GPT Image 1 product integration request with room and product images
function buildGptProductIntegrationFormData(roomImageData, productImageData, instructions) {
    // The GPT Image editing API doesn't support multiple images in a single request
    // So we'll need to handle this differently - for now, use just the room image
    // and include the product context in the prompt
    
    // Convert room image base64 data to blob for OpenAI API
    const base64Data = roomImageData.replace(/^data:image\/[^;]+;base64,/, '');
    
    // OpenAI's image editing API requires FormData
    const formData = new FormData();
    
    // Convert base64 to blob
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });
    
    formData.append('image', blob, 'room.png');
    formData.append('prompt', instructions + "\n\nCRITICAL: This is a product integration request. You must place the EXACT product shown in the reference material into the room, preserving its exact colors, design, and appearance. Do NOT modify the product to match the room's style - keep it identical to the reference image. INTELLIGENT INTERPRETATION: For paint/finish products, apply the color/shade to surfaces, not the container. For solid objects, place the actual object.");
    formData.append('model', 'gpt-image-1'); // Correct GPT Image 1 model
    formData.append('size', '1024x1024');
    // Note: response_format not needed - gpt-image-1 returns b64_json by default
    
    return formData;
}

// Call GPT API for image editing
async function callGptImageGeneration(imageData, instructions) {
    try {
        const apiKey = await fetchGptApiKey();
        const formData = buildGptImageEditingRequest(imageData, instructions);
        
        console.log(`Calling GPT Image 1 API with model: gpt-image-1`);
        
        const response = await fetch('https://api.openai.com/v1/images/edits', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`
                // Note: Don't set Content-Type for FormData, browser sets it automatically with boundary
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenAI image editing API error:", errorText);
            throw new Error(`OpenAI image editing API failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.data || data.data.length === 0) {
            throw new Error("No image data returned from OpenAI API");
        }

        const imageResult = data.data[0];
        
        if (imageResult.b64_json) {
            // Convert base64 back to data URL
            const imageDataUrl = `data:image/png;base64,${imageResult.b64_json}`;
            console.log("GPT Image 1 successful!");
            
            return {
                text: "Here's your redesigned room, tell me what you think!",
                image: imageDataUrl
            };
        } else if (imageResult.url) {
            // If we get a URL instead of base64, we'd need to fetch it
            throw new Error("OpenAI returned image URL instead of base64 data");
        } else {
            throw new Error("OpenAI API response missing image data");
        }
        
    } catch (error) {
        console.error("Error calling GPT Image 1 API:", error);
        throw error;
    }
}

// Build GPT orchestrator request
function buildGptOrchestratorRequest(conversationHistory, availableFunctions) {
    const messages = [
        {
            role: "system",
            content: ORCHESTRATOR_PROMPT
        }
    ];

    // Add conversation history
    for (const message of conversationHistory) {
        const userMessage = {
            role: message.role === "model" ? "assistant" : message.role,
            content: []
        };

        // Add text parts
        const textParts = message.parts.filter(part => part.text);
        if (textParts.length > 0) {
            userMessage.content.push({
                type: "text",
                text: textParts.map(part => part.text).join(" ")
            });
        }

        // Add image parts
        const imageParts = message.parts.filter(part => part.inline_data);
        for (const imagePart of imageParts) {
            userMessage.content.push({
                type: "image_url",
                image_url: {
                    url: `data:${imagePart.inline_data.mime_type};base64,${imagePart.inline_data.data}`,
                    detail: visionModeState.quality
                }
            });
        }

        if (userMessage.content.length > 0) {
            messages.push(userMessage);
        }
    }

    return {
        model: "gpt-4o",
        messages: messages,
        functions: availableFunctions,
        function_call: "auto",
        max_tokens: 4000,
        temperature: 0.4
    };
}

// Call GPT API for orchestration
async function callGptOrchestrator(conversationHistory, availableFunctions) {
    try {
        const apiKey = await fetchGptApiKey();
        const requestBody = buildGptOrchestratorRequest(conversationHistory, availableFunctions);
        
        console.log("Calling GPT API for orchestration...");
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("GPT orchestrator API error:", errorText);
            throw new Error(`GPT orchestrator API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.choices || data.choices.length === 0) {
            throw new Error("No response from GPT orchestrator API");
        }

        const choice = data.choices[0];
        const text = choice.message?.content || "";
        const functionCall = choice.message?.function_call;
        
        console.log("GPT orchestrator response received");
        
        return {
            text: text,
            functionCall: functionCall
        };
        
    } catch (error) {
        console.error("Error calling GPT orchestrator:", error);
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
    
    try {
        // Always send the current image context to the orchestrator
        await processQueryWithOrchestrator(userTextForApi, imageToSend);
    } catch (error) {
        handleApiError(error instanceof Error ? error : new Error(String(error)));
    } finally {
        // Reset selection state *after* the API call is completely finished
        if (imageState.selectedIndex !== -1) {
            imageState.resetSelection();
            queryInput.classList.remove('with-selected-image', 'with-original-image');
            queryInput.placeholder = "Describe your vision...";
            renderRemodeledImages();
        }
        submitBtn.disabled = false;
        submitBtn.innerHTML = "➤";
    }
});

function addMessageToConversation(text, role, isLoading = false, isError = false, attachedImage = null) {
    // Only clear welcome message for user messages (when they actually send text)
    if (role === 'user') {
        clearWelcomeMessage();
    }
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
                You are a visual product analyzer specialized in all home and room products including furniture, decor, electronics, appliances, lighting, and any other items found in interior spaces.
                
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
                - "google_shopping_query": A CAREFULLY OPTIMIZED Google Shopping search query. QUERY FORMAT RULES:
                  * FOR BRAND SEARCHES: Use "[brand name] [high-level product category]" (e.g., "Ashley sofa", "Samsung TV")
                  * FOR COLOR SEARCHES: Use "[color] [product type with major characteristics]" (e.g., "beige L-shaped sectional sofa", "black round coffee table")  
                  * FOR STYLE SEARCHES: Use "[style keywords] [characteristics] [product type]" (e.g., "mid century round coffee table", "modern L-shaped sectional")
                  * FOR GENERAL SEARCHES: Use broad descriptive terms like "black wooden dining table modern"
                  Avoid overly specific brand names or unique features that might limit results.
                - "roundup_query": Query for expert-recommended products. FORMAT RULES:
                  * FOR BRAND SEARCHES: Use "[brand name] [high-level product category]" (e.g., "Ashley sofa", "Samsung TV") 
                  * FOR COLOR SEARCHES: Use "best [color] [product type with characteristics]" (e.g., "best beige sectional sofa")
                  * FOR STYLE SEARCHES: Use "best [style] [characteristics] [product type]" (e.g., "best mid century coffee table")
                  * FOR GENERAL SEARCHES: Use "best [core_item_type]" (e.g., "best dining table", "best office chair")
                
                REMEMBER: Focus on providing specific, detailed information that would help find similar products.
                
                Additional context: ${context}
            `;
        } else { // room analysis
            analysisPrompt = `
                You are a visual design analyzer specialized in interior design and all types of home and room products including furniture, decor, electronics, appliances, lighting, and any other items found in interior spaces.
                
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
                Please analyze this room image and identify ONLY the items that have DEFINITELY been modified, added, or replaced during the AI redesign process.
                
                STRICT INSTRUCTIONS: Be extremely selective and identify ONLY items that represent changes from the original room state.
                
                DO NOT include existing items that were already present in the original room.
                
                Focus EXCLUSIVELY on identifying:
                1. NEW items that were added to the room
                2. REPLACED items (same function but different style/color/type)
                3. MODIFIED items (significantly changed appearance)
                
                For each identified change, provide in your JSON:
                - "name": A specific name for the item (e.g., "Mid-Century Modern Gray Sofa" rather than just "Sofa")
                - "description": Detailed description including color, material, style and distinctive features
                - "google_shopping_query": A CAREFULLY OPTIMIZED Google Shopping search query. QUERY FORMAT RULES:
                  * FOR BRAND SEARCHES: Use "[brand name] [high-level product category]" (e.g., "Ashley sofa", "Samsung TV")
                  * FOR COLOR SEARCHES: Use "[color] [product type with major characteristics]" (e.g., "beige L-shaped sectional sofa", "black round coffee table")  
                  * FOR STYLE SEARCHES: Use "[style keywords] [characteristics] [product type]" (e.g., "mid century round coffee table", "modern L-shaped sectional")
                  * FOR GENERAL SEARCHES: Use broad descriptive terms like "gray fabric sectional sofa modern"
                  Avoid overly specific brand names or unique features that might limit results.
                - "roundup_query": Query for expert-recommended products. FORMAT RULES:
                  * FOR BRAND SEARCHES: Use "[brand name] [high-level product category]" (e.g., "Ashley sofa", "Samsung TV") 
                  * FOR COLOR SEARCHES: Use "best [color] [product type with characteristics]" (e.g., "best beige sectional sofa")
                  * FOR STYLE SEARCHES: Use "best [style] [characteristics] [product type]" (e.g., "best mid century coffee table")
                  * FOR GENERAL SEARCHES: Use "best [core_item_type]" (e.g., "best sectional sofa", "best floor lamp")
                
                REMEMBER: Focus on providing specific, detailed information that would help find similar products.
                
                IMPORTANT: Your ENTIRE RESPONSE must be this JSON array and nothing else.
                If you don't find any NEW or CHANGED items, return an empty array: []
                
                CONVERSATION CONTEXT: Use this information to understand what changes were likely made: ${context}
                
                CRITICAL: Use the conversation context above to guide your analysis. If the context mentions specific changes (like "change the sofa to leather" or "add a wooden table"), focus on identifying THOSE specific items in the room image.
            `;
            
            // If we have both original and modified images, use a comparison prompt instead
            if (originalImageData) {
                analysisPrompt = `
                    You are a visual comparison expert who identifies ONLY CHANGED items in room designs. I've provided two versions of the same room:
                    
                    The FIRST image is the MODIFIED room design (the "after" image).
                    The SECOND image is the ORIGINAL room (the "before" image).
                    
                    CRITICAL INSTRUCTION: You MUST ONLY identify the NEW/CURRENT items that appear in the MODIFIED room design (the first image).
                    
                    DO NOT identify items from the original room that got removed or replaced. Focus EXCLUSIVELY on what is NOW present in the new design.
                    
                    EXTREMELY IMPORTANT: DO NOT include items that look identical or very similar in both images. Only identify items that are CLEARLY DIFFERENT, NEW, or CHANGED.
                    
                    Compare the two images carefully and identify ONLY:
                    1. Items that are completely NEW in the modified image (not present in original) - identify THE NEW ITEM
                    2. Items that have been REPLACED (different item in same location) - identify THE NEW REPLACEMENT ITEM, not the old one
                    3. Items that have been significantly MODIFIED (changed appearance) - identify THE CURRENT MODIFIED VERSION, not the original
                    
                    IGNORE any items that appear identical in both images.
                    
                    WARNING: Be EXTREMELY selective. If an item appears in both images and looks the same or very similar, DO NOT include it. Only include items that are CLEARLY and OBVIOUSLY different between the two images.
                    
                    EXAMPLE: If the original room had a "brown leather chair" and the modified room has a "white fabric chair" in the same spot, identify "white fabric chair" (the NEW item), NOT "brown leather chair" (the old item that was replaced).
                    
                    For each CHANGED item only, provide:
                    - "name": A specific, detailed name for the item (e.g., "Mid-Century Modern Black Round Dining Table" rather than just "Table")
                    - "description": Thorough description including color, material, style and distinctive features
                    - "google_shopping_query": A STRATEGICALLY OPTIMIZED Google Shopping query. QUERY FORMAT RULES:
                      * FOR BRAND SEARCHES: Use "[brand name] [high-level product category]" (e.g., "Ashley sofa", "Samsung TV")
                      * FOR COLOR SEARCHES: Use "[color] [product type with major characteristics]" (e.g., "beige L-shaped sectional sofa", "black round coffee table")  
                      * FOR STYLE SEARCHES: Use "[style keywords] [characteristics] [product type]" (e.g., "mid century round coffee table", "modern L-shaped sectional")
                      * FOR GENERAL SEARCHES: Use format like "black round dining table modern", "white leather sectional sofa"
                      Avoid overly specific descriptors, brand names, or unique features that might limit results.
                    - "roundup_query": Query for expert reviews and recommendations. FORMAT RULES:
                      * FOR BRAND SEARCHES: Use "[brand name] [high-level product category]" (e.g., "Ashley sofa", "Samsung TV") 
                      * FOR COLOR SEARCHES: Use "best [color] [product type with characteristics]" (e.g., "best beige sectional sofa")
                      * FOR STYLE SEARCHES: Use "best [style] [characteristics] [product type]" (e.g., "best mid century coffee table")
                      * FOR GENERAL SEARCHES: Use "best [core_item_type]" (e.g., "best dining table", "best sectional sofa")
                    
                    *** RESPONSE FORMAT INSTRUCTIONS ***
                    Please respond with a detailed description of ONLY THE CHANGED ITEMS, focusing on providing specific details that would help find similar products.
                    
                    For each CHANGED item only, provide:
                    - Name: A specific name with details (e.g., "Mid-Century Modern Black Round Dining Table")
                    - Description: Include color, material, style, and distinctive features
                    - Shopping Query: A GOOGLE SHOPPING OPTIMIZED query designed for maximum relevant results
                    - Roundup Query: A BROAD category query for expert recommendations
                    
                    Format your response as a list with clear item separations. For example:
                    
                    Item 1: Black Round Dining Table
                    Description: Modern black round dining table with metal legs and a smooth surface.
                    Shopping Query: black round coffee table modern
                    Roundup Query: best mid century coffee table
                    
                    Item 2: Ashley L-Shaped Sectional Sofa 
                    Description: Beige L-shaped sectional sofa with fabric upholstery and modern design.
                    Shopping Query: Ashley sofa
                    Roundup Query: Ashley sofa
                    
                    FINAL REMINDER: Only include items that are CLEARLY and OBVIOUSLY different between the two images. If you're unsure whether an item has changed, DO NOT include it. It's better to return fewer items that are definitely changed than to include items that might not have changed.
                    
                    If you don't find any changed items, return an empty array: []
                    
                    CONVERSATION CONTEXT: Use this information to understand what changes were likely made: ${context}
                    
                    CRITICAL: Use the conversation context above to guide your analysis. If the context mentions specific changes (like "change the sofa to leather" or "add a wooden table"), focus on identifying THOSE specific items in the modified image.
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
        
        // Check if the response is JSON-formatted (array or object)
        if ((analysisText.trim().startsWith('[') && analysisText.trim().endsWith(']')) ||
            (analysisText.trim().startsWith('{') && analysisText.trim().endsWith('}'))) {
            try {
                console.log("Detected JSON format response, attempting to parse");
                const jsonData = JSON.parse(analysisText);
                
                // Handle JSON array
                if (Array.isArray(jsonData)) {
                    const items = jsonData.map(jsonObject => ({
                        name: jsonObject.name || "Product",
                        description: jsonObject.description || "",
                        google_shopping_query: jsonObject.google_shopping_query || jsonObject.name || "",
                        roundup_query: jsonObject.roundup_query || `best ${(jsonObject.name || "product").toLowerCase()}`
                    }));
                    
                    console.log("Successfully extracted items from JSON array:", items);
                    return items;
                }
                
                // Handle single JSON object
                if (jsonData.name || jsonData.description || jsonData.google_shopping_query) {
                    const item = {
                        name: jsonData.name || "Product",
                        description: jsonData.description || "",
                        google_shopping_query: jsonData.google_shopping_query || jsonData.name || "",
                        roundup_query: jsonData.roundup_query || `best ${(jsonData.name || "product").toLowerCase()}`
                    };
                    
                    console.log("Successfully extracted item from JSON object:", item);
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
                        const roundupMatch = segment.match(/(?:Roundup Query|Roundup Search):\s*(.*?)(?:\n|$)/i);
                        const changeMatch = segment.match(/Change Type:\s*(.*?)(?:\n|$)/i);
                        
                        if (nameMatch || descMatch || queryMatch) {
                            const item = {
                                name: (nameMatch && nameMatch[1].trim()) || `Item ${index + 1}`,
                                description: (descMatch && descMatch[1].trim()) || "",
                                google_shopping_query: (queryMatch && queryMatch[1].trim()) || 
                                                      (nameMatch && nameMatch[1].trim()) || "",
                                roundup_query: (roundupMatch && roundupMatch[1].trim()) || 
                                               `best ${((nameMatch && nameMatch[1].trim()) || "product").toLowerCase()}`
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
                        roundup_query: `best ${((nameMatch && nameMatch[1].trim()) || "product").toLowerCase()}`
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
                            google_shopping_query: name,
                            roundup_query: `best ${name.toLowerCase()}`
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
            
            // No server check needed - Vetted APIs don't require authentication
            
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
        
        // No API key needed for Vetted APIs
        
        // Process ALL items in parallel (removing artificial batching for better performance)
        const productResults = {};
        console.log(`Starting parallel Vetted API search for ${items.length} items`);
        
        // Create array of promises for parallel execution of ALL items
        const allPromises = items.map(async (item) => {
                try {
                    console.log(`Searching for products matching: "${item.google_shopping_query}"`);
                    
                    // Use real fetchQuery to search for products
                    const results = await fetchQuery("findProducts", {
                        query: item.google_shopping_query,
                        limit: 6,
                        includeOutOfStock: false
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
            
        // Wait for ALL items to complete in parallel
        const allResults = await Promise.all(allPromises);
        
        // Add results to the productResults object
        allResults.forEach(result => {
            productResults[result.name] = result.data;
        });
        
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

// Find products using both APIs with FULLY PARALLEL execution
async function findProductsWithBothApis(items) {
    // Create a unique ID for this combined search instance
    const searchId = Date.now().toString();
    
    try {
        // Show initial loading indicator
        const productsContainer = document.createElement('div');
        productsContainer.className = 'product-recommendations';
        productsContainer.id = `product-search-${searchId}`;
        productsContainer.innerHTML = '<h3>Finding products that match your design...</h3><div class="product-loading"><span class="spinner"></span></div>';
        conversationArea.appendChild(productsContainer);
        conversationArea.scrollTop = conversationArea.scrollHeight;
        
        // Get API key once
        // No API key needed
        
        // Create ALL API calls at once - fully parallel
        const allApiCalls = [];
        const combinedResults = {};
        
        // Initialize empty results for each item
        items.forEach(item => {
            combinedResults[item.name] = {
                query: item.google_shopping_query,
                description: item.description || '',
                results: [],
                vettedComplete: false,
                roundupComplete: false
            };
        });
        
        // Launch ALL API calls simultaneously
        items.forEach((item, index) => {
            console.log(`Starting parallel search for: "${item.google_shopping_query}" and roundup: "${item.roundup_query}"`);
            
            // Vetted API call
            const vettedCall = fetchQuery("findProducts", {
                query: item.google_shopping_query,
                includeOutOfStock: false
            }).then(results => {
                // Process vetted results immediately when they arrive
                if (results && results.length > 0) {
                    combinedResults[item.name].results = combinedResults[item.name].results.concat(results);
                }
                combinedResults[item.name].vettedComplete = true;
                console.log(`Vetted API completed for "${item.name}" with ${results?.length || 0} results`);
                // Note: Progressive display disabled during filtering phase
                return { type: 'vetted', item: item.name, results: results || [] };
            }).catch(error => {
                console.error(`Vetted API failed for "${item.name}":`, error);
                combinedResults[item.name].vettedComplete = true;
                // Note: Progressive display disabled during filtering phase
                return { type: 'vetted', item: item.name, results: [], error: error.message };
            });
            
            // Roundup API call
            const roundupCall = fetchRoundupQuery("roundup", {
                query: item.roundup_query
            }).then(results => {
                // Process roundup results immediately when they arrive
                if (results && results.length > 0) {
                    const roundupWithFlag = results.map(product => ({
                        ...product,
                        isRoundup: true
                    }));
                    // Roundup results go FIRST, so prepend them
                    combinedResults[item.name].results = roundupWithFlag.concat(combinedResults[item.name].results);
                }
                combinedResults[item.name].roundupComplete = true;
                console.log(`Roundup API completed for "${item.name}" with ${results?.length || 0} results`);
                // Note: Progressive display disabled during filtering phase
                return { type: 'roundup', item: item.name, results: results || [] };
            }).catch(error => {
                console.error(`Roundup API failed for "${item.name}":`, error);
                combinedResults[item.name].roundupComplete = true;
                // Note: Progressive display disabled during filtering phase
                return { type: 'roundup', item: item.name, results: [], error: error.message };
            });
            
            allApiCalls.push(vettedCall, roundupCall);
        });
        
        // Wait for ALL API calls to complete
        console.log(`Started ${allApiCalls.length} parallel API calls`);
        await Promise.allSettled(allApiCalls);
        console.log('All API calls completed');
        
        // Apply vision LLM filtering before final display
        const container = document.getElementById(`product-search-${searchId}`);
        if (container) {
            // Update loading message to indicate filtering
            container.innerHTML = '<h3>Finding products that match your design...</h3><div class="product-loading"><span class="spinner"></span><p>Filtering products for relevance...</p></div>';
            
            // Convert to the format expected by filtering
            const resultsForFiltering = {};
            Object.keys(combinedResults).forEach(itemName => {
                resultsForFiltering[itemName] = {
                    query: combinedResults[itemName].query,
                    description: combinedResults[itemName].description,
                    results: combinedResults[itemName].results
                };
            });
            
            // Apply vision filtering
            console.log('Starting vision LLM filtering...');
            const filteredResults = await filterProductResults(resultsForFiltering);
            console.log('Vision LLM filtering completed');
            
            // Display filtered results and get count of displayed products
            const displayedProducts = displayProductRecommendations(container, filteredResults);
            
            // Always run brand reputation analysis after filtering
            brandReputation(filteredResults);
            
            return { success: true, count: Object.keys(combinedResults).length, displayedProducts };
        } else {
            console.warn("Product search container no longer exists - results not displayed");
            return { success: true, count: Object.keys(combinedResults).length, displayedProducts: 0 };
        }
        
    } catch (error) {
        console.error("Error finding products with both APIs:", error);
        
        const container = document.getElementById(`product-search-${searchId}`);
        if (container) {
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorMessage.textContent = `Unable to find product recommendations: ${error.message}`;
            container.innerHTML = '';
            container.appendChild(errorMessage);
        }
        
        return { success: false, error: error.message };
    }
}

// Enhanced unified search with Google Lens support
async function findProductsWithAllApis(items) {
    // Create a unique ID for this combined search instance
    const searchId = Date.now().toString();
    
    try {
        // Show initial loading indicator
        const productsContainer = document.createElement('div');
        productsContainer.className = 'product-recommendations';
        productsContainer.id = `product-search-${searchId}`;
        productsContainer.innerHTML = '<h3>Finding products that match your design...</h3><div class="product-loading"><span class="spinner"></span></div>';
        conversationArea.appendChild(productsContainer);
        conversationArea.scrollTop = conversationArea.scrollHeight;
        
        // Get API key once
        // No API key needed
        
        // Create ALL API calls at once - fully parallel
        const allApiCalls = [];
        const combinedResults = {};
        
        // Initialize empty results for each item
        items.forEach(item => {
            combinedResults[item.name] = {
                query: item.google_shopping_query,
                description: item.description || '',
                results: [],
                vettedComplete: false,
                roundupComplete: false,
                googleLensComplete: false
            };
        });
        
        // Launch ALL API calls simultaneously
        items.forEach((item, index) => {
            console.log(`Starting parallel search for: "${item.google_shopping_query}", roundup: "${item.roundup_query}", and Google Lens: "${item.google_lens_query || 'N/A'}"`);
            
            // Vetted API call
            const vettedCall = fetchQuery("findProducts", {
                query: item.google_shopping_query,
                includeOutOfStock: false
            }).then(results => {
                // Process vetted results immediately when they arrive
                if (results && results.length > 0) {
                    combinedResults[item.name].results = combinedResults[item.name].results.concat(results);
                }
                combinedResults[item.name].vettedComplete = true;
                console.log(`Vetted API completed for "${item.name}" with ${results?.length || 0} results`);
                return { type: 'vetted', item: item.name, results: results || [] };
            }).catch(error => {
                console.error(`Vetted API error for "${item.name}":`, error);
                combinedResults[item.name].vettedComplete = true;
                return { type: 'vetted', item: item.name, results: [], error: error.message };
            });
            
            // Roundup API call
            const roundupCall = fetchRoundupQuery("roundup", {
                query: item.roundup_query
            }).then(results => {
                // Process roundup results immediately when they arrive
                if (results && results.length > 0) {
                    // Mark roundup products with isRoundup flag
                    const roundupProducts = results.map(product => ({ ...product, isRoundup: true }));
                    // Roundup results go FIRST, so prepend them
                    combinedResults[item.name].results = roundupProducts.concat(combinedResults[item.name].results);
                }
                combinedResults[item.name].roundupComplete = true;
                console.log(`Roundup API completed for "${item.name}" with ${results?.length || 0} results`);
                return { type: 'roundup', item: item.name, results: results || [] };
            }).catch(error => {
                console.error(`Roundup API error for "${item.name}":`, error);
                combinedResults[item.name].roundupComplete = true;
                return { type: 'roundup', item: item.name, results: [], error: error.message };
            });
            
            allApiCalls.push(vettedCall, roundupCall);
            
            // Google Lens API call (if available)
            if (item.google_lens_query && item.product_image_url) {
                const googleLensCall = findProductsWithGoogleLens(item.product_image_url, item.google_lens_query).then(result => {
                    // Process Google Lens results immediately when they arrive (same pattern as Vetted/Roundup)
                    if (result.success && result.products && result.products.length > 0) {
                        // Mark Google Lens products with isGoogleLens flag
                        const googleLensProducts = result.products.map(product => ({ ...product, isGoogleLens: true }));
                        combinedResults[item.name].results = combinedResults[item.name].results.concat(googleLensProducts);
                    }
                    combinedResults[item.name].googleLensComplete = true;
                    console.log(`Google Lens API completed for "${item.name}" with ${result.products?.length || 0} results`);
                    return { type: 'googleLens', item: item.name, results: result.products || [] };
                }).catch(error => {
                    console.error(`Google Lens API error for "${item.name}":`, error);
                    combinedResults[item.name].googleLensComplete = true;
                    return { type: 'googleLens', item: item.name, results: [], error: error.message };
                });
                
                allApiCalls.push(googleLensCall);
            } else {
                // Mark Google Lens as complete if not needed
                combinedResults[item.name].googleLensComplete = true;
            }
        });
        
        console.log(`Started ${allApiCalls.length} parallel API calls`);
        
        // Wait for ALL API calls to complete
        const allResults = await Promise.all(allApiCalls);
        console.log('All API calls completed');
        
        // Check if container still exists
        const container = document.getElementById(`product-search-${searchId}`);
        if (container) {
            // Prepare results for filtering
            const resultsForFiltering = {};
            Object.keys(combinedResults).forEach(itemName => {
                resultsForFiltering[itemName] = {
                    query: combinedResults[itemName].query,
                    description: combinedResults[itemName].description,
                    results: combinedResults[itemName].results
                };
            });
            
            // Apply vision filtering
            console.log('Starting vision LLM filtering...');
            const filteredResults = await filterProductResults(resultsForFiltering);
            console.log('Vision LLM filtering completed');
            
            // Display filtered results and get count of displayed products
            const displayedProducts = displayProductRecommendations(container, filteredResults);
            
            // Always run brand reputation analysis after filtering
            brandReputation(filteredResults);
            
            return { success: true, count: Object.keys(combinedResults).length, displayedProducts };
        } else {
            console.warn("Product search container no longer exists - results not displayed");
            return { success: true, count: Object.keys(combinedResults).length, displayedProducts: 0 };
        }
        
    } catch (error) {
        console.error("Error finding products with all APIs:", error);
        
        const container = document.getElementById(`product-search-${searchId}`);
        if (container) {
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorMessage.textContent = `Unable to find product recommendations: ${error.message}`;
            container.innerHTML = '';
            container.appendChild(errorMessage);
        }
        
        return { success: false, error: error.message };
    }
}

// Batch vision LLM filtering for product relevance using multiple images
// NOTE: Always uses Gemini model regardless of vision mode setting for efficiency
async function filterProductsBatch(products, query, productDescription = '', productCategory = '') {
    try {
        console.log(`Batch filtering ${products.length} products for query: "${query}"`);
        
        // Split into batches of max 10 images (Gemini limit)
        const maxImagesPerBatch = 10;
        const batches = [];
        for (let i = 0; i < products.length; i += maxImagesPerBatch) {
            batches.push(products.slice(i, i + maxImagesPerBatch));
        }
        
        let allPassingIndexes = [];
        
        // Process all batches in parallel
        const batchPromises = batches.map(async (batch, batchIndex) => {
            console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} products)`);
            
            // Fetch and convert all images in this batch to base64 IN PARALLEL
            const imagePromises = batch.map(async (product, i) => {
                // Get product image URL
                let imageUrl = null;
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
                
                if (!imageUrl) {
                    console.log(`No image URL for product ${i}, skipping`);
                    return null;
                }
                
                // Fetch and convert image to base64
                try {
                    const encodedUrl = encodeURIComponent(imageUrl);
                    const proxyUrl = `/api/proxy/${encodedUrl}`;
                    const response = await fetch(proxyUrl);
                    
                    if (!response.ok) {
                        throw new Error(`Failed to fetch image: ${response.status}`);
                    }
                    
                    const blob = await response.blob();
                    if (!blob.type.startsWith('image/')) {
                        throw new Error(`Received non-image content: ${blob.type}`);
                    }
                    
                    const base64Image = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                    
                    return {
                        imagePart: {
                            inline_data: {
                                mime_type: base64Image.match(/^data:(image\/[a-z]+);base64,/)?.[1] || 'image/jpeg',
                                data: base64Image.replace(/^data:image\/[a-z]+;base64,/, "")
                            }
                        },
                        validProduct: { product, originalIndex: batchIndex * maxImagesPerBatch + i }
                    };
                } catch (fetchError) {
                    console.log(`Failed to fetch image for product ${i}, skipping:`, fetchError);
                    return null;
                }
            });
            
            // Wait for all image fetches in this batch to complete
            const imageResults = await Promise.all(imagePromises);
            const imageParts = [];
            const validProducts = [];
            
            imageResults.forEach(result => {
                if (result) {
                    imageParts.push(result.imagePart);
                    validProducts.push(result.validProduct);
                }
            });
            
            if (imageParts.length === 0) {
                console.log('No valid images in this batch, skipping filtering');
                return [];
            }
            
            // Create filtering prompt for batch
            const filteringPrompt = `
                You are a product relevance evaluator for an e-commerce search system.
                
                TARGET PRODUCT:
                - Search Query: "${query}"
                ${productDescription ? `- Product Description: "${productDescription}"` : ''}
                ${productCategory ? `- Product Category: "${productCategory}"` : ''}
                
                I'm showing you ${imageParts.length} product images. Evaluate each one and determine which ones match the target product specifications above.
                
                MATCHING CRITERIA:
                1. Item Type: Must match the core item type (sofa, table, chair, etc.)
                2. Visual Style: Should align with the description (modern, traditional, etc.)
                3. Key Features: Consider color, material, and distinctive features mentioned
                4. Category Relevance: Must belong to the correct product category
                
                Allow reasonable variations:
                - Dark colors for "black" (dark grey, charcoal)
                - Similar materials ("leather" can include faux leather, vinyl)
                - Related styles ("sofa" can include sectional, loveseat)
                - Style variations ("modern" can include contemporary, minimalist)
                
                Reject completely different items:
                - Wrong item types (lamp when looking for "sofa")
                - Wrong categories (clothing when looking for "furniture")
                - Opposite characteristics (ornate when looking for "modern")
                - Items that don't match the product description's key features
                
                Respond with ONLY a JSON object in this exact format:
                {"passing_indexes": [0, 2, 4]}
                
                Where the numbers are the 0-based indexes of products that match the query.
                If no products match, return: {"passing_indexes": []}
            `;
            
            // Build request with text prompt + all images
            const parts = [{ text: filteringPrompt }, ...imageParts];
            
            // Call Gemini API for batch filtering (always use Gemini for visual filtering)
            const apiKey = await fetchApiKeys();
            const requestBody = {
                contents: [{
                    parts: parts,
                    role: "user"
                }],
                generationConfig: {
                    temperature: 0.1, // Low temperature for consistent filtering
                    topK: 1,
                    topP: 0.1
                }
            };
            
            // Always use Gemini for visual filtering regardless of vision mode
            // Use the more reliable flash model for multi-image analysis
            const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            
            console.log('Batch filtering request:', {
                endpoint: apiEndpoint,
                partsCount: parts.length,
                imagePartsCount: imageParts.length
            });

            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: { message: "Unknown API error." } }));
                console.error('Batch filtering API error:', errorData);
                throw new Error(`Batch filtering API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
            }
            
            const responseData = await response.json();
            const filterResult = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
            
            console.log(`Batch filter result:`, filterResult);
            
            // Parse JSON response
            try {
                const jsonMatch = filterResult.match(/\{[^}]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.passing_indexes && Array.isArray(parsed.passing_indexes)) {
                        // Convert batch-relative indexes to absolute indexes
                        const absoluteIndexes = parsed.passing_indexes.map(relativeIndex => {
                            if (relativeIndex < validProducts.length) {
                                return validProducts[relativeIndex].originalIndex;
                            }
                            return null;
                        }).filter(index => index !== null);
                        
                        console.log(`Batch ${batchIndex + 1}: ${parsed.passing_indexes.length}/${imageParts.length} products passed`);
                        return absoluteIndexes;
                    }
                } else {
                    throw new Error('No JSON found in response');
                }
            } catch (parseError) {
                console.error('FILTERING FAILED, SHOWING ALL RESULTS - JSON parse error:', parseError);
                // Return all products in this batch as passing
                return validProducts.map(vp => vp.originalIndex);
            }
        });
        
        // Wait for all batches to complete in parallel
        const batchResults = await Promise.all(batchPromises);
        
        // Combine all passing indexes from all batches
        batchResults.forEach(batchIndexes => {
            allPassingIndexes.push(...batchIndexes);
        });
        
        // Return indexes of all passing products across all batches
        console.log(`Total passing products: ${allPassingIndexes.length}/${products.length}`);
        return allPassingIndexes;
        
    } catch (error) {
        console.error('FILTERING FAILED, SHOWING ALL RESULTS - Batch filtering error:', error);
        // Return all product indexes as passing
        return products.map((_, index) => index);
    }
}

// Filter all products using batch vision LLM filtering
async function filterProductResults(categoryResults) {
    // Process ALL categories in parallel for better performance
    const categoryPromises = Object.entries(categoryResults).map(async ([categoryName, categoryData]) => {
        if (!categoryData.results || categoryData.results.length === 0) return;
        
        console.log(`Batch filtering category: ${categoryName} (${categoryData.results.length} products)`);
        
        try {
            // Use batch filtering to get passing product indexes
            const passingIndexes = await filterProductsBatch(
                categoryData.results, 
                categoryData.query, 
                categoryData.description || '', 
                categoryName
            );
            
            // Filter the results array to only include passing products
            const filteredProducts = passingIndexes.map(index => categoryData.results[index]).filter(Boolean);
            
            console.log(`Category ${categoryName}: ${filteredProducts.length}/${categoryData.results.length} products passed filtering`);
            
            // Update the category with filtered results
            categoryData.results = filteredProducts;
        } catch (error) {
            console.error(`Visual filtering failed for category ${categoryName}:`, error);
            // Keep original results if filtering fails
        }
    });
    
    // Wait for all category filtering to complete
    await Promise.all(categoryPromises);
    console.log('Visual filtering completed for all categories in parallel');
    
    return categoryResults;
}

// Brand-specific filtering using LLM for "More Like This" brand searches
async function filterProductsByBrand(products, targetBrand, targetCategory) {
    try {
        if (!products || products.length === 0) {
            return [];
        }
        
        console.log(`Brand filtering: ${products.length} products for brand "${targetBrand}" category "${targetCategory}"`);
        
        // If brand is unclear, return error immediately
        if (!targetBrand || targetBrand.length < 2 || targetBrand === 'unknown' || targetBrand === 'generic') {
            throw new Error("UNCLEAR_BRAND");
        }
        
        // Extract product names for LLM analysis
        const productNames = products.map((product, index) => {
            const name = product.title || product.name || product.productName || 'Unknown Product';
            const merchant = product.merchant || product.brand || product.store || '';
            const fullName = merchant ? `${merchant} - ${name}` : name;
            return `${index}: ${fullName}`;
        });
        
        console.log('Product names for brand filtering:', productNames);
        
        // Create brand filtering prompt
        const brandFilterPrompt = `
            You are a brand identification expert for e-commerce products.
            
            TARGET BRAND: "${targetBrand}"
            TARGET CATEGORY: "${targetCategory}"
            
            Products to evaluate:
            ${productNames.join('\n')}
            
            Analyze each product and determine which ones are genuinely from the target brand "${targetBrand}" in the category "${targetCategory}".
            
            STRICT CRITERIA:
            - Product must be manufactured/sold BY the target brand (not just compatible with or mentioning the brand)
            - Product must be in the same category (${targetCategory})
            - Exclude accessories, cables, cases, or third-party items unless specifically requested
            - Exclude items that just mention the brand name in descriptions but aren't made by that brand
            
            Examples:
            - "Samsung 55-inch QLED TV" → INCLUDE (Samsung brand TV)
            - "LG OLED Display Monitor" → INCLUDE (LG brand monitor) 
            - "Samsung-compatible TV wall mount" → EXCLUDE (not Samsung brand, just compatible)
            - "LG TV remote replacement" → EXCLUDE (accessory, not main product)
            - "Sony-style headphones by AudioTech" → EXCLUDE (not Sony brand)
            
            Respond with ONLY a JSON object in this exact format:
            {"passing_indexes": [0, 2, 4]}
            
            Where the numbers are the 0-based indexes of products that match the target brand and category.
            If no products match, return: {"passing_indexes": []}
        `;
        
        // Call the orchestrator model for brand filtering
        const apiKey = await fetchApiKeys();
        const requestBody = {
            contents: [{
                parts: [{ text: brandFilterPrompt }],
                role: "user"
            }],
            generationConfig: {
                temperature: 0.0, // Deterministic filtering
                topK: 1,
                topP: 0.1
            }
        };
        
        const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${ORCHESTRATOR_MODEL}:generateContent?key=${apiKey}`;
        
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`Brand filtering API error: ${response.status}`);
        }
        
        const responseData = await response.json();
        const analysisResult = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        console.log(`Brand filtering result for "${targetBrand} ${targetCategory}":`, analysisResult);
        
        // Parse JSON response
        try {
            const jsonMatch = analysisResult.match(/\{[^}]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.passing_indexes && Array.isArray(parsed.passing_indexes)) {
                    const filteredProducts = parsed.passing_indexes.map(index => products[index]).filter(Boolean);
                    console.log(`Brand filtering: ${filteredProducts.length}/${products.length} products passed for "${targetBrand}"`);
                    return filteredProducts;
                }
            }
        } catch (parseError) {
            console.error('Failed to parse brand filtering JSON response:', parseError);
        }
        
        // If parsing fails, return original products as fallback
        console.warn('Brand filtering failed, returning original results');
        return products;
        
    } catch (error) {
        if (error.message === "UNCLEAR_BRAND") {
            throw error; // Re-throw for special handling
        }
        console.error('Error in brand filtering:', error);
        return products; // Return original products on other errors
    }
}

// Brand search function that replaces visual filtering with brand filtering
async function findProductsWithBrandFiltering(items, targetBrand, targetCategory) {
    // Create a unique ID for this product search instance
    const searchId = Date.now().toString();
    
    try {
        // Show initial loading indicator
        const productsContainer = document.createElement('div');
        productsContainer.className = 'product-recommendations';
        productsContainer.id = `product-search-${searchId}`;
        productsContainer.innerHTML = '<h3>Finding products that match your design...</h3><div class="product-loading"><span class="spinner"></span></div>';
        conversationArea.appendChild(productsContainer);
        conversationArea.scrollTop = conversationArea.scrollHeight;
        
        // Get API key once
        // No API key needed
        
        // Create ALL API calls at once - fully parallel (but skip Google Lens for brand searches)
        const allApiCalls = [];
        const combinedResults = {};
        
        // Initialize empty results for each item
        items.forEach(item => {
            combinedResults[item.name] = {
                query: item.google_shopping_query,
                description: item.description || '',
                results: [],
                vettedComplete: false,
                roundupComplete: false
            };
        });
        
        // Launch ALL API calls simultaneously
        items.forEach((item, index) => {
            console.log(`Starting parallel search for: "${item.google_shopping_query}" and roundup: "${item.roundup_query}"`);
            
            // Vetted API call
            const vettedCall = fetchQuery("findProducts", {
                query: item.google_shopping_query,
                includeOutOfStock: false
            }).then(results => {
                // Process vetted results immediately when they arrive
                if (results && results.length > 0) {
                    combinedResults[item.name].results = combinedResults[item.name].results.concat(results);
                }
                combinedResults[item.name].vettedComplete = true;
                console.log(`Vetted API completed for "${item.name}" with ${results?.length || 0} results`);
                return { type: 'vetted', item: item.name, results: results || [] };
            }).catch(error => {
                console.error(`Vetted API error for "${item.name}":`, error);
                combinedResults[item.name].vettedComplete = true;
                return { type: 'vetted', item: item.name, results: [], error: error.message };
            });
            
            // Roundup API call
            const roundupCall = fetchRoundupQuery("roundup", {
                query: item.roundup_query
            }).then(results => {
                // Process roundup results immediately when they arrive
                if (results && results.length > 0) {
                    // Mark roundup products with isRoundup flag
                    const roundupProducts = results.map(product => ({ ...product, isRoundup: true }));
                    // Roundup results go FIRST, so prepend them
                    combinedResults[item.name].results = roundupProducts.concat(combinedResults[item.name].results);
                }
                combinedResults[item.name].roundupComplete = true;
                console.log(`Roundup API completed for "${item.name}" with ${results?.length || 0} results`);
                return { type: 'roundup', item: item.name, results: results || [] };
            }).catch(error => {
                console.error(`Roundup API error for "${item.name}":`, error);
                combinedResults[item.name].roundupComplete = true;
                return { type: 'roundup', item: item.name, results: [], error: error.message };
            });
            
            allApiCalls.push(vettedCall, roundupCall);
        });
        
        console.log(`Started ${allApiCalls.length} parallel API calls`);
        
        // Wait for ALL API calls to complete
        const allResults = await Promise.all(allApiCalls);
        console.log('All API calls completed');
        
        // Check if container still exists
        const container = document.getElementById(`product-search-${searchId}`);
        if (container) {
            // Apply brand filtering instead of visual filtering
            console.log('Starting brand-specific LLM filtering...');
            container.innerHTML = '<h3>Finding products that match your design...</h3><div class="product-loading"><span class="spinner"></span><p>Filtering for genuine brand products...</p></div>';
            
            const brandFilteredResults = {};
            for (const [itemName, itemData] of Object.entries(combinedResults)) {
                if (itemData.results && itemData.results.length > 0) {
                    try {
                        const filteredProducts = await filterProductsByBrand(itemData.results, targetBrand, targetCategory);
                        brandFilteredResults[itemName] = {
                            query: itemData.query,
                            description: itemData.description,
                            results: filteredProducts
                        };
                    } catch (error) {
                        if (error.message === "UNCLEAR_BRAND") {
                            // Handle unclear brand case
                            container.innerHTML = '';
                            const errorMessage = document.createElement('div');
                            errorMessage.className = 'error-message';
                            errorMessage.textContent = "I'm sorry, but I can't figure out what brand this is, can you help me out?";
                            container.appendChild(errorMessage);
                            return { success: false, error: "unclear_brand", displayedProducts: 0 };
                        }
                        throw error;
                    }
                } else {
                    brandFilteredResults[itemName] = {
                        query: itemData.query,
                        description: itemData.description,
                        results: []
                    };
                }
            }
            
            console.log('Brand filtering completed');
            
            // Display filtered results and get count of displayed products
            const displayedProducts = displayProductRecommendations(container, brandFilteredResults);
            
            // Always run brand reputation analysis after filtering
            brandReputation(brandFilteredResults);
            
            return { success: true, count: Object.keys(combinedResults).length, displayedProducts };
        } else {
            console.warn("Product search container no longer exists - results not displayed");
            return { success: true, count: Object.keys(combinedResults).length, displayedProducts: 0 };
        }
        
    } catch (error) {
        console.error("Error finding products with brand filtering:", error);
        
        const container = document.getElementById(`product-search-${searchId}`);
        if (container) {
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorMessage.textContent = `Unable to find product recommendations: ${error.message}`;
            container.innerHTML = '';
            container.appendChild(errorMessage);
        }
        
        return { success: false, error: error.message, displayedProducts: 0 };
    }
}

// Convert specific category to broad category for brand analysis
function getBroadCategory(specificCategory) {
    const categoryLower = specificCategory.toLowerCase();
    
    // Lighting
    if (categoryLower.includes('light') || categoryLower.includes('lamp') || 
        categoryLower.includes('chandelier') || categoryLower.includes('sconce') || 
        categoryLower.includes('pendant') || categoryLower.includes('ceiling')) {
        return 'lighting';
    }
    
    // Furniture
    if (categoryLower.includes('chair') || categoryLower.includes('table') || 
        categoryLower.includes('sofa') || categoryLower.includes('couch') || 
        categoryLower.includes('desk') || categoryLower.includes('bed') || 
        categoryLower.includes('dresser') || categoryLower.includes('cabinet') || 
        categoryLower.includes('shelf') || categoryLower.includes('sectional') ||
        categoryLower.includes('ottoman') || categoryLower.includes('bench')) {
        return 'furniture';
    }
    
    // Home decor
    if (categoryLower.includes('rug') || categoryLower.includes('carpet') || 
        categoryLower.includes('curtain') || categoryLower.includes('pillow') || 
        categoryLower.includes('throw') || categoryLower.includes('art') || 
        categoryLower.includes('mirror') || categoryLower.includes('vase') ||
        categoryLower.includes('decor')) {
        return 'home decor';
    }
    
    // Kitchen & dining
    if (categoryLower.includes('kitchen') || categoryLower.includes('dining') || 
        categoryLower.includes('cookware') || categoryLower.includes('appliance') ||
        categoryLower.includes('utensil') || categoryLower.includes('dinnerware')) {
        return 'kitchen & dining';
    }
    
    // Electronics
    if (categoryLower.includes('electronic') || categoryLower.includes('audio') || 
        categoryLower.includes('speaker') || categoryLower.includes('tv') || 
        categoryLower.includes('computer') || categoryLower.includes('phone')) {
        return 'electronics';
    }
    
    // Default to the original category if no match
    return specificCategory;
}

// Brand reputation analysis for findproducts results
async function analyzeBrandReputation(products, category) {
    try {
        if (!products || products.length === 0) {
            return [];
        }
        
        // Get broad category for brand analysis
        const broadCategory = getBroadCategory(category);
        console.log(`Analyzing brand reputation for ${products.length} products in category: ${category} (broad: ${broadCategory})`);
        
        // Only analyze findproducts results (not roundup products)
        const findproductsOnly = products.filter(product => !product.isRoundup);
        
        if (findproductsOnly.length === 0) {
            console.log('No findproducts results to analyze for brand reputation');
            return [];
        }
        
        // Extract product names with indices
        const productNames = findproductsOnly.map((product, index) => {
            const name = product.title || product.name || product.productName || 'Unknown Product';
            return `${index}: ${name}`;
        });
        
        // Get actual roundup products for brand comparison
        const roundupProducts = products.filter(product => product.isRoundup);
        const roundupProductNames = roundupProducts.map(product => 
            product.title || product.name || product.productName || 'Unknown Product'
        );
        
        console.log('Product names for brand analysis:', productNames);
        console.log('Roundup products to consider for brand matching:', roundupProductNames);
        
        // Create brand analysis prompt
        const roundupProductsText = roundupProductNames.length > 0 ? 
            `\n\nREPUTABLE BRAND PRODUCTS: The following products were selected by experts as top choices in this category: ${roundupProductNames.join(', ')}. Any products you're evaluating that are from the same brands as these expert-selected products should be marked as reputable.` : '';
        
        const brandAnalysisPrompt = `
            You are a brand reputation evaluator for e-commerce products.
            
            Product Category: "${broadCategory}"
            Products to evaluate (with indices):
            ${productNames.join('\n')}${roundupProductsText}
            
            Analyze each product and determine which ones are from well-known, reputable brands that have a strong reputation for quality in this product category.
            
            Include brands that are:
            - Recognized for good quality and reliability
            - Have established market presence
            - Known for decent craftsmanship and customer satisfaction
            - Mid-range to premium positioning
            
            Be reasonably selective - include brands that customers would generally trust and consider good quality choices.
            
            Examples of what typically counts as reputable by category:
            - Furniture: West Elm, Pottery Barn, Crate & Barrel, Herman Miller, Knoll
            - Electronics: Apple, Samsung, Sony, LG, Bose
            - Fashion: Nike, Adidas, Levi's, Ralph Lauren
            - Home goods: KitchenAid, Dyson, Cuisinart
            
            Exclude:
            - Generic/no-name brands
            - Budget/discount brands
            - Unknown or unrecognizable brand names
            - Store brands (unless premium like Target's Goodfellow)
            
            Important: If you aren't sure if a brand passes the criteria, err on the side of caution and exclude it.
            
            Respond with ONLY a JSON object in this exact format:
            {"reputable_brand_indexes": [0, 2, 4]}
            
            Where the numbers are the 0-based indexes of products from reputable brands.
            If no products are from reputable brands, return: {"reputable_brand_indexes": []}
        `;
        
        // Call the orchestrator model (Flash 2.5) for brand analysis
        const apiKey = await fetchApiKeys();
        const requestBody = {
            contents: [{
                parts: [{ text: brandAnalysisPrompt }],
                role: "user"
            }],
            generationConfig: {
                temperature: 0.1, // Low temperature for consistent analysis
                topK: 1,
                topP: 0.1
            }
        };
        
        const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${ORCHESTRATOR_MODEL}:generateContent?key=${apiKey}`;
        
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`Brand analysis API error: ${response.status}`);
        }
        
        const responseData = await response.json();
        const analysisResult = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        console.log(`Brand analysis result for "${category}":`, analysisResult);
        
        // Parse JSON response
        try {
            const jsonMatch = analysisResult.match(/\{[^}]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.reputable_brand_indexes && Array.isArray(parsed.reputable_brand_indexes)) {
                    // Map findproducts-relative indexes to absolute indexes in original products array
                    const absoluteIndexes = [];
                    let findproductsIndex = 0;
                    
                    for (let i = 0; i < products.length; i++) {
                        if (!products[i].isRoundup) {
                            if (parsed.reputable_brand_indexes.includes(findproductsIndex)) {
                                absoluteIndexes.push(i);
                            }
                            findproductsIndex++;
                        }
                    }
                    
                    console.log(`Brand analysis: ${absoluteIndexes.length}/${findproductsOnly.length} findproducts have reputable brands`);
                    return absoluteIndexes;
                } else {
                    throw new Error('Invalid JSON structure');
                }
            } else {
                throw new Error('No JSON found in response');
            }
        } catch (parseError) {
            console.error('Brand analysis JSON parse error:', parseError);
            return [];
        }
        
    } catch (error) {
        console.error('Brand analysis error:', error);
        return [];
    }
}

// Main brand reputation function - always runs after filtering
async function brandReputation(categoryResults) {
    try {
        console.log('Starting brand reputation analysis...');
        
        // Add small delay to ensure DOM is ready
        setTimeout(async () => {
            // Process ALL categories in parallel
            const categoryPromises = Object.entries(categoryResults).map(async ([categoryName, categoryData]) => {
                if (!categoryData.results || categoryData.results.length === 0) return;
                
                try {
                    // Analyze brand reputation for this category
                    const reputableBrandIndexes = await analyzeBrandReputation(categoryData.results, categoryName);
                    
                    // Update product cards with brand icons
                    reputableBrandIndexes.forEach(productIndex => {
                        const product = categoryData.results[productIndex];
                        if (product && !product.isRoundup) {
                            // Find the product card in the DOM and add brand icon
                            updateProductCardWithBrandIcon(product, categoryName);
                        }
                    });
                    
                    console.log(`Brand reputation analysis completed for category: ${categoryName}`);
                } catch (error) {
                    console.error(`Brand reputation analysis failed for category ${categoryName}:`, error);
                }
            });
            
            // Wait for all category analyses to complete
            await Promise.all(categoryPromises);
            console.log('Brand reputation analysis completed for all categories');
        }, 100);
        
    } catch (error) {
        console.error('Error in brand reputation analysis:', error);
    }
}

// Update a specific product card with brand icon
function updateProductCardWithBrandIcon(product, categoryName) {
    try {
        // Find all product cards and identify the one for this product
        const productCards = document.querySelectorAll('.product-card');
        
        productCards.forEach(card => {
            const titleElement = card.querySelector('.product-title');
            const productTitle = product.title || product.name || product.productName || 'Unknown Product';
            
            if (titleElement && titleElement.textContent.trim() === productTitle.trim()) {
                // Check if brand icon already exists
                if (card.querySelector('.brand-icon')) return;
                
                // Create brand icon overlay
                const brandIcon = document.createElement('div');
                brandIcon.className = 'brand-icon';
                
                const iconImg = document.createElement('img');
                iconImg.src = '/vetted.png';
                iconImg.alt = 'Reputable Brand';
                iconImg.className = 'brand-icon-img';
                
                const brandText = document.createElement('span');
                brandText.className = 'brand-text';
                brandText.textContent = 'BRAND';
                
                brandIcon.appendChild(iconImg);
                brandIcon.appendChild(brandText);
                
                // Add to product card
                card.appendChild(brandIcon);
                
                console.log(`Added brand icon to product: ${productTitle}`);
                return;
            }
        });
        
    } catch (error) {
        console.error('Error updating product card with brand icon:', error);
    }
}

// Progressive display function to update UI as API results come in
function updateProgressiveDisplay(searchId, combinedResults) {
    const container = document.getElementById(`product-search-${searchId}`);
    if (!container) {
        console.warn("Container no longer exists for progressive update");
        return;
    }
    
    // Check if any results are ready to display
    const readyItems = Object.keys(combinedResults).filter(itemName => {
        const item = combinedResults[itemName];
        return (item.vettedComplete || item.roundupComplete) && item.results.length > 0;
    });
    
    if (readyItems.length > 0) {
        // Convert to the format expected by displayProductRecommendations
        const readyResults = {};
        readyItems.forEach(itemName => {
            readyResults[itemName] = {
                query: combinedResults[itemName].query,
                description: combinedResults[itemName].description,
                results: combinedResults[itemName].results
            };
        });
        
        // Update the display with available results
        displayProductRecommendations(container, readyResults);
        console.log(`Progressive update: showing ${readyItems.length} items with results`);
    }
}

// Find expert-recommended products using the roundup API
async function findProductsWithRoundupApi(items) {
    // Create a unique ID for this roundup search instance
    const searchId = Date.now().toString() + '-roundup';
    
    try {
        // Show loading indicator for roundup products
        const productsContainer = document.createElement('div');
        productsContainer.className = 'product-recommendations';
        productsContainer.id = `roundup-search-${searchId}`;
        productsContainer.innerHTML = '<h3>Finding expert-recommended products...</h3><div class="product-loading"><span class="spinner"></span></div>';
        conversationArea.appendChild(productsContainer);
        conversationArea.scrollTop = conversationArea.scrollHeight;
        
        // Process ALL items in parallel (removing artificial batching for better performance)
        const productResults = {};
        console.log(`Starting parallel Roundup API search for ${items.length} items`);
        
        // Create array of promises for parallel execution of ALL items
        const allPromises = items.map(async (item) => {
                try {
                    console.log(`Searching for expert recommendations for: "${item.roundup_query}"`);
                    
                    // Use fetchRoundupQuery to search for expert-recommended products
                    const results = await fetchRoundupQuery("roundup", {
                        query: item.roundup_query,
                        limit: 6
                    });
                    
                    return {
                        name: item.name,
                        data: {
                            query: item.roundup_query,
                            description: item.description || '',
                            results: results || [],
                            isRoundup: true // Flag to identify these as roundup results
                        }
                    };
                } catch (error) {
                    console.error(`Error searching for roundup recommendations for "${item.name}":`, error);
                    return {
                        name: item.name,
                        data: {
                            query: item.roundup_query,
                            description: item.description || '',
                            results: [],
                            error: error.message,
                            isRoundup: true
                        }
                    };
                }
            });
            
        // Wait for ALL items to complete in parallel
        const allResults = await Promise.all(allPromises);
        
        // Add results to the productResults object
        allResults.forEach(result => {
            productResults[result.name] = result.data;
        });
        
        // Make sure the container still exists (user might have cleared the conversation)
        const container = document.getElementById(`roundup-search-${searchId}`);
        if (container) {
            // Display the product results
            displayProductRecommendations(container, productResults);
        } else {
            console.warn("Roundup search container no longer exists - results not displayed");
        }
        
        return { success: true, count: Object.keys(productResults).length };
    } catch (error) {
        console.error("Error finding roundup products:", error);
        
        // Check if container still exists
        const container = document.getElementById(`roundup-search-${searchId}`);
        if (container) {
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorMessage.textContent = `Unable to find expert recommendations: ${error.message}`;
            container.innerHTML = ''; // Clear the loading spinner
            container.appendChild(errorMessage);
        } else {
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorMessage.textContent = `Unable to find expert recommendations: ${error.message}`;
            conversationArea.appendChild(errorMessage);
        }
        
        return { success: false, error: error.message };
    }
}

// Fetch roundup query using the roundup API
async function fetchRoundupQuery(name, body, options = {}) {
    const { headers } = options;
    
    console.log(`fetchRoundupQuery called: ${name}`, body);
    
    if (name === "roundup") {
        try {
            // Format the request payload according to the roundup API documentation
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
            
            console.log(`Using proxy to call roundup_v5 endpoint with:`, requestPayload);
            
            // IMPORTANT: We're always using the proxy to avoid CORS issues
            const proxyUrl = '/api/proxy/https://research-function.reefpig.com/v5/research/roundup';
            
            // No server check needed - Vetted APIs don't require authentication
            
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
                            // Include required headers for the v5 API, but let the proxy handle them
                            'x-correlation-id': correlationId,
                            'x-session-id': '${SESSION_ID}',
                            'vetted-caller-id': '${CALLER_ID}',
                            ...(headers || {})
                        },
                        body: JSON.stringify(requestPayload)
                    }).catch(error => {
                        console.error("Network error during roundup API call:", error);
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
                        
                        console.error(`Roundup API error (${response.status}):`, errorText);
                        
                        // For certain status codes, add more specific error information
                        if (response.status === 522) {
                            console.error("Connection timed out - server may be overloaded or down");
                            throw new Error(`Roundup API error: Connection timed out (522)`);
                        } else if (response.status === 429) {
                            console.error("Rate limit exceeded");
                            throw new Error(`Roundup API error: Rate limit exceeded (429)`);
                        } else {
                            throw new Error(`Roundup API error: ${response.status}`);
                        }
                    }
                    
                    // Parse the response according to the roundup API documentation format
                    const data = await response.json();
                    console.log(`Received response from roundup_v5:`, data);
                    
                    // Return the results from the API (products array)
                    // Note: The roundup API might have a different response structure
                    // We'll need to adapt this based on the actual API response format
                    const products = data.products || data.recommendations || data.results || [];
                    
                    // Filter out the 'deals_category' key from each product
                    return products.map(product => {
                        const { deals_category, ...cleanProduct } = product;
                        return cleanProduct;
                    });
                },
                3,  // maxRetries - try up to 3 times
                1000, // baseDelay - start with 1 second, then 2s, then 4s
                isRetryableError // only retry specific errors
            );
            
            return result;
            
        } catch (error) {
            console.error(`Error with roundup_v5 after all retries:`, error);
            
            // Fallback to mock data if the proxy also fails
            console.warn(`Falling back to mock data for roundup query: "${body.query}"`);
            return generateMockProducts(body.query, body.limit || 6);
        }
    } else {
        // For other query types, just return empty results
        console.warn(`Unknown roundup query type: ${name}`);
        return [];
    }
}

// Generate mock products based on search query
function generateMockProducts(query, count = 6) {
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

// Google Lens API integration for visual product search
async function findProductsWithGoogleLens(imageUrl, googleLensQuery) {
    try {
        console.log(`Google Lens search: "${googleLensQuery}" with image: ${imageUrl}`);
        
        // Build the full URL with interpolation placeholder for the proxy to process
        const encodedImageUrl = encodeURIComponent(imageUrl);
        const encodedQuery = encodeURIComponent(googleLensQuery);
        
        // Let the proxy server handle the environment variable interpolation
        const fullUrl = `https://serpapi.com/search.json?engine=google_lens&url=${encodedImageUrl}&q=${encodedQuery}&api_key=\${GOOGLE_LENS_API_KEY}`;
        const proxyUrl = `/api/proxy/${encodeURIComponent(fullUrl)}`;
        
        console.log(`Using proxy to call Google Lens API with URL:`, proxyUrl);
        
        // No server check needed - proxy handles the API key interpolation
        
        const response = await fetch(proxyUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        }).catch(error => {
            console.error("Network error during Google Lens API call:", error);
            throw new Error(`Network error: ${error.message}`);
        });
        
        if (!response.ok) {
            let errorText = "";
            try {
                errorText = await response.text();
            } catch (err) {
                errorText = "Unable to get error details";
            }
            
            console.error(`Google Lens API error (${response.status}):`, errorText);
            throw new Error(`Google Lens API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Google Lens API response:', data);
        
        // Process the Google Lens results according to the new API layout
        // Focus on Product, Exact Matches, and Visual Matches sections
        const products = [];
        
        console.log('Processing Google Lens response structure:', Object.keys(data));
        
        // Extract products from Visual Matches section
        if (data.visual_matches && Array.isArray(data.visual_matches)) {
            console.log(`Found ${data.visual_matches.length} visual matches`);
            data.visual_matches.forEach((match, index) => {
                if (match.title && match.link) {
                    products.push({
                        title: match.title,
                        link: match.link,
                        price: match.price || match.extracted_price || null,
                        source: match.source || 'Google Lens Visual',
                        thumbnail: match.thumbnail || match.image || null,
                        imageUrl: match.thumbnail || match.image || null,
                        isGoogleLens: true,
                        merchant: match.merchant || null
                    });
                    console.log(`Added visual match ${index + 1}: ${match.title}`);
                }
            });
        }
        
        // Extract products from Products section  
        if (data.products && Array.isArray(data.products)) {
            console.log(`Found ${data.products.length} product matches`);
            data.products.forEach((product, index) => {
                if (product.title && product.link) {
                    products.push({
                        title: product.title,
                        link: product.link,
                        price: product.price || product.extracted_price || null,
                        source: product.source || 'Google Lens Product',
                        thumbnail: product.thumbnail || product.image || null,
                        imageUrl: product.thumbnail || product.image || null,
                        isGoogleLens: true,
                        merchant: product.merchant || null
                    });
                    console.log(`Added product match ${index + 1}: ${product.title}`);
                }
            });
        }
        
        // Extract products from Exact Matches section
        if (data.exact_matches && Array.isArray(data.exact_matches)) {
            console.log(`Found ${data.exact_matches.length} exact matches`);
            data.exact_matches.forEach((match, index) => {
                if (match.title && match.link) {
                    products.push({
                        title: match.title,
                        link: match.link,
                        price: match.price || match.extracted_price || null,
                        source: match.source || 'Google Lens Exact',
                        thumbnail: match.thumbnail || match.image || null,
                        imageUrl: match.thumbnail || match.image || null,
                        isGoogleLens: true,
                        merchant: match.merchant || null
                    });
                    console.log(`Added exact match ${index + 1}: ${match.title}`);
                }
            });
        }
        
        console.log(`Google Lens found ${products.length} products`);
        return { success: true, products, count: products.length };
        
    } catch (error) {
        console.error("Error with Google Lens search:", error);
        return { success: false, error: error.message, products: [] };
    }
}

function displayProductRecommendations(container, productResults) {
    // Clear any loading indicators
    container.innerHTML = '';
    
    // Count total products that will be displayed
    let totalDisplayedProducts = 0;
    
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
            description.textContent = `Similar to: ${itemData.description}`;
            categorySection.appendChild(description);
        }
        
        const productsList = document.createElement('div');
        productsList.className = 'products-carousel';
        
        // Add product items - show ALL products in horizontal carousel
        if (itemData.results && itemData.results.length > 0) {
            itemData.results.forEach(product => {
                const productCard = createProductCard(product, product.isRoundup);
                productsList.appendChild(productCard);
                totalDisplayedProducts++;
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
    
    return totalDisplayedProducts;
}

function createProductCard(product, isRoundup = false) {
    try {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        // Add vetted icon overlay for roundup results
        if (isRoundup) {
            card.classList.add('roundup-product');
        }
        
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
            
            // Add vetted icon overlay for roundup products
            if (isRoundup) {
                const vettedIcon = document.createElement('img');
                vettedIcon.src = '/vetted.png';
                vettedIcon.alt = 'Expert Recommended';
                vettedIcon.className = 'vetted-icon';
                vettedIcon.title = 'Expert Recommended Product';
                card.appendChild(vettedIcon);
            }
        } else {
            // Add placeholder image if no image URL is found
            const placeholderImg = document.createElement('div');
            placeholderImg.className = 'product-image placeholder';
            placeholderImg.textContent = 'No Image';
            card.appendChild(placeholderImg);
            
            // Add vetted icon overlay for roundup products even with placeholder
            if (isRoundup) {
                const vettedIcon = document.createElement('img');
                vettedIcon.src = '/vetted.png';
                vettedIcon.alt = 'Expert Recommended';
                vettedIcon.className = 'vetted-icon';
                vettedIcon.title = 'Expert Recommended Product';
                card.appendChild(vettedIcon);
            }
        }
        
        // Add product details
        const details = document.createElement('div');
        details.className = 'product-details';
        
        // Add title with robust fallbacks for v3 API
        const title = document.createElement('h5');
        title.className = 'product-title';
        title.textContent = product.title || product.name || product.productName || 'Unknown Product';
        details.appendChild(title);
        
        // Add price with enhanced format handling for v3 API format - ALWAYS show lowest price
        let price = null;
        const allPrices = [];
        
        // Collect ALL possible prices from different sources
        if (product.affiliatePages && product.affiliatePages.length > 0) {
            product.affiliatePages.forEach(page => {
                if (page.price) allPrices.push(page.price);
            });
        }
        if (product.price) allPrices.push(product.price);
        if (product.priceInfo?.amount) allPrices.push(product.priceInfo.amount);
        if (product.currentPrice) allPrices.push(product.currentPrice);
        if (product.priceInfo?.currentPrice) allPrices.push(product.priceInfo.currentPrice);
        if (product.prices && Array.isArray(product.prices)) {
            allPrices.push(...product.prices);
        }
        
        // Convert all prices to cents and find the minimum
        if (allPrices.length > 0) {
            const pricesInCents = allPrices.map(p => {
                if (typeof p === 'number') return p;
                if (typeof p === 'string') {
                    const numericPrice = parseFloat(p.replace(/[^0-9.]/g, ''));
                    return isNaN(numericPrice) ? Infinity : numericPrice;
                }
                if (typeof p === 'object' && p.amount) {
                    return typeof p.amount === 'number' ? p.amount : parseFloat(String(p.amount).replace(/[^0-9.]/g, '')) || Infinity;
                }
                return Infinity;
            }).filter(p => p !== Infinity);
            
            if (pricesInCents.length > 0) {
                price = Math.min(...pricesInCents);
                console.log(`Found ${allPrices.length} prices, showing lowest: ${price} cents`);
            }
        }
        
        // Store price info for later use in button
        let priceForButton = null;
        if (price) {
            if (typeof price === 'number') {
                const dollars = (price / 100).toFixed(2);
                priceForButton = `$${dollars}`;
            } else if (typeof price === 'string') {
                // Extract numeric value from string and convert to dollars
                const numericPrice = parseFloat(price.replace(/[^0-9.]/g, ''));
                if (!isNaN(numericPrice)) {
                    const dollars = (numericPrice / 100).toFixed(2);
                    priceForButton = `$${dollars}`;
                } else {
                    priceForButton = price.startsWith('$') ? price : `$${price}`;
                }
            } else if (typeof price === 'object' && price.currency) {
                const currencySymbol = price.currency === 'USD' ? '$' : price.currency;
                if (typeof price.amount === 'number') {
                    const dollars = (price.amount / 100).toFixed(2);
                    priceForButton = `${currencySymbol}${dollars}`;
                } else {
                    const numericAmount = parseFloat(String(price.amount).replace(/[^0-9.]/g, ''));
                    if (!isNaN(numericAmount)) {
                        const dollars = (numericAmount / 100).toFixed(2);
                        priceForButton = `${currencySymbol}${dollars}`;
                    } else {
                        priceForButton = `${currencySymbol}${price.amount}`;
                    }
                }
            } else if (typeof price === 'object' && price.amount) {
                // For v3 API price format - always convert to dollars
                if (typeof price.amount === 'number') {
                    const dollars = (price.amount / 100).toFixed(2);
                    priceForButton = `$${dollars}`;
                } else {
                    const numericAmount = parseFloat(String(price.amount).replace(/[^0-9.]/g, ''));
                    if (!isNaN(numericAmount)) {
                        const dollars = (numericAmount / 100).toFixed(2);
                        priceForButton = `$${dollars}`;
                    } else {
                        priceForButton = `$${price.amount}`;
                    }
                }
            } else {
                // If we can't determine the price format, show a generic message
                priceForButton = 'See price';
            }
        }
        
        // Always add action buttons regardless of price availability
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
                
                // Prepare product data for cart
                // Extract price in cents (for internal cart storage)
                let productPrice = 0;
                
                // First check the original price object we used for display
                const originalPrice = price; // This is the same price variable used for display
                
                // Use the exact same logic as display but preserve cents value instead of converting to dollars
                if (typeof originalPrice === 'number') {
                    // API returns prices in cents, keep as-is
                    productPrice = originalPrice;
                } else if (typeof originalPrice === 'string') {
                    // Extract numeric value from string
                    const numericPrice = parseFloat(originalPrice.replace(/[^0-9.]/g, ''));
                    if (!isNaN(numericPrice)) {
                        // API returns strings in cents format, keep as-is
                        productPrice = numericPrice;
                    }
                } else if (typeof originalPrice === 'object' && originalPrice.currency) {
                    if (typeof originalPrice.amount === 'number') {
                        // API returns amounts in cents, keep as-is
                        productPrice = originalPrice.amount;
                    } else {
                        const numericAmount = parseFloat(String(originalPrice.amount).replace(/[^0-9.]/g, ''));
                        if (!isNaN(numericAmount)) {
                            productPrice = numericAmount;
                        }
                    }
                } else if (typeof originalPrice === 'object' && originalPrice.amount) {
                    if (typeof originalPrice.amount === 'number') {
                        // API returns amounts in cents, keep as-is
                        productPrice = originalPrice.amount;
                    } else {
                        const numericAmount = parseFloat(String(originalPrice.amount).replace(/[^0-9.]/g, ''));
                        if (!isNaN(numericAmount)) {
                            productPrice = numericAmount;
                        }
                    }
                }
                
                // Fallback: if no price found in original object, try product.price directly
                if (productPrice === 0 && product.price) {
                    if (typeof product.price === 'number') {
                        productPrice = product.price;
                    } else if (typeof product.price === 'string') {
                        const numericPrice = parseFloat(product.price.replace(/[^0-9.]/g, ''));
                        if (!isNaN(numericPrice)) {
                            // If string contains $, it's likely in dollars, convert to cents
                            productPrice = product.price.includes('$') ? 
                                Math.round(numericPrice * 100) : numericPrice;
                        }
                    } else if (product.price && typeof product.price === 'object' && product.price.amount) {
                        if (typeof product.price.amount === 'number') {
                            productPrice = product.price.amount;
                        }
                    }
                }
                
                console.log(`Adding product to cart with price: ${productPrice} cents`);
                
                const productToAdd = {
                    id: product.id || `product-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    name: product.title || product.name || 'Product',
                    price: productPrice, // Now properly converted to cents
                    image: product.image_url || product.imageUrl || product.image || 
                          (product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : null),
                    merchant: product.merchant || product.brand || product.store || 'Online Store'
                };
                
                // Add the product to cart
                cartState.addItem(productToAdd);
            };
            actionsContainer.appendChild(cartButton);
            
            // Add an "Add to Image" button to place product in the room
            const addToImageButton = document.createElement('button');
            addToImageButton.className = 'product-action-btn add-to-image-btn';
            addToImageButton.innerHTML = '🖼️'; // Picture frame emoji
            addToImageButton.title = 'Add to room design';
            addToImageButton.onclick = async (e) => {
                e.preventDefault();
                
                // Show a visual feedback animation
                addToImageButton.classList.add('added');
                setTimeout(() => addToImageButton.classList.remove('added'), 1500);
                
                // Get product info for the UI
                const productName = product.title || product.name || 'this product';
                
                // Verify we have a remodeled image to work with
                if (!imageState.latestRemodel) {
                    alert("Please generate a room design first before adding products to it.");
                    return;
                }
                
                // Extract product image URL
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
                
                if (!productImageUrl) {
                    alert("No product image available for this item.");
                    return;
                }
                
                // Add a message to show what's happening
                const userMessage = `Add ${productName} to my room design`;
                addMessageToConversation(userMessage, "user", false, false, imageState.latestRemodel);
                // Include the current room image in the conversation context
                conversationManager.addMessage("user", userMessage, { 
                    image: imageState.latestRemodel 
                });
                
                // Add loading message
                addMessageToConversation("Integrating product into your room design...", "ai", true);
                
                try {
                    // Get a description of what this product is (table, chair, etc.)
                    // Either from the product name or a generic "item"
                    let itemType = "item";
                    const commonItems = ["table", "chair", "sofa", "lamp", "rug", "desk", "bed", "cabinet", "shelf", "dresser", "couch"];
                    for (const item of commonItems) {
                        if (productName.toLowerCase().includes(item)) {
                            itemType = item;
                            break;
                        }
                    }
                    
                    // Call the addToImage function directly
                    const result = await functionHandlers.addToImage({
                        productImageUrl: productImageUrl,
                        itemToReplace: itemType,
                        instructions: `Replace the ${itemType} with this ${productName} in a realistic way.`
                    });
                    
                    // Remove loading message
                    conversationArea.querySelectorAll('.loading-message').forEach(msg => msg.remove());
                    
                    // Add success message
                    addMessageToConversation(
                        `I've integrated the ${productName} into your room design! The image has been updated with the real product.`,
                        "ai"
                    );
                    conversationManager.addMessage(
                        "assistant",
                        `I've integrated the ${productName} into your room design! The image has been updated with the real product.`,
                        { image: result.image }
                    );
                } catch (error) {
                    console.error("Error integrating product into room:", error);
                    
                    // Remove any remaining loading messages
                    conversationArea.querySelectorAll('.loading-message').forEach(msg => msg.remove());
                    
                    // Show error message
                    addMessageToConversation(
                        `I couldn't integrate the ${productName} into your room design. ${error.message}`,
                        "ai",
                        false,
                        true
                    );
                }
            };
            actionsContainer.appendChild(addToImageButton);
            
            // Add a "More like this" button with dropdown panel
            const similarButton = document.createElement('button');
            similarButton.className = 'product-action-btn similar-btn';
            similarButton.innerHTML = '🔍'; // Magnifying glass emoji
            similarButton.title = 'Find more like this';
            similarButton.onclick = (e) => {
                e.preventDefault();
                
                // Create full screen modal overlay
                const modalOverlay = document.createElement('div');
                modalOverlay.className = 'more-like-this-modal-overlay';
                
                // Create modal content
                const modalContent = document.createElement('div');
                modalContent.className = 'more-like-this-modal-content';
                
                const productName = product.title || product.name || 'this product';
                
                modalContent.innerHTML = `
                    <div class="modal-header">
                        <h3>Find More Products Like "${productName}"</h3>
                        <button class="modal-close-btn">×</button>
                    </div>
                    <div class="modal-body">
                        <p>Choose how you'd like to search for similar products:</p>
                        <div class="modal-options">
                            <button class="modal-option-btn" data-type="style">
                                <span class="option-icon">🎨</span>
                                <span class="option-title">More in This Style</span>
                                <span class="option-desc">Find products with similar design aesthetics</span>
                            </button>
                            <button class="modal-option-btn" data-type="color">
                                <span class="option-icon">🌈</span>
                                <span class="option-title">More in This Color</span>
                                <span class="option-desc">Find products with similar colors and finishes</span>
                            </button>
                            <button class="modal-option-btn" data-type="brand">
                                <span class="option-icon">🏷️</span>
                                <span class="option-title">More From This Brand</span>
                                <span class="option-desc">Find more products from the same manufacturer</span>
                            </button>
                        </div>
                    </div>
                `;
                
                modalOverlay.appendChild(modalContent);
                document.body.appendChild(modalOverlay);
                
                // Add click handlers for options
                modalContent.querySelectorAll('.modal-option-btn').forEach(option => {
                    option.onclick = async () => {
                        const searchType = option.dataset.type;
                        modalOverlay.remove();
                        
                        
                        // Helper function to extract product category from name
                        const extractProductCategory = (name) => {
                            const lowerName = name.toLowerCase();
                            const categories = [
                                'tv', 'television', 'monitor', 'screen',
                                'sofa', 'couch', 'sectional', 
                                'chair', 'armchair', 'recliner',
                                'table', 'desk', 'coffee table', 'dining table',
                                'lamp', 'light', 'lighting', 'chandelier',
                                'bed', 'mattress', 'bedframe',
                                'dresser', 'nightstand', 'cabinet', 'bookshelf',
                                'rug', 'carpet', 'mat',
                                'curtain', 'drape', 'blind',
                                'mirror', 'artwork', 'painting'
                            ];
                            
                            for (const category of categories) {
                                if (lowerName.includes(category)) {
                                    return category;
                                }
                            }
                            return 'furniture'; // fallback
                        };
                        
                        // Helper function to extract style keywords
                        const extractStyleKeywords = (name) => {
                            const lowerName = name.toLowerCase();
                            const styles = [
                                'modern', 'contemporary', 'rustic', 'vintage', 'antique',
                                'industrial', 'farmhouse', 'scandinavian', 'minimalist',
                                'traditional', 'classic', 'mid-century', 'art deco',
                                'sleek', 'elegant', 'ornate', 'simple', 'clean'
                            ];
                            
                            const foundStyles = styles.filter(style => lowerName.includes(style));
                            return foundStyles.length > 0 ? foundStyles.join(' ') : 'modern';
                        };
                        
                        // Helper function to extract characteristics (shape, size, etc.)
                        const extractCharacteristics = (name) => {
                            const lowerName = name.toLowerCase();
                            const characteristics = [
                                // Shapes
                                'round', 'circular', 'square', 'rectangular', 'oval', 'octagonal',
                                // Sofa/Chair characteristics  
                                'l-shaped', 'sectional', 'loveseat', 'reclining', 'swivel', 'adjustable',
                                // Table characteristics
                                'coffee table', 'dining table', 'side table', 'end table', 'console table',
                                // Size descriptors
                                'large', 'small', 'compact', 'oversized', 'mini', 'giant',
                                // Configuration
                                'corner', 'wall-mounted', 'freestanding', 'modular', 'stackable'
                            ];
                            
                            const foundCharacteristics = characteristics.filter(char => lowerName.includes(char));
                            return foundCharacteristics.join(' ');
                        };
                        
                        // Enhanced color extraction function
                        const extractColor = (name) => {
                            const lowerName = name.toLowerCase();
                            const colors = [
                                // Basic colors
                                'black', 'white', 'brown', 'gray', 'grey', 'blue', 'red', 'green', 'yellow', 'orange', 'purple', 'pink',
                                // Extended colors
                                'beige', 'cream', 'ivory', 'navy', 'teal', 'turquoise', 'maroon', 'burgundy', 'tan', 'khaki',
                                'charcoal', 'silver', 'gold', 'bronze', 'copper', 'pewter',
                                // Material-based colors
                                'wood', 'wooden', 'oak', 'cherry', 'walnut', 'pine', 'mahogany',
                                'metal', 'metallic', 'chrome', 'steel', 'brass',
                                'glass', 'crystal', 'clear', 'transparent'
                            ];
                            
                            for (const color of colors) {
                                if (lowerName.includes(color)) {
                                    return color;
                                }
                            }
                            return '';
                        };
                        
                        // Vision-based color detection using Gemini
                        const detectColorWithVision = async (imageUrl) => {
                            try {
                                console.log(`Using Gemini vision to detect color for image: ${imageUrl}`);
                                
                                // Fetch and convert image to base64
                                const encodedUrl = encodeURIComponent(imageUrl);
                                const proxyUrl = `/api/proxy/${encodedUrl}`;
                                const response = await fetch(proxyUrl);
                                
                                if (!response.ok) {
                                    throw new Error(`Failed to fetch image: ${response.status}`);
                                }
                                
                                const blob = await response.blob();
                                if (!blob.type.startsWith('image/')) {
                                    throw new Error(`Received non-image content: ${blob.type}`);
                                }
                                
                                // Convert to base64
                                const base64Image = await new Promise((resolve, reject) => {
                                    const reader = new FileReader();
                                    reader.onloadend = () => resolve(reader.result);
                                    reader.onerror = reject;
                                    reader.readAsDataURL(blob);
                                });
                                
                                // Call Gemini vision API
                                const apiKey = await fetchApiKeys();
                                const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, "");
                                const imgMimeType = base64Image.match(/^data:(image\/[a-z]+);base64,/)?.[1] || 'image/jpeg';
                                
                                const requestBody = {
                                    contents: [{
                                        parts: [
                                            { 
                                                text: `Analyze this product image and identify the primary/dominant color. 
                                                       Respond with ONLY the color name in lowercase (e.g., "beige", "black", "navy blue", "wood brown"). 
                                                       If multiple colors are present, choose the most prominent one. 
                                                       If it's wood-toned, respond with "wood". 
                                                       If it's metallic, specify the metal type (e.g., "chrome", "brass", "copper").` 
                                            },
                                            { inline_data: { mime_type: imgMimeType, data: base64Data } }
                                        ],
                                        role: "user"
                                    }],
                                    generationConfig: {
                                        temperature: 0.1,
                                        topK: 1,
                                        topP: 0.1,
                                        maxOutputTokens: 20
                                    }
                                };
                                
                                const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
                                
                                const visionResponse = await fetch(apiEndpoint, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(requestBody)
                                });
                                
                                if (!visionResponse.ok) {
                                    throw new Error(`Gemini API error: ${visionResponse.status}`);
                                }
                                
                                const visionData = await visionResponse.json();
                                const detectedColor = visionData.candidates?.[0]?.content?.parts?.[0]?.text?.trim()?.toLowerCase() || '';
                                
                                console.log(`Vision-detected color: "${detectedColor}"`);
                                return detectedColor;
                                
                            } catch (error) {
                                console.error('Error with vision-based color detection:', error);
                                return '';
                            }
                        };
                        
                        // Create different messages and search queries based on search type
                        let userMessage, searchQuery, searchContext, roundupQuery, googleLensQuery;
                        const productName = product.title || product.name || 'this product';
                        const productBrand = product.merchant || product.brand || product.store;
                        const productCategory = extractProductCategory(productName);
                        const styleKeywords = extractStyleKeywords(productName);
                        const characteristics = extractCharacteristics(productName);
                        const color = extractColor(productName);
                        
                        // Build enhanced product descriptions with characteristics
                        const productWithCharacteristics = characteristics ? 
                            `${characteristics} ${productCategory}`.trim() : 
                            productCategory;
                        
                        // Extract product image URL for Google Lens
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
                        
                        // Handle search type logic with async support for color detection
                        if (searchType === 'style') {
                            userMessage = `Finding more products in the same style as this ${productName}...`;
                            searchQuery = `${styleKeywords} ${productWithCharacteristics}`;
                            roundupQuery = `best ${styleKeywords} ${productWithCharacteristics}`;
                            googleLensQuery = "find similar looking products";
                            searchContext = `Focus on products with similar design aesthetic, form, and style elements`;
                            
                        } else if (searchType === 'color') {
                            userMessage = `Finding more products in the same color as this ${productName}...`;
                            
                            // If text-based color extraction failed and we have an image, try vision analysis
                            let finalColor = color;
                            if (!color && productImageUrl) {
                                console.log('Text-based color extraction failed, trying vision analysis...');
                                userMessage = `Analyzing the color of this ${productName} and finding similar products...`;
                                
                                // Add loading message for vision analysis
                                addMessageToConversation(userMessage, "user");
                                conversationManager.addMessage("user", userMessage);
                                addMessageToConversation("Analyzing product color...", "ai", true);
                                
                                try {
                                    finalColor = await detectColorWithVision(productImageUrl);
                                    if (finalColor) {
                                        console.log(`Vision analysis detected color: "${finalColor}"`);
                                        // Remove loading message
                                        conversationArea.querySelectorAll('.loading-message').forEach(msg => msg.remove());
                                        addMessageToConversation(`Color detected: ${finalColor}. Now searching for similar products...`, "ai");
                                    } else {
                                        // Remove loading message
                                        conversationArea.querySelectorAll('.loading-message').forEach(msg => msg.remove());
                                        addMessageToConversation(`Couldn't detect color from image. Searching for similar products...`, "ai");
                                    }
                                } catch (error) {
                                    console.error('Vision color detection failed:', error);
                                    // Remove loading message
                                    conversationArea.querySelectorAll('.loading-message').forEach(msg => msg.remove());
                                    addMessageToConversation(`Color analysis failed. Searching for similar products...`, "ai");
                                }
                            }
                            
                            // Build search queries with detected color
                            searchQuery = finalColor ? `${finalColor} ${productWithCharacteristics}` : productWithCharacteristics;
                            roundupQuery = finalColor ? `best ${finalColor} ${productWithCharacteristics}` : `best ${productWithCharacteristics}`;
                            googleLensQuery = "find similar products in this color";
                            searchContext = `Focus on products with similar colors, finishes, and material tones`;
                            
                        } else if (searchType === 'brand') {
                            // Use orchestrator with brand parameter to let LLM extract brand
                            console.log(`Brand search for product: "${productName}"`);
                            
                            // Add user message for brand search
                            addMessageToConversation(`Finding more products from the same brand as "${productName}"...`, "user");
                            conversationManager.addMessage("user", `Finding more products from the same brand as "${productName}"...`);
                            
                            // Add loading message
                            addMessageToConversation("Analyzing the brand and searching for similar products...", "ai", true);
                            
                            try {
                                // Call orchestrator with brand parameter 
                                const brandSearchPrompt = `Find products from the same brand as "${productName}". Use the brand parameter in your function call to extract the brand name from this product title.`;
                                
                                console.log("Calling orchestrator for brand search with prompt:", brandSearchPrompt);
                                
                                const response = await callOrchestratorModel(brandSearchPrompt, {
                                    includeHistory: true,
                                    skipImageAnalysis: true // Skip image analysis for brand searches
                                });
                                
                                console.log("Orchestrator response for brand search:", response);
                                
                                // Remove loading message
                                conversationArea.querySelectorAll('.loading-message').forEach(msg => msg.remove());
                                
                                if (response?.text) {
                                    addMessageToConversation(response.text, "ai");
                                    conversationManager.addMessage("assistant", response.text);
                                }
                                
                                return; // Exit the More Like This handler since orchestrator handled everything
                                
                            } catch (error) {
                                console.error('Brand search with orchestrator failed:', error);
                                
                                // Remove loading message
                                conversationArea.querySelectorAll('.loading-message').forEach(msg => msg.remove());
                                
                                // Show error message
                                addMessageToConversation("I'm sorry, but I can't figure out what brand this is, can you help me out?", "ai", false, true);
                                return; // Exit early
                            }
                        }
                        
                        // Add user message (skip if already added during color analysis)
                        if (!(searchType === 'color' && !color && productImageUrl)) {
                            addMessageToConversation(userMessage, "user");
                            conversationManager.addMessage("user", userMessage);
                        }
                        
                        // Add loading message
                        addMessageToConversation("Searching for matching products...", "ai", true);
                        
                        try {
                            // Create combined search item with both query types for unified search
                            const combinedSearchItem = {
                                name: productName,
                                description: searchContext,
                                google_shopping_query: searchQuery,
                                roundup_query: roundupQuery
                            };
                            
                            console.log(`Searching for products (${searchType}):`, combinedSearchItem);
                            
                            // Add Google Lens info to the search item if available
                            if (googleLensQuery && productImageUrl) {
                                combinedSearchItem.google_lens_query = googleLensQuery;
                                combinedSearchItem.product_image_url = productImageUrl;
                                console.log(`Including Google Lens search: "${googleLensQuery}" using image: ${productImageUrl}`);
                            } else if (googleLensQuery && !productImageUrl) {
                                console.log(`Skipping Google Lens search (${searchType}): No product image available`);
                            } else {
                                console.log(`Skipping Google Lens search for brand-based search`);
                            }
                            
                            // Use the enhanced unified search function that supports all three APIs
                            // (Brand searches are handled earlier via orchestrator and don't reach this point)
                            const searchResult = await findProductsWithAllApis([combinedSearchItem]);
                            
                            // Check if the search actually found and displayed results
                            const hasResults = searchResult && searchResult.success && searchResult.displayedProducts > 0;
                            
                            // Only show failure message when no results are found
                            // Success is already indicated by the "Product Recommendations" container
                            if (!hasResults) {
                                const failureMessage = "Sorry, but I couldn't find anything that's similar enough. Want me to adjust my search?";
                                addMessageToConversation(failureMessage, "ai");
                                conversationManager.addMessage("assistant", failureMessage);
                            }
                            
                        } catch (error) {
                            console.error(`Error searching for ${searchType} products:`, error);
                            
                            // Remove any remaining loading messages
                            conversationArea.querySelectorAll('.loading-message').forEach(msg => msg.remove());
                            
                            // Show error message
                            addMessageToConversation(
                                `I had trouble finding products with similar ${searchType}. ${error.message}`, 
                                "ai", 
                                false, 
                                true
                            );
                        }
                    };
                });
                
                // Add close button handler
                const closeBtn = modalContent.querySelector('.modal-close-btn');
                closeBtn.onclick = () => modalOverlay.remove();
                
                // Close modal when clicking overlay (outside modal content)
                modalOverlay.onclick = (event) => {
                    if (event.target === modalOverlay) {
                        modalOverlay.remove();
                    }
                };
                
                // Close modal with Escape key
                const escapeHandler = (event) => {
                    if (event.key === 'Escape') {
                        modalOverlay.remove();
                        document.removeEventListener('keydown', escapeHandler);
                    }
                };
                document.addEventListener('keydown', escapeHandler);
            };
            actionsContainer.appendChild(similarButton);
        
        // Add "View Product" button with price as text and robust link fallbacks for v3 API
        let linkUrl = null;
        if (product.affiliatePages && product.affiliatePages.length > 0) {
            linkUrl = product.affiliatePages[0].affiliateUrl || product.affiliatePages[0].url;
        }
        
        // Fallback to other URL properties including more potential fields
        linkUrl = linkUrl || product.product_url || product.url || product.productUrl || 
                        product.link || product.productLink || product.productUrl || 
                        product.buyUrl || product.purchaseUrl || product.storeUrl;
        
        // Debug logging to understand missing URLs
        if (!linkUrl) {
            console.log('No URL found for product:', {
                title: product.title || product.name,
                availableFields: Object.keys(product),
                isRoundup: product.isRoundup,
                affiliatePages: product.affiliatePages
            });
        }
        
        let hasButtonWithPrice = false;
        // Always create a buy button, even if no URL (for findproducts results)
        const buyButton = document.createElement('a');
        buyButton.className = 'buy-button';
        
        if (linkUrl) {
            // Has URL - normal behavior for roundup results
            buyButton.href = linkUrl;
            buyButton.target = '_blank';
            
            // Use price as button text if price exists, otherwise "View Product"
            if (priceForButton) {
                buyButton.textContent = priceForButton;
                hasButtonWithPrice = true;
            } else {
                buyButton.textContent = 'View Product';
            }
        } else {
            // No URL - findproducts results, show price or generic text
            buyButton.style.cursor = 'default';
            buyButton.style.pointerEvents = 'none';
            
            if (priceForButton) {
                buyButton.textContent = priceForButton;
                hasButtonWithPrice = true;
            } else {
                buyButton.textContent = 'See on Google Shopping';
            }
        }
        
        // Add actions container right above the buy button
        details.appendChild(actionsContainer);
        details.appendChild(buyButton);
        
        // Only show price as a separate row if there's no button with price
        if (price && !hasButtonWithPrice) {
            const priceContainer = document.createElement('div');
            priceContainer.className = 'product-price-container';
            
            const priceElement = document.createElement('p');
            priceElement.className = 'product-price';
            priceElement.textContent = priceForButton || 'Price available';
            
            priceContainer.appendChild(priceElement);
            details.appendChild(priceContainer);
        }
        
        // Add store/brand name BELOW the View Product button
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
        
        // If no merchant found and no URL (findproducts results), show "Google Shopping"
        if (!merchant && !linkUrl) {
            merchant = "Google Shopping";
        }
        
        if (merchant) {
            const store = document.createElement('p');
            store.className = 'product-store';
            store.textContent = merchant;
            details.appendChild(store);
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

// Vision Mode Toggle Functionality
document.addEventListener('DOMContentLoaded', function() {
    const visionModeToggle = document.getElementById('vision-mode-toggle');
    const visionControls = document.querySelector('.vision-controls');
    const qualitySelector = document.querySelector('.vision-quality-selector');
    
    if (visionModeToggle && visionControls && qualitySelector) {
        // Function to update UI based on mode
        function updateVisionMode() {
            const isProMode = visionModeToggle.checked;
            
            if (isProMode) {
                visionControls.classList.add('pro-mode');
                qualitySelector.classList.remove('hidden'); // Show quality selector in Pro mode
            } else {
                visionControls.classList.remove('pro-mode');
                qualitySelector.classList.add('hidden'); // Hide quality selector in Fast mode but maintain space
            }
        }
        
        // Set initial state (Fast mode - hide quality selector)
        updateVisionMode();
        
        // Add event listener for toggle changes
        visionModeToggle.addEventListener('change', updateVisionMode);
    }
});

// --- Vision Controls Event Listeners ---
function initializeVisionControls() {
    const modeToggle = document.getElementById('vision-mode-toggle');
    const modeSlider = document.querySelector('.mode-slider');
    const modeToggleContainer = document.querySelector('.mode-toggle');
    const qualitySelect = document.getElementById('vision-quality');

    console.log('Initializing vision controls...', { 
        modeToggle, 
        modeSlider, 
        modeToggleContainer, 
        qualitySelect 
    });

    if (modeToggle) {
        modeToggle.addEventListener('change', async (e) => {
            console.log('Mode toggle changed - checkbox checked:', e.target.checked);
            await visionModeState.toggleMode();
        });
        console.log('Mode toggle change event listener added');
    } else {
        console.error('Mode toggle element not found!');
    }

    // Make the slider and container clickable by triggering the checkbox
    const triggerCheckbox = (e) => {
        console.log('Slider/container clicked - triggering checkbox');
        e.preventDefault();
        e.stopPropagation();
        if (modeToggle) {
            modeToggle.checked = !modeToggle.checked;
            // Manually trigger the change event
            const changeEvent = new Event('change', { bubbles: true });
            modeToggle.dispatchEvent(changeEvent);
        }
    };

    // Add click handler to slider
    if (modeSlider) {
        modeSlider.addEventListener('click', triggerCheckbox);
        console.log('Mode slider click event listener added');
    } else {
        console.error('Mode slider element not found!');
    }

    // Add click handler to container
    if (modeToggleContainer) {
        modeToggleContainer.addEventListener('click', triggerCheckbox);
        console.log('Mode toggle container click event listener added');
    } else {
        console.error('Mode toggle container element not found!');
    }

    if (qualitySelect) {
        qualitySelect.addEventListener('change', (e) => {
            console.log('Quality changed:', e.target.value);
            visionModeState.setQuality(e.target.value);
        });
        console.log('Quality select event listener added');
    } else {
        console.error('Quality select element not found!');
    }

    console.log('Vision controls event listeners initialized');
}

// --- Initialization on Page Load ---
(async function init() {
    displayWelcomeMessage();
    queryInput.disabled = true; // Disabled until an image is uploaded
    submitBtn.disabled = true;  // Disabled until an image is uploaded
    renderRemodeledImages(); // Initial render
    cartState.init(); // Initialize the cart system
    visionModeState.init(); // Initialize vision mode settings
    initializeVisionControls(); // Set up vision controls event listeners
    
    // Keep text input focused for better UX
    function maintainTextboxFocus() {
        if (!queryInput.disabled && document.activeElement !== queryInput) {
            queryInput.focus();
        }
    }
    
    // Focus textbox initially and when it loses focus (with small delay to avoid conflicts)
    setTimeout(() => queryInput.focus(), 100);
    document.addEventListener('click', (e) => {
        // Only refocus if the click wasn't on an input, button, or interactive element
        if (!e.target.matches('input, button, select, textarea, a, [contenteditable]')) {
            setTimeout(maintainTextboxFocus, 50);
        }
    });
    
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