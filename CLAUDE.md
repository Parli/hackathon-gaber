# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status - Vetted Nest AI Home Design Tool

**Current Status**: Production-ready AI-powered home remodeling visualization tool with advanced features and dual-model architecture.

### Core Features Implemented
- **AI Room Redesign**: Upload room photos and get AI-generated remodeling visualizations with conversation-driven refinement
- **Conversational Interface**: Natural language interaction for iterative design refinement with contextual emoji indicators
- **Pro/Fast Vision Modes**: Toggle between Gemini (Fast) and GPT Image 1 (Pro) with intelligent fallbacks and localStorage persistence
- **Product Discovery**: "Get This Room" functionality with real product recommendations via Vetted API and batch processing
- **Product Integration**: "Add to Room Design" feature to visualize specific products in room designs with intelligent product interpretation
- **Shopping Cart System**: Full e-commerce integration with cart management, quantity controls, and product purchasing workflows
- **Design Version Management**: Edit specific design versions with "Edit This Design" functionality and visual selection indicators
- **Advanced Product Search**: "More Like This" with full-screen modal offering Style, Color, and Brand similarity searches
- **Google Lens Integration**: Visual product similarity search using SerpApi for enhanced product discovery
- **Brand Reputation Analysis**: Automatic brand quality assessment with visual indicators for top-rated products
- **User Experience Enhancements**: Comprehensive safety disclaimers, contextual product descriptions, and completion notifications

### Technical Architecture
- **Multi-Model Orchestration**: Intelligent routing between Gemini and OpenAI models based on user preferences with dynamic model selection
- **Function Calling**: Advanced orchestrator with generateImage, findSimilarProducts, and addToImage functions plus parallel execution support
- **Real API Integration**: Connected to Vetted (Reefpig) product API, Roundup API, and Google Lens API for comprehensive product discovery
- **Robust Error Handling**: Exponential backoff, retry mechanisms, graceful fallbacks, and comprehensive logging
- **Cloud-Ready Deployment**: Google Cloud Run compatible with proper PORT environment variable handling and production optimizations
- **Responsive UI**: Modern design with proper state management, visual feedback, and accessibility considerations

### User Experience
- **Streamlined Workflow**: Upload → Describe → Visualize → Refine → Shop with intelligent contextual guidance
- **Visual Selection**: Click-to-edit specific design versions with clear selection indicators and contextual emojis
- **Product Discovery**: Parallel product searches with relevance filtering, brand reputation analysis, and visual similarity matching
- **Cart Integration**: Seamless transition from design visualization to product purchasing with quantity management
- **Safety Features**: Comprehensive disclaimers about product dimensions and fit verification
- **Completion Feedback**: Real-time notifications when background processes (brand analysis) complete

### Performance & Reliability
- **Parallel Processing**: Concurrent function calls and batch operations for optimal performance across multiple APIs
- **Connection Validation**: Pre-flight checks and intelligent retry logic with exponential backoff
- **Memory Management**: Efficient conversation history and image state handling with localStorage persistence
- **Error Recovery**: Comprehensive fallback mechanisms and user-friendly error messages
- **Production Deployment**: Successfully deployed to Google Cloud Run with proper scaling and environment configuration
- **Enhanced Filtering**: Advanced product category matching and visual relevancy checks for accurate results

The application is now a sophisticated, production-ready tool that successfully bridges AI-powered interior design visualization with real-world product discovery and e-commerce functionality. It has been successfully deployed to Google Cloud Run and is publicly accessible for hackathon demonstrations.

## Overview of the starting conditions

Node Simple Server is a minimalistic vanilla Node.js TypeScript server for rapid prototyping. It provides:

- Static file serving from the `public` directory
- Persistent storage API through `/api/store/` endpoints
- External service proxy via `/api/proxy/` with environment variable interpolation
- Frontend example integrating with various AI providers (OpenAI, Anthropic, Google)

## Commands

### Development

- **Start the server in development mode**: `npm run dev`
  - This loads environment variables from `.env` file

### Deployment

- **Deploy to Google Cloud Run**: `npm run deploy`
  - Creates/updates a Cloud Run service named after the project directory
  - Configures environment variables, secrets, and storage buckets
  - Uses Google Cloud's source-based deployment

- **Remove Cloud Run deployment**: `npm run undeploy`
  - Deletes the Cloud Run service

### Environment Setup

- **Initialize environment variables from 1Password**: `op inject -i example.env -o .env`
  - Required before first run

## Architecture

### Server (server.ts)

- HTTP server handling routes for static files, storage, and proxy requests
- Uses vanilla Node.js modules (http, fs, path, crypto) without external dependencies
- Environment variables:
  - `STORAGE_LOCATION`: Custom location for the storage file (default: `./storage`)
  - API keys and access permissions for proxy requests (see `example.env`)

### Storage

- Simple JSON-based persistence for storing arbitrary strings
- Uses MD5 hashing to generate URL-safe storage IDs
- File-based storage that can be backed by a mounted cloud bucket in production

### Proxy

- Forwards requests to external services with environment variable interpolation
- Security features:
  - Each environment variable requires a corresponding `*_ACCESS` variable
  - Allows whitelisting of specific hostnames for variable access

### Frontend (public/index.html, public/main.js)

- Simple demo integrating with multiple AI providers
- Uses Vercel AI SDK for streaming responses
- Supports sharing conversations via storage API
- Uses CDN-hosted libraries:
  - Vercel AI SDK and providers
  - Marked (Markdown parser)
  - Morphdom (DOM diffing)

## Development Flow

1. Initialize environment (requires 1Password): `op inject -i example.env -o .env`
2. Start the development server: `npm run dev`
3. Access the application at http://localhost:8080
4. Make changes to server.ts or public files
5. Restart the server to apply changes

## Deployment Flow

1. Create/update the Cloud Run service: `npm run deploy`
2. To remove the deployment: `npm run undeploy`

---

# Home Remodeling Visualization Tool

## Project Overview

This project is building an AI-powered tool that helps users visualize home remodeling with products they can actually purchase online. The system uses Gemini's vision AI to analyze a user's room photo, generate realistic visualizations of the remodeled space, and facilitate the purchase of those products.

## Core Requirements

- **CRITICAL**: Use ONLY the "gemini-2.0-flash-preview-image-generation" model
- Focus on a conversational UI similar to the existing demo
- Include file upload for room photos
- Display both original room photo and progressively modified versions side-by-side
- Include brief instructions with example queries for room redecoration
- Handle transitions between stages conversationally, not with specific UI elements
- Implement simple error handling for cases when Gemini doesn't return images
- Store conversation and images in memory (no need for persistence)

## User Flow

1. **Photo Upload**: User uploads a photo of their room with optional notes about desired changes
2. **Initial Analysis**: Send to Gemini for analysis of the current room
3. **Visualization Creation**: Generate remodeled room with placeholder items
4. **Refinement Conversation**: Enable back-and-forth to modify room and placeholder products
5. **Product Matching**: Call external API (to be provided later) to find real products similar to placeholders
6. **Product Visualization**: Feed real product images back to Gemini to replace placeholders in the visualization
7. **Display Final Result**: Show the remodeled room with real products

## Technical Implementation

### UI Requirements

- Remove the provider selection dropdown - only use Gemini
- Display both original and current modified images side-by-side
- Include brief instructions with one example query
- Implement file upload component for room photos
- Error handling for when Gemini fails to return images

### Gemini Integration

```javascript
// Always use this specific model
const model = "gemini-2.0-flash-preview-image-generation";

// Always include response_modalities for images
const config = {
  response_modalities: ['TEXT', 'IMAGE']
};
```

### Image Handling Flow

1. User uploads room photo
2. Store original photo in memory for reference
3. Send to Gemini with user's initial description of desired changes
4. Receive and display both text feedback and modified room image
5. Support continued conversation for refinements
6. When ready, transition to product matching (details to be implemented later)

### Error Handling

- Implement basic error messages if Gemini doesn't return images
- No need to handle file size limitations (under 20MB assumption)

## Implementation Notes

- The LLM will identify replaceable items based on conversation context
- Preference is to keep the UI simple initially, focusing on core functionality
- Start with in-memory storage of images and conversation history
- No need for special handling of the 20MB file size threshold

## Implementation Progress

### Current Status
We have successfully implemented:

1. A completely redesigned UI featuring:
   - Side-by-side display of original and modified room images
   - File upload functionality for room photos
   - Conversational interface for describing desired changes
   - Error handling and logging

2. Direct integration with Gemini's image generation model:
   - Successfully connected to the `gemini-2.0-flash-preview-image-generation` model
   - Built a secure API key handling system via a dedicated server endpoint
   - Implemented proper image encoding/decoding for API requests and responses

### Gemini Image Generation Integration Details

Working with the `gemini-2.0-flash-preview-image-generation` model required several specific configurations:

#### API Request Format
The correct format for image generation requests:
```javascript
{
  contents: [{
    parts: [
      // Add system prompt to the beginning of user message
      { text: systemPrompt + "\n\n" },
      // Include the image part
      { 
        inline_data: {
          mime_type: "image/jpeg", // or whatever the image format is
          data: base64EncodedImage 
        }
      },
      // User's query text
      { text: userQuery },
      // Explicit request for image in response
      { text: "\nPlease include an image in your response showing the remodeled room." }
    ],
    role: "user"  // Only 'user' and 'model' roles are supported
  }],
  generationConfig: {
    temperature: 0.4,
    topK: 32,
    topP: 0.95,
    responseModalities: ['TEXT', 'IMAGE']  // Must include both TEXT and IMAGE
  }
}
```

#### Key Requirements

1. **Role restrictions**: Only `user` and `model` roles are supported, not `system`. System prompts must be included in the user message.

2. **Response modalities**: Must explicitly request both `TEXT` and `IMAGE` in the response modalities.

3. **Direct image requests**: Include explicit instructions in the prompt to generate and include images.

4. **Image formatting**: Base64-encoded images must be properly formatted with correct MIME types.

5. **Response parsing**: Images are returned in the `inline_data` field of response parts, and must be properly extracted and decoded.

---

## Changelog

### Latest Updates (Major Feature Enhancements)

#### 🎯 Advanced Product Discovery System
- **Enhanced "More Like This" Functionality**: Redesigned product similarity search with intelligent modal interface
  - **Smart Modal UI**: Full-screen popup with three distinct search options (Style, Color, Brand) replacing cramped dropdown
  - **Intelligent Query Generation**: Advanced parsing of product names to extract categories, styles, colors, and brands
  - **Triple API Integration**: Parallel calls to Vetted API, Roundup API, and Google Lens API for comprehensive results

#### 🔍 Google Lens Visual Search Integration
- **SerpApi Google Lens Integration**: Added visual similarity search using product images
  - **Smart Activation**: Only for "Style" and "Color" searches (skips "Brand" searches where text is more effective)
  - **Optimized Queries**: "find similar looking products" (style) and "find similar products in this color" (color)
  - **API Key Management**: Securely integrated Google Lens API key in environment configuration
  - **Error Handling**: Graceful fallback when product images unavailable with detailed console logging

#### 🛠️ Improved Query Intelligence
- **Smart Product Categorization**: Automatic detection of TVs, sofas, chairs, lamps, tables, etc.
- **Style Keyword Extraction**: Identifies modern, rustic, vintage, scandinavian, minimalist styles
- **Color Detection**: Extracts black, white, brown, wood, metal, glass from product descriptions
- **Brand Intelligence**: Clean brand name extraction with fallback to common manufacturers
- **Optimized Search Queries**: 
  - Brand: "Samsung F6000F FHD Smart TV" → "samsung tv"
  - Style: "Modern Sleek Coffee Table" → "modern sleek table"
  - Color: "Black Leather Sofa" → "black sofa"

#### 🎨 Enhanced User Experience
- **Welcome Section Modernization**: Comprehensive feature explanations with proper button references
  - **Logo Integration**: Vetted Nest logo prominently displayed in welcome title (64px height)
  - **Feature Documentation**: Detailed explanations of Fast/Pro modes, product card functions, design controls
  - **Updated Examples**: Natural language examples using "sofa X" and "lamp Y" format
  - **Design Control Features**: Clear instructions for "Start From Scratch" and "Edit This Design" functionality

#### 🔧 UI/UX Polish & Refinements
- **Product Card Optimization**: 
  - Fixed image sizing with `object-fit: contain` to prevent cropping
  - Corrected button descriptions to match actual functionality (🔍 "More Like This" not "View Product")
- **Chat Interface Improvements**:
  - Minimized unnecessary whitespace in chat input area
  - Welcome message now persists until first text message (not image upload)
  - Better spacing and padding optimization
- **Button Icon Accuracy**: Updated welcome section to match actual product card icons (🖼️, 🛒, 🔍)

#### ⚡ Performance & Technical Architecture
- **Parallel API Execution**: All product searches now run concurrently using Promise.all()
- **Progressive Results Display**: Real-time updates as each API completes
- **Smart Error Recovery**: Individual API failures don't block other searches
- **Comprehensive Logging**: Detailed console output for debugging and monitoring
- **Environment Configuration**: Added Google Lens API credentials alongside existing keys

#### 🛒 E-commerce Integration Enhancements
- **Multi-Source Product Results**: Combined results from text search, expert recommendations, and visual similarity
- **Success Message Intelligence**: Dynamic feedback showing which search methods found results
- **Cart Integration Continuity**: Maintained seamless add-to-cart functionality across all search types
- **Product Visualization**: "Add to Room Design" works with products from all search sources

### Technical Implementation Highlights

**Google Lens API Integration**:
```javascript
// Example API call structure
const requestPayload = {
    engine: "google_lens",
    image_url: productImageUrl,
    q: googleLensQuery, // "find similar looking products" or "find similar products in this color"
    api_key: "${GOOGLE_LENS_API_KEY}"
};
```

**Smart Query Generation Examples**:
- **Before**: "Samsung F6000F FHD Smart TV brand similar"
- **After**: "samsung tv" (much more effective for shopping searches)

**Triple Parallel Search Architecture**:
```javascript
const apiCalls = [
    findProductsWithVettedApi([searchItem]),        // General product search
    findProductsWithRoundupApi([roundupItem]),      // Expert recommendations  
    findProductsWithGoogleLens(imageUrl, query)     // Visual similarity (style/color only)
];
const results = await Promise.all(apiCalls);
```

This major update significantly enhances the product discovery capabilities, providing users with the most comprehensive and accurate product search experience possible through the combination of text-based search, expert curation, and advanced visual similarity matching.
