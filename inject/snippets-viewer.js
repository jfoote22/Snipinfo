// Snippets Viewer Sidebar Component
import { getCurrentUser } from '../firebase/firebase-config.js';
import { getUserSnippets, searchSnippets, deleteSnippet, updateSnippet } from '../firebase/firebase-service.js';

if (customElements.get('snippets-viewer') === undefined) {
    class SnippetsViewer extends HTMLElement {
        constructor() {
            super();

            this.snippets = [];
            this.filteredSnippets = [];
            this.currentFilter = 'all';
            this.searchQuery = '';

            const shadow = this.attachShadow({ mode: 'open' });

            // Import the CSS
            const linkElem = document.createElement('link');
            linkElem.setAttribute('rel', 'stylesheet');
            linkElem.setAttribute('href', chrome.runtime.getURL('inject/snippets-viewer.css'));
            shadow.appendChild(linkElem);

            shadow.innerHTML += `
                <div id="snippets-sidebar" class="sidebar hidden">
                    <div class="sidebar-header">
                        <h2>My Snippets</h2>
                        <button id="close-sidebar" title="Close Sidebar">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                        </button>
                    </div>

                    <div class="sidebar-controls">
                        <div class="search-bar">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                            </svg>
                            <input type="text" id="search-input" placeholder="Search snippets...">
                        </div>

                        <div class="filter-tabs">
                            <button class="filter-tab active" data-filter="all">All</button>
                            <button class="filter-tab" data-filter="today">Today</button>
                            <button class="filter-tab" data-filter="week">This Week</button>
                            <button class="filter-tab" data-filter="month">This Month</button>
                        </div>

                        <div class="sort-controls">
                            <label>Sort by:</label>
                            <select id="sort-select">
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="title">Title A-Z</option>
                            </select>
                        </div>
                    </div>

                    <div id="snippets-count" class="snippets-count">0 snippets</div>

                    <div id="snippets-list" class="snippets-list">
                        <div class="loading-spinner">
                            <div class="spinner"></div>
                            <p>Loading snippets...</p>
                        </div>
                    </div>
                </div>

                <div id="sidebar-overlay" class="overlay hidden"></div>
            `;
        }

        connectedCallback() {
            this.setupEventListeners();
            this.loadSnippets();
        }

        setupEventListeners() {
            const closeBtn = this.shadowRoot.getElementById('close-sidebar');
            const overlay = this.shadowRoot.getElementById('sidebar-overlay');
            const searchInput = this.shadowRoot.getElementById('search-input');
            const filterTabs = this.shadowRoot.querySelectorAll('.filter-tab');
            const sortSelect = this.shadowRoot.getElementById('sort-select');

            closeBtn.onclick = () => this.closeSidebar();
            overlay.onclick = () => this.closeSidebar();

            // Search input with debounce
            let searchTimeout;
            searchInput.oninput = (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchQuery = e.target.value.toLowerCase();
                    this.filterAndDisplaySnippets();
                }, 300);
            };

            // Filter tabs
            filterTabs.forEach(tab => {
                tab.onclick = () => {
                    filterTabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    this.currentFilter = tab.dataset.filter;
                    this.filterAndDisplaySnippets();
                };
            });

            // Sort select
            sortSelect.onchange = () => {
                this.filterAndDisplaySnippets();
            };
        }

        async loadSnippets() {
            const snippetsList = this.shadowRoot.getElementById('snippets-list');
            snippetsList.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Loading snippets...</p>
                </div>
            `;

            try {
                const result = await getUserSnippets({ limitCount: 500 });

                if (result.success) {
                    this.snippets = result.snippets;
                    this.filterAndDisplaySnippets();
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                console.error('Error loading snippets:', error);
                snippetsList.innerHTML = `
                    <div class="error-message">
                        <p>Failed to load snippets</p>
                        <p class="error-details">${error.message}</p>
                        <button onclick="this.getRootNode().host.loadSnippets()">Retry</button>
                    </div>
                `;
            }
        }

        filterAndDisplaySnippets() {
            let filtered = [...this.snippets];

            // Apply date filter
            if (this.currentFilter !== 'all') {
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                filtered = filtered.filter(snippet => {
                    const snippetDate = new Date(snippet.timestamp);

                    if (this.currentFilter === 'today') {
                        return snippetDate >= today;
                    } else if (this.currentFilter === 'week') {
                        const weekAgo = new Date(today);
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return snippetDate >= weekAgo;
                    } else if (this.currentFilter === 'month') {
                        const monthAgo = new Date(today);
                        monthAgo.setMonth(monthAgo.getMonth() - 1);
                        return snippetDate >= monthAgo;
                    }
                    return true;
                });
            }

            // Apply search filter
            if (this.searchQuery) {
                filtered = filtered.filter(snippet => {
                    return (
                        snippet.title.toLowerCase().includes(this.searchQuery) ||
                        snippet.ocrText.toLowerCase().includes(this.searchQuery) ||
                        snippet.tags.some(tag => tag.toLowerCase().includes(this.searchQuery)) ||
                        snippet.category.toLowerCase().includes(this.searchQuery)
                    );
                });
            }

            // Apply sorting
            const sortValue = this.shadowRoot.getElementById('sort-select').value;
            filtered.sort((a, b) => {
                if (sortValue === 'newest') {
                    return new Date(b.timestamp) - new Date(a.timestamp);
                } else if (sortValue === 'oldest') {
                    return new Date(a.timestamp) - new Date(b.timestamp);
                } else if (sortValue === 'title') {
                    return a.title.localeCompare(b.title);
                }
                return 0;
            });

            this.filteredSnippets = filtered;
            this.displaySnippets();
        }

        displaySnippets() {
            const snippetsList = this.shadowRoot.getElementById('snippets-list');
            const snippetsCount = this.shadowRoot.getElementById('snippets-count');

            snippetsCount.textContent = `${this.filteredSnippets.length} snippet${this.filteredSnippets.length !== 1 ? 's' : ''}`;

            if (this.filteredSnippets.length === 0) {
                snippetsList.innerHTML = `
                    <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64" fill="currentColor">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/>
                        </svg>
                        <p>No snippets found</p>
                        <p class="empty-subtitle">Capture a screenshot and save it to see it here!</p>
                    </div>
                `;
                return;
            }

            snippetsList.innerHTML = this.filteredSnippets.map(snippet => this.createSnippetCard(snippet)).join('');

            // Attach event listeners to snippet cards
            this.attachSnippetEventListeners();
        }

        createSnippetCard(snippet) {
            const date = new Date(snippet.timestamp);
            const formattedDate = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const hasExtractedData =
                snippet.extractedData.phoneNumbers.length > 0 ||
                snippet.extractedData.emails.length > 0 ||
                snippet.extractedData.urls.length > 0;

            return `
                <div class="snippet-card" data-id="${snippet.id}">
                    <div class="snippet-thumbnail">
                        <img src="${snippet.screenshotUrl}" alt="Screenshot" loading="lazy">
                    </div>
                    <div class="snippet-content">
                        <div class="snippet-header">
                            <h3 class="snippet-title">${this.escapeHtml(snippet.title)}</h3>
                            <div class="snippet-actions">
                                <button class="action-btn view-btn" title="View Details" data-id="${snippet.id}">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                                    </svg>
                                </button>
                                <button class="action-btn delete-btn" title="Delete Snippet" data-id="${snippet.id}">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div class="snippet-meta">
                            <span class="snippet-date">${formattedDate}</span>
                            <span class="snippet-language">${snippet.language.toUpperCase()}</span>
                        </div>
                        <p class="snippet-text">${this.escapeHtml(snippet.ocrText.substring(0, 150))}${snippet.ocrText.length > 150 ? '...' : ''}</p>
                        ${hasExtractedData ? `
                            <div class="snippet-extracted">
                                ${snippet.extractedData.phoneNumbers.length > 0 ? `
                                    <div class="extracted-item">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                                        </svg>
                                        ${snippet.extractedData.phoneNumbers.length} phone${snippet.extractedData.phoneNumbers.length > 1 ? 's' : ''}
                                    </div>
                                ` : ''}
                                ${snippet.extractedData.emails.length > 0 ? `
                                    <div class="extracted-item">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                                        </svg>
                                        ${snippet.extractedData.emails.length} email${snippet.extractedData.emails.length > 1 ? 's' : ''}
                                    </div>
                                ` : ''}
                                ${snippet.extractedData.urls.length > 0 ? `
                                    <div class="extracted-item">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                            <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
                                        </svg>
                                        ${snippet.extractedData.urls.length} link${snippet.extractedData.urls.length > 1 ? 's' : ''}
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        attachSnippetEventListeners() {
            const viewButtons = this.shadowRoot.querySelectorAll('.view-btn');
            const deleteButtons = this.shadowRoot.querySelectorAll('.delete-btn');

            viewButtons.forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const snippetId = btn.dataset.id;
                    this.viewSnippetDetails(snippetId);
                };
            });

            deleteButtons.forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const snippetId = btn.dataset.id;
                    this.deleteSnippetConfirm(snippetId);
                };
            });
        }

        viewSnippetDetails(snippetId) {
            const snippet = this.snippets.find(s => s.id === snippetId);
            if (!snippet) return;

            // Create modal for snippet details
            const modal = document.createElement('div');
            modal.className = 'snippet-modal';
            modal.innerHTML = `
                <div class="modal-backdrop"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Snippet Details</h2>
                        <button class="modal-close">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="detail-screenshot">
                            <img src="${snippet.screenshotUrl}" alt="Screenshot">
                        </div>
                        <div class="detail-section">
                            <h3>Title</h3>
                            <p>${this.escapeHtml(snippet.title)}</p>
                        </div>
                        <div class="detail-section">
                            <h3>Extracted Text</h3>
                            <div class="detail-text">${this.escapeHtml(snippet.ocrText)}</div>
                        </div>
                        ${snippet.extractedData.phoneNumbers.length > 0 ? `
                            <div class="detail-section">
                                <h3>Phone Numbers</h3>
                                <ul class="detail-list">
                                    ${snippet.extractedData.phoneNumbers.map(phone => `<li>${this.escapeHtml(phone)}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        ${snippet.extractedData.emails.length > 0 ? `
                            <div class="detail-section">
                                <h3>Email Addresses</h3>
                                <ul class="detail-list">
                                    ${snippet.extractedData.emails.map(email => `<li><a href="mailto:${this.escapeHtml(email)}">${this.escapeHtml(email)}</a></li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        ${snippet.extractedData.urls.length > 0 ? `
                            <div class="detail-section">
                                <h3>Links</h3>
                                <ul class="detail-list">
                                    ${snippet.extractedData.urls.map(url => `<li><a href="${this.escapeHtml(url.startsWith('http') ? url : 'https://' + url)}" target="_blank">${this.escapeHtml(url)}</a></li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        <div class="detail-section">
                            <h3>Metadata</h3>
                            <p><strong>Language:</strong> ${snippet.language.toUpperCase()}</p>
                            <p><strong>Created:</strong> ${new Date(snippet.timestamp).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            `;

            this.shadowRoot.appendChild(modal);

            // Close modal handlers
            const closeBtn = modal.querySelector('.modal-close');
            const backdrop = modal.querySelector('.modal-backdrop');

            const closeModal = () => modal.remove();
            closeBtn.onclick = closeModal;
            backdrop.onclick = closeModal;
        }

        async deleteSnippetConfirm(snippetId) {
            const snippet = this.snippets.find(s => s.id === snippetId);
            if (!snippet) return;

            if (confirm(`Are you sure you want to delete "${snippet.title}"?`)) {
                try {
                    const result = await deleteSnippet(snippetId);
                    if (result.success) {
                        // Remove from local array
                        this.snippets = this.snippets.filter(s => s.id !== snippetId);
                        this.filterAndDisplaySnippets();
                    } else {
                        alert('Failed to delete snippet: ' + result.error);
                    }
                } catch (error) {
                    console.error('Error deleting snippet:', error);
                    alert('Failed to delete snippet: ' + error.message);
                }
            }
        }

        openSidebar() {
            const sidebar = this.shadowRoot.getElementById('snippets-sidebar');
            const overlay = this.shadowRoot.getElementById('sidebar-overlay');

            sidebar.classList.remove('hidden');
            overlay.classList.remove('hidden');

            setTimeout(() => {
                sidebar.classList.add('open');
                overlay.classList.add('show');
            }, 10);

            // Reload snippets when opening
            this.loadSnippets();
        }

        closeSidebar() {
            const sidebar = this.shadowRoot.getElementById('snippets-sidebar');
            const overlay = this.shadowRoot.getElementById('sidebar-overlay');

            sidebar.classList.remove('open');
            overlay.classList.remove('show');

            setTimeout(() => {
                sidebar.classList.add('hidden');
                overlay.classList.add('hidden');
            }, 300);
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    }

    customElements.define('snippets-viewer', SnippetsViewer);
}
