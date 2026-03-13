# Readify

Readify is a Chrome extension that makes reading easier by analyzing any webpage — providing word counts, reading time, link summaries, and a built-in text highlighting feature.

## Features

### 📊 Page Analytics
- **Word Count** - Instantly see the total word count of any page
- **Reading Time** - Estimates how long it takes to read the content (based on 238 WPM)
- **Image Count** - Displays the number of images on the page
- **Link Summary** - Lists all HTTP/HTTPS links found on the page
- **Meta Information** - Shows page title, description, and URL

### ✏️ Highlight Mode
- Toggle highlight mode to mark important text
- Choose from 5 highlight colors
- Click highlighted text to remove it
- Clear all highlights with one click

### 💾 Storage
- Save page statistics for later reference
- View saved pages with word counts and timestamps
- Clear saved data when needed

## Installation

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **Load unpacked**
5. Select the extension folder

## Permissions

- `activeTab` - Access the currently active tab
- `scripting` - Execute scripts for highlight functionality
- `storage` - Persist saved pages data

## File Structure

```
├── manifest.json      # Extension configuration
├── background.js     # Service worker (badge updates, message handling)
├── content.js        # Injected script (page analysis, highlighting)
├── popup.html        # Extension popup UI
├── popup.js          # Popup logic and interactions
└── icons/            # Extension icons
```

## How It Works

### Architecture
- **Content Script** (`content.js`) - Injected into every webpage, handles DOM analysis and text highlighting
- **Popup** (`popup.js`) - The extension popup UI for user interactions
- **Background Service Worker** (`background.js`) - Manages extension lifecycle and badge updates

### Message Passing
The extension uses Chrome's message passing API to communicate between components:
- Popup → Content Script: Send commands (toggle highlight, set color, etc.)
- Content Script → Popup: Return page data (word count, links, etc.)

## Tech Stack

- Vanilla JavaScript (no frameworks)
- HTML/CSS for popup UI
- Chrome Extension APIs (Manifest V3)

## License

MIT
