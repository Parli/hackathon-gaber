# Integrating OpenAI's `gpt-image-1` Model for Image Generation and Editing in Python

## Overview

This guide provides step-by-step instructions to set up and use OpenAI's `gpt-image-1` model for generating and editing images using Python.

---

## Prerequisites

* Python 3.7.1 or higher
* An OpenAI account with API access
* Basic knowledge of Python programming

---

## Setup Instructions

### 1. Install the OpenAI Python Library

First, create and activate a virtual environment (optional but recommended):

**For Windows (PowerShell):**

```powershell
python -m venv venv
.\venv\Scripts\activate
```

**For macOS/Linux:**

```bash
python3 -m venv venv
source venv/bin/activate
```

Then, install the OpenAI Python library:

```bash
pip install openai
```

### 2. Obtain Your OpenAI API Key

1. Sign in to your [OpenAI account](https://platform.openai.com/).
2. Navigate to the [API keys page](https://platform.openai.com/account/api-keys).
3. Click on "Create new secret key" and copy the generated key.

### 3. Set the API Key as an Environment Variable

**For Windows (PowerShell):**

```powershell
$env:OPENAI_API_KEY="your-api-key-here"
```

**For macOS/Linux:**

```bash
export OPENAI_API_KEY="your-api-key-here"
```

Replace `"your-api-key-here"` with your actual API key.

---

## Image Generation with `gpt-image-1`

Use the following Python script to generate an image from a text prompt:

```python
import os
import openai

# Ensure the API key is set
openai.api_key = os.getenv("OPENAI_API_KEY")

# Define the prompt and other parameters
prompt = "A minimalist Scandinavian living room with natural light"
response = openai.Image.create(
    prompt=prompt,
    n=1,
    size="1024x1024",
    model="gpt-image-1",
    quality="hd",
    style="vivid"
)

# Retrieve and print the image URL
image_url = response['data'][0]['url']
print(f"Generated image URL: {image_url}")
```

**Note:** The generated image URL is temporary and will expire after a certain period. Download the image promptly if you wish to keep it.

---

## Image Editing with `gpt-image-1` (Inpainting)

To edit an existing image, you'll need:

* The original image in PNG format.
* A mask image in PNG format, where transparent areas indicate regions to be edited.

Here's how to perform image editing:

```python
import os
import openai

# Ensure the API key is set
openai.api_key = os.getenv("OPENAI_API_KEY")

# Open the original image and mask
with open("original_image.png", "rb") as image_file, open("mask_image.png", "rb") as mask_file:
    response = openai.Image.create_edit(
        image=image_file,
        mask=mask_file,
        prompt="Replace the chairs with modern Scandinavian-style chairs",
        n=1,
        size="1024x1024",
        model="gpt-image-1",
        quality="hd",
        style="vivid"
    )

# Retrieve and print the edited image URL
edited_image_url = response['data'][0]['url']
print(f"Edited image URL: {edited_image_url}")
```

**Important:** Ensure that both the original image and the mask are square PNG images of the same dimensions and less than 4MB in size.

---

## Additional Tips

* **Image Sizes:** For `gpt-image-1`, supported sizes are "1024x1024", "1792x1024", and "1024x1792".
* **Number of Images:** The `n` parameter specifies how many images to generate. The maximum allowed is 10.
* **Saving Images:** To save the generated image locally, you can use the `requests` library to download the image from the provided URL.

---

## Resources

* [OpenAI API Documentation](https://platform.openai.com/docs/guides/images)
* [DALL·E 3 API Help Center](https://help.openai.com/en/articles/8555480-dall-e-3-api)
* [OpenAI Images API Reference](https://platform.openai.com/docs/api-reference/images)

---

By following this guide, you should be able to integrate OpenAI's `gpt-image-1` model into your Python backend system for image generation and editing tasks.
