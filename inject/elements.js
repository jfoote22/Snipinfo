

{
    if (customElements.get('ocr-container') === undefined) {
        // This document requires 'TrustedHTML' assignment
        self.trustedTypes?.createPolicy('default', {
            createHTML(s) {
                return s;
            }
        });

        class OCRContainer extends HTMLElement {
            constructor() {
                super();

                const shadow = this.attachShadow({ mode: 'open' });
                shadow.innerHTML = `
                <style>

                    #body {
                    font-family: Verdana, sans-serif;
                    display: flex;
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    z-index: 10000000000;
                    gap: 5px;
                    flex-direction: column;
                    background-color: transparent;
                    height: 90vh;
                    width: 20vw;
                    min-height: 300px;
                    min-width: 300px;
                    max-height: 90vh;
                    max-width: 90vw;
                    color-scheme: light;
                    resize: both;
                    overflow: auto;
                    }
                    
                    #body::after {
                        content: '';
                        position: absolute;
                        bottom: 0;
                        right: 0;
                        width: 20px;
                        height: 20px;
                        background: linear-gradient(-45deg, transparent 0%, transparent 30%, #ccc 30%, #ccc 40%, transparent 40%, transparent 60%, #ccc 60%, #ccc 70%, transparent 70%);
                        cursor: nw-resize;
                        z-index: 1;
                    }
                    
                    @media (max-width: 768px) {
                        #body {
                            top: 5px;
                            right: 5px;
                            left: 5px;
                            width: auto;
                            height: 80vh;
                            min-height: 250px;
                            min-width: auto;
                            max-width: none;
                        }
                    }
                    
                    @media (max-width: 480px) {
                        #body {
                            top: 2px;
                            right: 2px;
                            left: 2px;
                            height: 85vh;
                            min-height: 200px;
                        }
                    }
                </style>
                <div id="body">
                    <slot></slot>
                </div>
        `;
            }
        }
        customElements.define('ocr-container', OCRContainer);
    }

    if (customElements.get('ocr-result') === undefined) {
        class OCRResult extends HTMLElement {
            constructor() {
                super();

                this.prefs = {
                    'post-method': 'POST',
                    'post-href': '',
                    'post-body': '',
                    'lang': 'eng',
                    'frequently-used': ['eng', 'fra', 'deu', 'rus', 'ara'],

                    'example': 'NA',
                    'href': 'NA'
                };

                this.locales = {
                    post: `Post/GET/PUT the result to a server.

Use Shift + Click to change the server data`,
                    close: `Close this result.

Use Shift + Click to close all results.
Use Ctrl + Click or Command + Click to remove local language training data`,
                    tutorial: `Where do you want the data to get posted:
  Server Example:
  &page;

  Post Example:
  POST|http://127.0.0.1:8080|&content;
  POST|http://127.0.0.1:8080|{"body":"&content;"}

  Put Example:
  PUT|http://127.0.0.1:8080|&content;

  Get Example:
  GET|http://127.0.0.1:8080?data=&content;|

  Open in Browser Tab Example:
  OPEN|http://127.0.0.1:8080?data=&content;|`
                };

                this.locales = {
                    post: '',
                    close: '',
                    tutorial: ''
                }

                // Chat messages array
                this.chatMessages = [];

                const shadow = this.attachShadow({ mode: 'open' });
                shadow.innerHTML = `
          <style>
        body {
        font-family: Verdana, sans-serif;
        font-size: 12px;
        background-color: #f5f5f7;
        margin: 0;
        padding: 0;
        color: #333;
    }

    #body {
        font-family: Verdana, sans-serif;
        height: 100%;
        width: 100%;
        padding: 15px;
        padding-bottom: 20px;
        border-radius: 8px;
        background-color: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-sizing: border-box;
    }

    #top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding-bottom: 8px;
        border-bottom: solid;
    }

    .settings-button {
        display: flex;
        align-items: center;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: background-color 0.2s ease;
    }

    .settings-button:hover {
        background-color: rgba(0, 0, 0, 0.1);
    }

    .settings-button svg {
        width: 20px;
        height: 20px;
        fill: #666;
    }

    .settings-button:hover svg {
        fill: #333;
    }

    /* Settings Modal Styles */
    #settings-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 10000000001;
    }

    #settings-content {
        background-color: #fff;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        max-width: 400px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
    }

    #settings-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 1px solid #e0e0e0;
    }

    #settings-title {
        font-size: 18px;
        font-weight: 600;
        color: #333;
        margin: 0;
    }

    #settings-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background-color 0.2s ease;
    }

    #settings-close:hover {
        background-color: #f0f0f0;
        color: #333;
    }

    .settings-section {
        margin-bottom: 20px;
    }

    .settings-section h3 {
        font-size: 14px;
        font-weight: 600;
        color: #333;
        margin: 0 0 10px 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .settings-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #f0f0f0;
    }

    .settings-item:last-child {
        border-bottom: none;
    }

    .settings-label {
        font-size: 14px;
        color: #333;
        font-weight: 500;
    }

    .settings-control {
        min-width: 120px;
    }

    .settings-control select {
        width: 100%;
        padding: 6px 10px;
        border-radius: 6px;
        border: 1px solid #d1d1d1;
        background-color: #f5f5f7;
        font-size: 12px;
        color: #333;
    }

    .settings-toggle {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .toggle-switch {
        position: relative;
        width: 44px;
        height: 24px;
        background-color: #ccc;
        border-radius: 12px;
        cursor: pointer;
        transition: background-color 0.3s ease;
    }

    .toggle-switch.active {
        background-color: #007AFF;
    }

    .toggle-switch::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 20px;
        height: 20px;
        background-color: white;
        border-radius: 50%;
        transition: transform 0.3s ease;
    }

    .toggle-switch.active::after {
        transform: translateX(20px);
    }

    /* Dark mode styles for settings modal */
    :host([dark-mode]) #settings-content {
        background-color: #202938;
        color: #ecf0f1;
    }

    :host([dark-mode]) #settings-title {
        color: #FDDE5A;
    }

    :host([dark-mode]) .settings-section h3 {
        color: #FDDE5A;
    }

    :host([dark-mode]) .settings-label {
        color: #ecf0f1;
    }

    :host([dark-mode]) .settings-control select {
        background-color: #2c3e50;
        color: #ecf0f1;
        border-color: #4a4a4a;
    }

    :host([dark-mode]) #settings-header {
        border-bottom-color: #4a4a4a;
    }

    :host([dark-mode]) .settings-item {
        border-bottom-color: #4a4a4a;
    }

    :host([dark-mode]) #settings-close {
        color: #ecf0f1;
    }

    :host([dark-mode]) #settings-close:hover {
        background-color: #2c3e50;
        color: #FDDE5A;
    }

    .right-icons {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .github-link {
        margin-right: 10px;
    }

    .github-logo {
        fill: currentColor;
    }

    #toggle-dark-mode {
        margin-left: 10px;
    }

    .dark-toggle {
        cursor: pointer;
    }

    #close,
    #copy {
        font-family: Verdana, sans-serif;
        border: solid;
        background: none;
        font-size: 14px;
        cursor: pointer;
        color: #007AFF;
        width: 15%;
        padding: 4px;
        white-space: nowrap;
        cursor: pointer;
        transition: 0.2s ease;
    }

    #close:hover,
    #copy:hover {
        color: #003e80;
        transition: 0.2s ease;
    }

    label {
        display: block;
        font-weight: 500;
        margin: 8px 0 4px;
        color: #333;
    }

    #result,
    #result-in-process,
    #prompt,
    #key,
    #summary-area {
        font-family: Verdana, sans-serif;
        background-color: #fff;
        color: #333333;
        border: 1px solid #d1d1d1;
        border-radius: 10px;
        padding: 12px;
        font-size: 12px;
        width: 100%;
        line-height: 1.4;
        box-sizing: border-box;
    }

    #save-key {
        width: 15%;
        font-size: 11px;
        margin-left: 4px;
    }

    #api-key-section {
        display: flex;
    }

    #result,
    #result-in-process {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        margin: 0;
        border: none;
        border-radius: 0;
        background-color: transparent;
        height: auto;
        max-height: none;
        min-height: auto;
        resize: none;
    }

    #tools {
        margin-top: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .tool-row {
        display: flex;
        justify-content: space-between;
        gap: 8px;
    }

    .tool-row > * {
        flex: 1;
        min-width: 0;
    }

    select.language_select,
    button {
        width: 100%;
        padding: 6px 10px;
        border-radius: 10px;
        border: 1px solid #d1d1d1;
        background-color: #f5f5f7;
        font-size: 12px;
        color: #333;
        transition: all 0.2s ease;
        cursor: pointer;
    }

    button {
        font-family: Verdana, sans-serif;
        background-color: #007AFF;
        color: #fff;
        border: none;
        font-weight: 500;
    }

    button:hover {
        background-color: #0056b3;
    }

    #summary-area {
        font-family: Verdana, sans-serif;
        height: 35px;
        margin-top: 8px;
        padding: 8px;
        border-radius: 10px;
        background-color: rgba(245, 245, 247, 0.6);
        backdrop-filter: blur(5px);
        overflow-y: scroll;
        border-style: solid;
    }

    #answer-heading {
        margin-top: 0;
    }

    /* OCR Text Container Styles */
    #ocr-text-container {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 150px;
        max-height: 300px;
        margin-top: 12px;
        background-color: #fff;
        border: 1px solid #d1d1d1;
        border-radius: 10px;
        overflow: hidden;
    }

    /* Chat Interface Styles */
    #chat-container {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 200px;
        max-height: 350px;
        margin-top: 12px;
    }

    #chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
        background-color: #fff;
        border: 1px solid #d1d1d1;
        border-radius: 10px;
        margin-bottom: 8px;
        min-height: 100px;
    }

    .chat-message {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
        align-items: flex-start;
    }

    .chat-message.user {
        flex-direction: row-reverse;
    }

    .chat-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        background-color: #e0e0e0;
    }

    .chat-message.user .chat-avatar {
        background-color: #007AFF;
    }

    .chat-message.assistant .chat-avatar {
        background-color: #6c757d;
    }

    .chat-avatar svg {
        width: 16px;
        height: 16px;
        fill: white;
    }

    .chat-bubble {
        flex: 1;
        padding: 8px 12px;
        border-radius: 12px;
        font-size: 12px;
        line-height: 1.4;
        max-width: 75%;
        word-wrap: break-word;
    }

    .chat-message.user .chat-bubble {
        background-color: #007AFF;
        color: white;
        border-bottom-right-radius: 4px;
    }

    .chat-message.assistant .chat-bubble {
        background-color: #f0f0f0;
        color: #333;
        border-bottom-left-radius: 4px;
    }

    .chat-loading {
        display: flex;
        gap: 4px;
        padding: 4px;
    }

    .chat-loading-dot {
        width: 8px;
        height: 8px;
        background-color: #999;
        border-radius: 50%;
        animation: bounce 1.4s infinite ease-in-out both;
    }

    .chat-loading-dot:nth-child(1) {
        animation-delay: -0.32s;
    }

    .chat-loading-dot:nth-child(2) {
        animation-delay: -0.16s;
    }

    @keyframes bounce {
        0%, 80%, 100% {
            transform: scale(0);
        }
        40% {
            transform: scale(1);
        }
    }

    #chat-input-container {
        display: flex;
        gap: 8px;
        padding-top: 8px;
        border-top: 1px solid #d1d1d1;
    }

    #chat-input {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid #d1d1d1;
        border-radius: 20px;
        font-family: Verdana, sans-serif;
        font-size: 12px;
        outline: none;
        resize: none;
        min-height: 36px;
        max-height: 100px;
    }

    #chat-send-btn {
        width: 36px;
        height: 36px;
        padding: 0;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    #chat-send-btn:disabled {
        background-color: #ccc;
        cursor: not-allowed;
    }

    #chat-send-btn svg {
        width: 16px;
        height: 16px;
        fill: white;
    }

    :host([dark-mode]) #chat-messages {
        background-color: #202938;
        border-color: #4a4a4a;
    }

    :host([dark-mode]) .chat-message.assistant .chat-bubble {
        background-color: #2c3e50;
        color: #ecf0f1;
    }

    :host([dark-mode]) #chat-input {
        background-color: #202938;
        color: #ecf0f1;
        border-color: #4a4a4a;
    }

    :host([dark-mode]) #chat-input-container {
        border-color: #4a4a4a;
    }

    :host([dark-mode]) #ocr-text-container {
        background-color: #202938;
        border-color: #4a4a4a;
    }

    :host {
        --fg: #031b30;
        --bg: #f0f3f4;
        --bg-inputs: #8e44ad;
        --bg-select: #0d1117;
        --bg-result: #ffffff;
        --bg-inputs-hover: #5d2a73;
        --accent: #3fa5b9;
        --border-color: none;
        --text-color: #2e4053;
        --button-color: #ffffff;
        --width: 360px;
        --height: 270px;
        --gap: 8px;
    }

    :host([dark-mode]) {
        --background-color: #06041a;
        --text-color: #e0e0e0;
    }

    :host([dark-mode]) #body {
        background-color: #06041a;
        color: #e0e0e0;
    }

    :host([dark-mode]) #result,
    :host([dark-mode]) #result-in-process,
    :host([dark-mode]) #prompt,
    :host([dark-mode]) #key,
    :host([dark-mode]) #summary-area {
        background-color: #202938;
        color: #E67E22;
        border-color: #4a4a4a;
    }

    :host([dark-mode]) label {
        color: #FDDE5A;
    }

    :host([dark-mode]) select.language_select,
    :host([dark-mode]) button {
        background-color: #2c3e50;
        color: #ecf0f1;
        border-color: #4a4a4a;
    }

    :host([dark-mode]) button {
        background-color: #007AFF;
    }

    :host([dark-mode]) button:hover {
        background-color: #0056b3;
    }

    :host([dark-mode]) #toggle-dark-mode {
        fill: #FDDE5A;
    }

    :host([dark-mode]) .section-heading a {
        color: #FDDE5A;
    }

    /* Preview Section Styles */
    .preview-section {
        margin-bottom: 12px;
    }

    .preview-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }

    .preview-header label {
        margin: 0;
        font-weight: 500;
        color: #333;
    }

    #preview-screenshot {
        color: #333;
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        background-color: #f5f5f7;
        border: 1px solid #d1d1d1;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 12px;
    }

    #preview-screenshot:hover {
        background-color: #e3e3e8;
    }

    #preview-screenshot svg {
        width: 14px;
        height: 14px;
    }

    #preview-container {
        background-color: #fff;
        border: 1px solid #d1d1d1;
        border-radius: 10px;
        padding: 12px;
        min-height: 150px;
        max-height: 300px;
        overflow: hidden;
    }

    #preview-image-container {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        min-height: 120px;
        position: relative;
    }

    #preview-image {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    #preview-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #999;
        text-align: center;
        height: 100%;
    }

    #preview-placeholder svg {
        margin-bottom: 8px;
        opacity: 0.5;
    }

    #preview-placeholder p {
        margin: 0;
        font-size: 12px;
    }

    :host([dark-mode]) .preview-header label {
        color: #FDDE5A;
    }

    :host([dark-mode]) #preview-screenshot {
        background-color: #2c3e50;
        color: #ecf0f1;
        border-color: #4a4a4a;
    }

    :host([dark-mode]) #preview-screenshot:hover {
        background-color: #486684;
    }

    :host([dark-mode]) #preview-container {
        background-color: #202938;
        border-color: #4a4a4a;
    }

    :host([dark-mode]) #preview-placeholder {
        color: #999;
    }

    .spinner {
    display: none;
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    #result-in-process .spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border-width: 2px;
    }

    #prompt-response-spinner {
        margin: 20px auto;
    }

    /* Mobile Responsiveness */
    @media (max-width: 768px) {
        :host {
            --width: 95vw;
            --height: 80vh;
        }
        
        #body {
            padding: 10px;
            padding-bottom: 15px;
        }
        
        #top {
            flex-direction: column;
            gap: 8px;
            align-items: stretch;
        }
        
        .right-icons {
            justify-content: center;
        }
        
        #close,
        #copy {
            width: 100%;
            margin-top: 8px;
        }
        
        .tool-row {
            flex-direction: column;
            gap: 8px;
        }
        
        #tools {
            margin-top: 8px;
        }
        
        #api-key-section {
            flex-direction: column;
            gap: 8px;
        }
        
        #save-key {
            width: 100%;
            margin-left: 0;
        }
        
        #ocr-text-container,
        #chat-container {
            min-height: 120px;
            max-height: 250px;
        }
        
        #chat-messages {
            min-height: 80px;
        }
        
        .chat-bubble {
            max-width: 85%;
        }
        
        #chat-input-container {
            flex-direction: column;
            gap: 8px;
        }
        
        #chat-send-btn {
            width: 100%;
            height: 40px;
            border-radius: 10px;
        }
        
        .preview-header {
            flex-direction: column;
            gap: 8px;
            align-items: stretch;
        }
        
        #preview-container {
            min-height: 120px;
            max-height: 200px;
        }
        
        #settings-content {
            width: 95%;
            max-width: 350px;
            padding: 15px;
        }
        
        .settings-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
        }
        
        .settings-control {
            width: 100%;
            min-width: auto;
        }
    }

    /* Small mobile screens */
    @media (max-width: 480px) {
        #body {
            padding: 8px;
            padding-bottom: 12px;
        }
        
        #ocr-text-container,
        #chat-container {
            min-height: 100px;
            max-height: 200px;
        }
        
        #chat-messages {
            min-height: 60px;
        }
        
        .chat-bubble {
            max-width: 90%;
            font-size: 11px;
        }
        
        button,
        select.language_select {
            font-size: 11px;
            padding: 5px 8px;
        }
        
        label {
            font-size: 11px;
        }
        
        #preview-container {
            min-height: 100px;
            max-height: 150px;
        }
        
        #preview-image-container {
            min-height: 80px;
        }
    }
</style>

<div id="body">
    <div style="display: flex; justify-content: center;">
        <img id="img">
    </div>
    <div class="options" style="display:none;">
        <span class="sep"></span>
        <select id="accuracy_" style="display:none;">
            <option value='3.02'>Low Accuracy</option>
            <option value='4.0.0_fast'>Moderate Accuracy</option>
            <option value='4.0.0'>Better Accuracy</option>
            <option value='4.0.0_best'>Best Accuracy</option>
        </select>
        <input id="accuracy" type="hidden" value="">
    </div>
    <div class="grid" style="display:none;">
        <span>Downloading</span>
        <progress id="lang" value="0" max="1"></progress>
        <span>Recognizing</span>
        <progress id="recognize" value="0" max="1"></progress>
    </div>
    <div id="top">
        <div class="settings-button" id="settings-button" title="Settings">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
            </svg>
        </div>
        <div class="right-icons">
            <svg id="toggle-dark-mode" stroke="currentColor" fill="#9044ac" stroke-width="0" viewBox="0 0 16 16" class="dark-toggle cursor-pointer" height="28" width="28" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"></path>
                <path d="M10.794 3.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387a1.734 1.734 0 0 0-1.097 1.097l-.387 1.162a.217.217 0 0 1-.412 0l-.387-1.162A1.734 1.734 0 0 0 9.31 6.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387a1.734 1.734 0 0 0 1.097-1.097l.387-1.162zM13.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.156 1.156 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.156 1.156 0 0 0-.732-.732l-.774-.258a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732L13.863.1z"></path>
            </svg>
            <button id="copy" disabled>Copy</button>
            <button id="close" title="${this.locales.close}">Close</button>
        </div>
    </div>
    <div class="preview-section">
        <div class="preview-header">
            <label for="preview-container">Screenshot Preview</label>
            <button id="preview-screenshot" title="Toggle Preview">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M10.5 8.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                    <path d="M2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4H2zm.5 2a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1zm9 2.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z"/>
                </svg>
                <span id="preview-toggle-text">Hide Preview</span>
            </button>
        </div>
        <div id="preview-container" style="display: block;">
            <div id="preview-image-container">
                <img id="preview-image" alt="Captured Screenshot" style="display: none;">
                <div id="preview-placeholder">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M10.5 8.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                        <path d="M2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4H2zm.5 2a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1zm9 2.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z"/>
                    </svg>
                    <p>No screenshot captured yet</p>
                </div>
            </div>
        </div>
    </div>
    <label for="ocr-container">OCR Text</label>
    <div id="ocr-text-container">
        <div id="result" data-msg="Please wait..." style="display:none;"></div>
        <div id="result-in-process">
            <div class="spinner"></div>
        </div>
    </div>
    <div id="prompt-functions">
        <label for="api-key-section">API Key
            <a href="https://aistudio.google.com/app/apikey" title="Get API Key" style="text-decoration: none;">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
            </a>
        </label>

        <div id="api-key-section">
            <input type="text" placeholder="Enter your Gemini API key" id="key">
            <button id="save-key">Save</button>
        </div>

        <label for="chat-container">AI Chat</label>
        <div id="chat-container">
            <div id="chat-messages"></div>
            <div id="chat-input-container">
                <input type="text" id="chat-input" placeholder="Ask about the extracted text..." />
                <button id="chat-send-btn" disabled>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                </button>
            </div>
        </div>
    </div>
    <div id="tools">
        <div class="tool-row">
            <select id="language" class="language_select">
                <optgroup>
                    <option value="detect">Auto Detect (beta)</option>
                </optgroup>
                <optgroup id="frequently-used"></optgroup>
                <optgroup>
                    <option value="afr">Afrikaans</option>
                    <option value="amh">Amharic</option>
                    <option value="ara">Arabic</option>
                    <option value="asm">Assamese</option>
                    <option value="aze">Azerbaijani</option>
                    <option value="aze_cyrl">Azerbaijani - Cyrillic</option>
                    <option value="bel">Belarusian</option>
                    <option value="ben">Bengali</option>
                    <option value="bod">Tibetan</option>
                    <option value="bos">Bosnian</option>
                    <option value="bul">Bulgarian</option>
                    <option value="cat">Catalan; Valencian</option>
                    <option value="ceb">Cebuano</option>
                    <option value="ces">Czech</option>
                    <option value="chi_sim">Chinese - Simplified</option>
                    <option value="chi_tra">Chinese - Traditional</option>
                    <option value="chr">Cherokee</option>
                    <option value="cym">Welsh</option>
                    <option value="dan">Danish</option>
                    <option value="deu">German</option>
                    <option value="dzo">Dzongkha</option>
                    <option value="ell">Greek, Modern (1453-)</option>
                    <option value="enm">English, Middle (1100-1500)</option>
                    <option value="eng">English</option>
                    <option value="epo">Esperanto</option>
                    <option value="est">Estonian</option>
                    <option value="eus">Basque</option>
                    <option value="fas">Persian</option>
                    <option value="fra">French</option>
                    <option value="fin">Finnish</option>
                    <option value="frk">German Fraktur</option>
                    <option value="frm">French, Middle (ca. 1400-1600)</option>
                    <option value="gle">Irish</option>
                    <option value="glg">Galician</option>
                    <option value="grc">Greek, Ancient (-1453)</option>
                    <option value="guj">Gujarati</option>
                    <option value="hat">Haitian; Haitian Creole</option>
                    <option value="heb">Hebrew</option>
                    <option value="hin">Hindi</option>
                    <option value="hrv">Croatian</option>
                    <option value="hun">Hungarian</option>
                    <option value="iku">Inuktitut</option>
                    <option value="ind">Indonesian</option>
                    <option value="isl">Icelandic</option>
                    <option value="ita">Italian</option>
                    <option value="ita_old">Italian - Old</option>
                    <option value="jav">Javanese</option>
                    <option value="jpn">Japanese</option>
                    <option value="jpn_vert">Japanese - Vertical</option>
                    <option value="kan">Kannada</option>
                    <option value="kat">Georgian</option>
                    <option value="kat_old">Georgian - Old</option>
                    <option value="kaz">Kazakh</option>
                    <option value="khm">Central Khmer</option>
                    <option value="kir">Kirghiz; Kyrgyz</option>
                    <option value="kor">Korean</option>
                    <option value="kur">Kurdish</option>
                    <option value="lao">Lao</option>
                    <option value="lat">Latin</option>
                    <option value="lav">Latvian</option>
                    <option value="lit">Lithuanian</option>
                    <option value="mal">Malayalam</option>
                    <option value="mar">Marathi</option>
                    <option value="mkd">Macedonian</option>
                    <option value="mlt">Maltese</option>
                    <option value="msa">Malay</option>
                    <option value="mya">Burmese</option>
                    <option value="nep">Nepali</option>
                    <option value="nld">Dutch; Flemish</option>
                    <option value="nor">Norwegian</option>
                    <option value="ori">Oriya</option>
                    <option value="pan">Panjabi; Punjabi</option>
                    <option value="pol">Polish</option>
                    <option value="por">Portuguese</option>
                    <option value="pus">Pushto; Pashto</option>
                    <option value="ron">Romanian; Moldavian; Moldovan</option>
                    <option value="rus">Russian</option>
                    <option value="san">Sanskrit</option>
                    <option value="sin">Sinhala; Sinhalese</option>
                    <option value="slk">Slovak</option>
                    <option value="slv">Slovenian</option>
                    <option value="spa">Spanish; Castilian</option>
                    <option value="spa_old">Spanish; Castilian - Old</option>
                    <option value="sqi">Albanian</option>
                    <option value="srp">Serbian</option>
                    <option value="srp">latn Serbian - Latin</option>
                    <option value="swa">Swahili</option>
                    <option value="swe">Swedish</option>
                    <option value="syr">Syriac</option>
                    <option value="tam">Tamil</option>
                    <option value="tel">Telugu</option>
                    <option value="tgk">Tajik</option>
                    <option value="tgl">Tagalog</option>
                    <option value="tha">Thai</option>
                    <option value="tir">Tigrinya</option>
                    <option value="tur">Turkish</option>
                    <option value="uig">Uighur; Uyghur</option>
                    <option value="ukr">Ukrainian</option>
                    <option value="urd">Urdu</option>
                    <option value="uzb">Uzbek</option>
                    <option value="uzb_cyrl">Uzbek - Cyrillic</option>
                    <option value="vie">Vietnamese</option>
                    <option value="yid">Yiddish</option>
                </optgroup>
            </select>
        </div>
        <div class="tool-row">
            <button id="save-screenshot">Save Screenshot</button>
            <button id="save-text">Save Text</button>
        </div>
        <div class="tool-buttons">
            <button id="post" disabled title="${this.locales.post}" style="display:none;">Post Result</button>
        </div>
    </div>

    <!-- Settings Modal -->
    <div id="settings-modal">
        <div id="settings-content">
            <div id="settings-header">
                <h2 id="settings-title">Settings</h2>
                <button id="settings-close">&times;</button>
            </div>
            
            <div class="settings-section">
                <h3>Appearance</h3>
                <div class="settings-item">
                    <span class="settings-label">Dark Mode</span>
                    <div class="settings-toggle">
                        <div class="toggle-switch" id="dark-mode-toggle"></div>
                    </div>
                </div>
            </div>
            
            <div class="settings-section">
                <h3>OCR Settings</h3>
                <div class="settings-item">
                    <span class="settings-label">Language</span>
                    <div class="settings-control">
                        <select id="settings-language">
                            <optgroup>
                                <option value="detect">Auto Detect (beta)</option>
                            </optgroup>
                            <optgroup id="settings-frequently-used"></optgroup>
                            <optgroup>
                                <option value="eng">English</option>
                                <option value="fra">French</option>
                                <option value="deu">German</option>
                                <option value="spa">Spanish</option>
                                <option value="ita">Italian</option>
                                <option value="por">Portuguese</option>
                                <option value="rus">Russian</option>
                                <option value="ara">Arabic</option>
                                <option value="chi_sim">Chinese - Simplified</option>
                                <option value="chi_tra">Chinese - Traditional</option>
                                <option value="jpn">Japanese</option>
                                <option value="kor">Korean</option>
                            </optgroup>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    </div>

</div>



</div>
        `;
                this.events = {};
            }
            /* io */
            configure(prefs, report = false) {
                Object.assign(this.prefs, prefs);
                if (report) {
                    this.dispatchEvent(new CustomEvent('save-preference', {
                        detail: prefs
                    }));
                }
            }
            
            prepare() {
                
                for (const lang of this.prefs['frequently-used']) {
                    const e = this.shadowRoot.querySelector(`option[value="${lang}"]`).cloneNode(true);
                    this.shadowRoot.getElementById('frequently-used').appendChild(e);
                }
               
                this.language(this.prefs.lang);
                
                this.accuracy(this.prefs.accuracy);
            }
            build(html) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                this.clear();

                for (const child of [...doc.body.childNodes]) {
                    this.shadowRoot.getElementById('result').append(child);
                }

                // automatically copy to clipboard
                setTimeout(async () => {
                    try {
                        await navigator.clipboard.writeText(this.result);
                    }
                    catch (e) {
                        const input = document.createElement('textarea');
                        input.value = this.result;
                        input.style.position = 'absolute';
                        input.style.left = '-9999px';
                        document.body.append(input);
                        input.select();
                        document.execCommand('copy');
                        input.remove();
                    }

                }, 10);
            }
            message(value) {
                this.shadowRoot.getElementById('result-in-process').dataset.msg = value;
                // Update preview when OCR starts
                if (value.includes('recognizing') || value.includes('loading')) {
                    this.updatePreview();
                }
            }
            progress(value, type = 'recognize') {
                this.shadowRoot.getElementById(type).value = value;
            }
            rename(value) {
                this.shadowRoot.querySelector('option[value=detect]').textContent = value;
            }
            clear() {
                this.shadowRoot.getElementById('result').removeAttribute('contenteditable');
                this.shadowRoot.getElementById('result').textContent = '';
                this.shadowRoot.getElementById('result').style.display = 'none';
                this.shadowRoot.getElementById('result-in-process').style.display = 'flex';
                
                // Update preview with new screenshot (preview is now visible by default)
                this.updatePreview();
            }
            enable() {
                this.shadowRoot.getElementById('copy').disabled = false;
                this.shadowRoot.getElementById('post').disabled = false;
                this.shadowRoot.getElementById('result').setAttribute('contenteditable', true);
                this.shadowRoot.getElementById('result').style.display = 'block';
                this.shadowRoot.getElementById('result-in-process').style.display = 'none';
            }
            get result() {
                return this.shadowRoot.getElementById('result').innerText;
            }
            language(value) {
                this.dataset.language = value;
                this.shadowRoot.getElementById('language').value = value;
            }
            accuracy(value) {
                this.dataset.accuracy = value;
                this.shadowRoot.getElementById('accuracy').value = value;
            }
            toast(name, messages, timeout = 2000) {
                const elm = this.shadowRoot.getElementById(name);
                elm.value = messages.new;
                if (elm.tagName === 'BUTTON') {
                    elm.innerHTML = messages.new;
                }
                clearTimeout(this[name + 'ID']);
                this[name + 'ID'] = setTimeout(() => {
                    elm.value = messages.old;
                    if (elm.tagName === 'BUTTON') {
                        elm.innerHTML = messages.old;
                    }
                }, timeout);
            }

            // Chat helper methods
            addChatMessage(role, content) {
                const messageDiv = document.createElement('div');
                messageDiv.className = `chat-message ${role}`;

                const avatar = document.createElement('div');
                avatar.className = 'chat-avatar';

                if (role === 'user') {
                    avatar.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
                } else {
                    avatar.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3z"/></svg>';
                }

                const bubble = document.createElement('div');
                bubble.className = 'chat-bubble';
                bubble.textContent = content;

                messageDiv.appendChild(avatar);
                messageDiv.appendChild(bubble);

                return messageDiv;
            }

            addLoadingIndicator() {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'chat-message assistant';
                messageDiv.id = 'loading-message';

                const avatar = document.createElement('div');
                avatar.className = 'chat-avatar';
                avatar.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3z"/></svg>';

                const bubble = document.createElement('div');
                bubble.className = 'chat-bubble';

                const loading = document.createElement('div');
                loading.className = 'chat-loading';
                loading.innerHTML = '<div class="chat-loading-dot"></div><div class="chat-loading-dot"></div><div class="chat-loading-dot"></div>';

                bubble.appendChild(loading);
                messageDiv.appendChild(avatar);
                messageDiv.appendChild(bubble);

                return messageDiv;
            }

            scrollChatToBottom() {
                const chatMessages = this.shadowRoot.getElementById('chat-messages');
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }

            updatePreview() {
                const previewImage = this.shadowRoot.getElementById('preview-image');
                const previewPlaceholder = this.shadowRoot.getElementById('preview-placeholder');
                
                chrome.storage.local.get('ocr-screenshot', function(result) {
                    const url = result['ocr-screenshot'];
                    if (url) {
                        previewImage.src = url;
                        previewImage.style.display = 'block';
                        previewPlaceholder.style.display = 'none';
                    } else {
                        previewImage.style.display = 'none';
                        previewPlaceholder.style.display = 'flex';
                    }
                }.bind(this));
            }
            connectedCallback() {
                // Initialize preview with any existing screenshot
                this.updatePreview();
                
                // Preview screenshot toggle
                this.shadowRoot.getElementById('preview-screenshot').onclick = e => {
                    const previewContainer = this.shadowRoot.getElementById('preview-container');
                    const previewImage = this.shadowRoot.getElementById('preview-image');
                    const previewPlaceholder = this.shadowRoot.getElementById('preview-placeholder');
                    const toggleText = this.shadowRoot.getElementById('preview-toggle-text');
                    
                    if (previewContainer.style.display === 'none' || previewContainer.style.display === '') {
                        // Show preview
                        previewContainer.style.display = 'block';
                        toggleText.textContent = 'Hide Preview';
                        
                        // Load screenshot if available
                        chrome.storage.local.get('ocr-screenshot', function(result) {
                            const url = result['ocr-screenshot'];
                            if (url) {
                                previewImage.src = url;
                                previewImage.style.display = 'block';
                                previewPlaceholder.style.display = 'none';
                            } else {
                                previewImage.style.display = 'none';
                                previewPlaceholder.style.display = 'flex';
                            }
                        }.bind(this));
                    } else {
                        // Hide preview
                        previewContainer.style.display = 'none';
                        toggleText.textContent = 'Show Preview';
                    }
                };

                // Add dark mode toggle logic
                this.shadowRoot.getElementById('toggle-dark-mode').onclick = () => {
                    const isDarkMode = this.hasAttribute('dark-mode');
                    if (isDarkMode) {
                        this.removeAttribute('dark-mode');
                        chrome.storage.local.remove('dark-mode');
                    } else {
                        this.setAttribute('dark-mode', '');
                        chrome.storage.local.set({ 'dark-mode': 'true' });
                    }
                };

                // Settings modal functionality
                const settingsModal = this.shadowRoot.getElementById('settings-modal');
                const settingsButton = this.shadowRoot.getElementById('settings-button');
                const settingsClose = this.shadowRoot.getElementById('settings-close');
                const darkModeToggle = this.shadowRoot.getElementById('dark-mode-toggle');
                const settingsLanguage = this.shadowRoot.getElementById('settings-language');

                // Open settings modal
                settingsButton.onclick = () => {
                    settingsModal.style.display = 'flex';
                };

                // Close settings modal
                settingsClose.onclick = () => {
                    settingsModal.style.display = 'none';
                };

                // Close modal when clicking outside
                settingsModal.onclick = (e) => {
                    if (e.target === settingsModal) {
                        settingsModal.style.display = 'none';
                    }
                };

                // Dark mode toggle in settings
                darkModeToggle.onclick = () => {
                    const isDarkMode = this.hasAttribute('dark-mode');
                    if (isDarkMode) {
                        this.removeAttribute('dark-mode');
                        chrome.storage.local.remove('dark-mode');
                        darkModeToggle.classList.remove('active');
                    } else {
                        this.setAttribute('dark-mode', '');
                        chrome.storage.local.set({ 'dark-mode': 'true' });
                        darkModeToggle.classList.add('active');
                    }
                };

                // Language change handler
                settingsLanguage.onchange = () => {
                    const selectedLang = settingsLanguage.value;
                    this.dataset.lang = selectedLang;
                    chrome.storage.local.set({ 'lang': selectedLang });
                    this.dispatchEvent(new CustomEvent('language-changed'));
                };

                // Apply saved dark mode preference
                chrome.storage.local.get('dark-mode', function(result) {
                    if (result['dark-mode'] === 'true') {
                      this.setAttribute('dark-mode', '');
                      darkModeToggle.classList.add('active');
                    }
                  }.bind(this));

                // Initialize language settings
                chrome.storage.local.get('lang', function(result) {
                    const savedLang = result['lang'] || 'eng';
                    settingsLanguage.value = savedLang;
                    this.dataset.lang = savedLang;
                }.bind(this));

                // Initialize frequently used languages
                chrome.storage.local.get('frequently-used', function(result) {
                    const frequentlyUsed = result['frequently-used'] || ['eng', 'fra', 'deu', 'rus', 'ara'];
                    const frequentlyUsedGroup = this.shadowRoot.getElementById('settings-frequently-used');
                    frequentlyUsedGroup.innerHTML = frequentlyUsed.map(lang => {
                        const option = this.shadowRoot.querySelector(`#settings-language option[value="${lang}"]`);
                        return option ? option.outerHTML : '';
                    }).join('');
                }.bind(this));

                // Enter saved API Key in the API Key input field.
                chrome.storage.local.get('gemini-api-key', function(result) {
                    const API_KEY = result['gemini-api-key'];
                    if (API_KEY !== undefined) { 
                        // Check if API_KEY is not undefined
                        const apiKeyField = this.shadowRoot.querySelector('#key');
                        apiKeyField.value = API_KEY;
                        }
                    }.bind(this));

                // copy
                this.shadowRoot.getElementById('copy').onclick = async () => {
                    try {
                        await navigator.clipboard.writeText(this.result);
                    }
                    catch (e) {
                        const input = document.createElement('textarea');
                        input.value = this.result;
                        input.style.position = 'absolute';
                        input.style.left = '-9999px';
                        document.body.append(input);
                        input.select();
                        document.execCommand('copy');
                        input.remove();
                    }
                    this.toast('copy', {
                        new: 'Done',
                        old: 'Copy Text'
                    });
                };
                // post
                this.shadowRoot.getElementById('post').onclick = e => {
                    if (this.prefs['post-href'] === '' || e.shiftKey) {
                        const message = this.locales.tutorial.replace('&page;', this.dataset.page);
                        const m = prompt(
                            message,
                            [this.prefs['post-method'], this.prefs['post-href'], this.prefs['post-body']].join('|')
                        );
                        const [method, href, body] = (m || '').split('|');

                        const prefs = {
                            'post-method': (method || 'POST').toUpperCase(),
                            'post-href': href || '',
                            'post-body': body || ''
                        };
                        this.configure(prefs, true);
                    }

                    const value = this.result.trim();
                    const options = {
                        method: this.prefs['post-method'],
                        mode: 'no-cors'
                    };
                    if (this.prefs['post-body'] && this.prefs['post-method'] !== 'GET') {
                        options.body = this.prefs['post-body']
                            .replaceAll('&content;', value)
                            .replaceAll('&href;', location.href);
                        // If this is a JSON, try builder
                        if (this.prefs['post-body'].startsWith('{') && this.prefs['post-body'].endsWith('}')) {
                            try {
                                const o = JSON.parse(this.prefs['post-body']);
                                for (const [key, holder] of Object.entries(o)) {
                                    if (typeof holder === 'string') {
                                        o[key] = holder
                                            .replaceAll('&content;', value)
                                            .replaceAll('&href;', location.href);
                                    }
                                }
                                options.body = JSON.stringify(o);
                            }
                            catch (e) {
                                console.warn('Cannot use the JSON Builder', e);
                            }
                        }
                    }

                    const t = (msg, timeout = 3000) => this.toast('post', {
                        new: msg,
                        old: 'Post Result'
                    }, timeout);

                    if (this.prefs['post-href'] === '') {
                        return t('Empty Server');
                    }

                    t('...', 1000000);

                    const href = this.prefs['post-href']
                        .replaceAll('&content;', encodeURIComponent(value))
                        .replaceAll('&href;', encodeURIComponent(location.href));

                    if (options.method === 'OPEN') {
                        this.dispatchEvent(new CustomEvent('open-link', {
                            detail: href
                        }));

                        t('Done');
                    }
                    else {
                        this.dispatchEvent(new CustomEvent('fetch-resource', {
                            detail: {
                                href, options
                            }
                        }));
                    }
                };
                // change language
                this.shadowRoot.getElementById('language').onchange = e => {
                    this.language(e.target.value);
                    const prefs = {
                        'lang': e.target.value,
                        'frequently-used': this.prefs['frequently-used']
                    };
                    prefs['frequently-used'].unshift(prefs.lang);
                    prefs['frequently-used'] = prefs['frequently-used'].filter((s, i, l) => s && l.indexOf(s) === i).slice(0, 10);
                    this.configure(prefs, true);
                    this.dispatchEvent(new Event('language-changed'));
                };
                // change accuracy
                this.shadowRoot.getElementById('accuracy').onchange = e => {
                    this.accuracy(e.target.value);
                    const prefs = {
                        'accuracy': e.target.value
                    };
                    this.configure(prefs, true);
                    this.dispatchEvent(new Event('accuracy-changed'));
                };

                // Save API Key
                this.shadowRoot.getElementById('save-key').onclick = e => {
                    var API_KEY = this.shadowRoot.getElementById('key').value;
                    chrome.storage.local.set({ 'gemini-api-key': API_KEY }, function() {
                    console.log('API Key saved:', API_KEY);

                    // Test the API key by listing available models
                    fetch(`https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`)
                      .then(response => response.json())
                      .then(data => {
                        console.log('Available Gemini models:');
                        if (data.models) {
                          data.models.forEach(model => {
                            console.log(`  - ${model.name} (supports: ${model.supportedGenerationMethods?.join(', ')})`);
                          });
                        } else {
                          console.error('No models found or API key invalid:', data);
                        }
                      })
                      .catch(error => {
                        console.error('Error fetching models:', error);
                      });
                    });
                };

                // Initialize chat with welcome message
                const chatMessages = this.shadowRoot.getElementById('chat-messages');
                const welcomeMessage = this.addChatMessage('assistant', "Hi! I've analyzed the extracted text. Ask me anything about it!");
                chatMessages.appendChild(welcomeMessage);
                this.chatMessages.push({ role: 'assistant', content: "Hi! I've analyzed the extracted text. Ask me anything about it!" });

                // Chat input handler
                const chatInput = this.shadowRoot.getElementById('chat-input');
                const chatSendBtn = this.shadowRoot.getElementById('chat-send-btn');

                // Enable/disable send button based on input
                chatInput.oninput = () => {
                    chatSendBtn.disabled = !chatInput.value.trim();
                };

                // Handle sending messages
                const handleSend = async () => {
                    const prompt = chatInput.value.trim();
                    if (!prompt) return;

                    const API_KEY = this.shadowRoot.getElementById('key').value;
                    const ocr_text = this.shadowRoot.getElementById('result').innerText;

                    // Validation
                    if (!API_KEY || API_KEY.trim() === '') {
                        const errorMsg = this.addChatMessage('assistant', 'Error: Please enter and save your Gemini API key first.');
                        chatMessages.appendChild(errorMsg);
                        this.scrollChatToBottom();
                        return;
                    }

                    // Add user message
                    const userMsg = this.addChatMessage('user', prompt);
                    chatMessages.appendChild(userMsg);
                    this.chatMessages.push({ role: 'user', content: prompt });
                    this.scrollChatToBottom();

                    // Clear input and disable button
                    chatInput.value = '';
                    chatSendBtn.disabled = true;

                    // Show loading indicator
                    const loadingIndicator = this.addLoadingIndicator();
                    chatMessages.appendChild(loadingIndicator);
                    this.scrollChatToBottom();

                    const question = `Prompt-"${prompt}". Context-"${ocr_text}"`;

                    try {
                        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                "contents": [
                                    { "parts": [{ "text": question }] }
                                ]
                            })
                        });

                        // Remove loading indicator
                        const loader = this.shadowRoot.getElementById('loading-message');
                        if (loader) loader.remove();

                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.error?.message || `API Error: ${response.status} ${response.statusText}`);
                        }

                        const data = await response.json();

                        if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
                            throw new Error('Invalid response from API - no text generated');
                        }

                        const generatedSummary = data.candidates[0].content.parts[0].text;

                        // Add assistant message
                        const assistantMsg = this.addChatMessage('assistant', generatedSummary);
                        chatMessages.appendChild(assistantMsg);
                        this.chatMessages.push({ role: 'assistant', content: generatedSummary });
                        this.scrollChatToBottom();

                    } catch (error) {
                        console.error('Error:', error);

                        // Remove loading indicator
                        const loader = this.shadowRoot.getElementById('loading-message');
                        if (loader) loader.remove();

                        // Add error message
                        const errorMsg = this.addChatMessage('assistant', `Error: ${error.message}. Please check your API key and try again.`);
                        chatMessages.appendChild(errorMsg);
                        this.scrollChatToBottom();
                    }
                };

                // Send button click
                chatSendBtn.onclick = handleSend;

                // Enter key to send
                chatInput.onkeypress = (e) => {
                    if (e.key === 'Enter' && !e.shiftKey && chatInput.value.trim()) {
                        e.preventDefault();
                        handleSend();
                    }
                };
  

                // Save text
                this.shadowRoot.getElementById('save-text').onclick = e => {
                  const textToSave = this.shadowRoot.getElementById('result').innerText;
              
                  // Create a blob for the OCR text
                  const blob = new Blob([textToSave], { type: 'text/plain' });
              
                  // Create a link element
                  const link = document.createElement('a');
                  link.download = 'ocr-result.txt';
              
                  // Create object URL for the blob
                  link.href = window.URL.createObjectURL(blob);
              
                  // Append the link to the Shadow DOM and click it
                  this.shadowRoot.appendChild(link);
                  link.click();
              
                  // Remove the link from the Shadow DOM
                  this.shadowRoot.removeChild(link);
              };
                             
              // Save screenshot
                this.shadowRoot.getElementById('save-screenshot').onclick = e => {
                    chrome.storage.local.get('ocr-screenshot', function(result) {
                    const url = result['ocr-screenshot'];
                    
                    // Create a link element
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'screenshot.png';
                    
                    // Append the link to the Shadow DOM and click it
                    this.shadowRoot.appendChild(a);
                    a.click();
                    
                    // Remove the link from the Shadow DOM
                    this.shadowRoot.removeChild(a);
                    }.bind(this));
                };
  
                             
                // close
                this.shadowRoot.getElementById('close').onclick = e => {
                    this.remove();
                    this.dispatchEvent(new MouseEvent('closed', {
                        shiftKey: e.shiftKey,
                        ctrlKey: e.ctrlKey,
                        metaKey: e.metaKey
                    }));
                };

                // apply commands on cross-origin (Firefox Only)
                this.addEventListener('command', () => {
                    const { name, args } = JSON.parse(this.getAttribute('command'));
                    this[name](...args);
                });
                // constants
                this.dataset.languages = [...this.shadowRoot.querySelectorAll('#language option')]
                    .map(e => e.value)
                    .filter(s => s !== 'detect')
                    .join(', ');
            }
        }
        customElements.define('ocr-result', OCRResult);
    }
}

