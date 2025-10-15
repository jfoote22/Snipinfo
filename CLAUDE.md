# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Snipping Tool is a Chrome extension that captures custom screenshots, extracts text using Tesseract OCR, and allows users to ask questions about the extracted content using Google Gemini API.

## Architecture

### Core Components

**Background Script (worker.js)**
- Service worker that manages extension lifecycle
- Handles extension icon clicks and context menu interactions
- Captures screenshots via `chrome.tabs.captureVisibleTab`
- Orchestrates script injection into active tabs
- Manages IndexedDB cleanup (no longer used for caching)

**Screenshot Capture Flow (inject/inject.js)**
- Injects a visual selection interface when extension is activated
- `capture`: Handles mouse events for region selection
- `guide`: Provides visual crosshair guides during selection
- `monitor`: Listens for ESC key to abort capture
- Sends captured coordinates back to worker.js with devicePixelRatio

**OCR Processing Pipeline**
1. **helper.js**: Creates isolated iframe for OCR execution and handles image cropping
   - `self.execute()`: Spawns worker iframe, handles message passing
   - `self.crop()`: Crops screenshot to selected region, supports color inversion/grayscale for better OCR
2. **engine/index.html + index.js**: OCR worker environment
   - Loads Tesseract.js library
   - Creates Tesseract worker with SIMD-optimized WASM binary
   - Downloads language training data from tessdata.projectnaptha.com on demand
   - Reports progress via postMessage to parent
3. **response.js**: Manages OCR results and retry logic
   - If confidence < 50%, automatically retries with inverted colors
   - If still low confidence, tries grayscale mode
   - Supports drag-and-drop for re-OCR on modified images

**UI Components (inject/elements.js)**
- Defines two custom web components:
  - `ocr-container`: Top-level container for results (fixed position, top-right)
  - `ocr-result`: Main result card with Shadow DOM
- Features:
  - Language selection (100+ languages supported)
  - Dark mode toggle (persisted in chrome.storage.local)
  - API key management for Gemini integration
  - Text copy, save text, save screenshot buttons
  - Screenshot preview in popup window
  - Prompt interface for asking questions about OCR text

### Key Technical Details

**Tesseract Integration**
- Uses tesseract.js with SIMD-optimized WASM for performance
- Training data fetched on-demand from CDN (not bundled)
- Supports accuracy levels: 3.02, 4.0.0_fast, 4.0.0, 4.0.0_best
- Auto-detect language mode runs 3 OCR passes (eng, ara, jpn) in parallel, selects best confidence

**Chrome Extension Manifest V3**
- Uses service worker instead of background page
- Content Security Policy allows 'wasm-unsafe-eval' for Tesseract WASM
- Requires host_permissions for all URLs to capture screenshots
- Web accessible resources: /engine/index.html and preview-controls.js

**Data Storage**
- chrome.storage.local stores: API key, dark mode preference, language preferences, OCR screenshot
- No IndexedDB usage (legacy code cleaned up in onInstalled hook)

**Google Gemini Integration**
- Users provide their own API key (stored locally)
- Uses gemini-1.5-flash model endpoint
- Prompt format: `Prompt-"${user_prompt}". Context-"${ocr_text}"`

## Development Workflow

### Testing the Extension

1. Clone repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the repository folder
5. Click the extension icon or right-click and select "screenshot" to test

### File Structure

```
/
├── manifest.json                    # Extension manifest (Manifest V3)
├── worker.js                        # Service worker (background script)
├── icons/                           # Extension icons
├── inject/
│   ├── inject.js                    # Screenshot selection UI
│   ├── inject.css                   # Selection UI styles
│   ├── elements.js                  # Custom web components (ocr-result, ocr-container)
│   ├── response.js                  # OCR orchestration and retry logic
│   └── custom-elements.min.js       # Polyfill for custom elements
├── engine/
│   ├── index.html                   # OCR worker page
│   ├── index.js                     # Tesseract worker initialization
│   ├── helper.js                    # Image cropping and worker communication
│   ├── preview-controls.js          # Screenshot preview window controls
│   └── tesseract/                   # Tesseract.js library files
└── _locales/                        # Extension localization
```

## Important Patterns

**Message Passing Between Contexts**
- worker.js ↔ content scripts: `chrome.runtime.sendMessage` / `chrome.runtime.onMessage`
- content script ↔ OCR iframe: `postMessage` / `message` event listener
- Uses unique IDs for multiplexed async operations

**Firefox Compatibility**
- Special handling in worker.js (lines 63-82) for script injection
- Custom element command pattern in response.js (lines 14-17) for cross-origin restrictions

**Error Handling**
- OCR errors reported via postMessage to parent frame
- Low confidence triggers automatic retry with different image processing
- AbortController used for cancellation when user closes results

**State Management**
- Preferences stored in chrome.storage.local and synced to component via `configure()` method
- Shadow DOM isolates component styles from page
- Dark mode uses CSS custom properties and host attribute selector
