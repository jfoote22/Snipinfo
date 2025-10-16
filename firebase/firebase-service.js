// Firebase Service for Firestore and Storage Operations
import { db, storage, getCurrentUser } from './firebase-config.js';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
  ref,
  uploadString,
  getDownloadURL,
  deleteObject
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

/**
 * Save a snippet to Firestore and Storage
 * @param {Object} snippetData - The snippet data
 * @param {string} snippetData.ocrText - Extracted OCR text
 * @param {string} snippetData.language - Language used for OCR
 * @param {string} snippetData.screenshotBase64 - Base64 encoded screenshot
 * @param {Object} snippetData.extractedData - Extracted emails, phones, URLs
 * @param {string} snippetData.title - Snippet title (optional)
 * @param {Array} snippetData.tags - Array of tags (optional)
 * @param {string} snippetData.category - Category (optional)
 * @param {Array} snippetData.geminiPrompts - Array of Gemini Q&A (optional)
 * @returns {Promise<Object>} Result with snippet ID
 */
export async function saveSnippet(snippetData) {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User must be signed in to save snippets');
    }

    // Upload screenshot to Firebase Storage
    const screenshotUrl = await uploadScreenshot(
      user.uid,
      snippetData.screenshotBase64
    );

    // Prepare Firestore document
    const snippetDoc = {
      userId: user.uid,
      timestamp: Timestamp.now(),
      ocrText: snippetData.ocrText,
      language: snippetData.language,
      screenshotUrl: screenshotUrl,
      extractedData: snippetData.extractedData || {
        phoneNumbers: [],
        emails: [],
        urls: []
      },
      title: snippetData.title || generateTitle(snippetData.ocrText),
      tags: snippetData.tags || [],
      category: snippetData.category || 'Uncategorized',
      geminiPrompts: snippetData.geminiPrompts || []
    };

    // Add document to Firestore
    const docRef = await addDoc(collection(db, 'snippets'), snippetDoc);

    return {
      success: true,
      snippetId: docRef.id,
      message: 'Snippet saved successfully'
    };
  } catch (error) {
    console.error('Error saving snippet:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Upload screenshot to Firebase Storage
 * @param {string} userId - User ID
 * @param {string} base64Data - Base64 encoded image
 * @returns {Promise<string>} Download URL
 */
async function uploadScreenshot(userId, base64Data) {
  const timestamp = Date.now();
  const fileName = `${userId}/${timestamp}.png`;
  const storageRef = ref(storage, `screenshots/${fileName}`);

  await uploadString(storageRef, base64Data, 'data_url');
  const downloadURL = await getDownloadURL(storageRef);

  return downloadURL;
}

/**
 * Get all snippets for the current user
 * @param {Object} options - Query options
 * @param {number} options.limitCount - Limit results (optional)
 * @param {string} options.orderByField - Field to order by (default: timestamp)
 * @param {string} options.orderDirection - 'asc' or 'desc' (default: desc)
 * @returns {Promise<Array>} Array of snippets
 */
export async function getUserSnippets(options = {}) {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User must be signed in');
    }

    const {
      limitCount = 100,
      orderByField = 'timestamp',
      orderDirection = 'desc'
    } = options;

    const q = query(
      collection(db, 'snippets'),
      where('userId', '==', user.uid),
      orderBy(orderByField, orderDirection),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const snippets = [];

    querySnapshot.forEach((doc) => {
      snippets.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate()
      });
    });

    return {
      success: true,
      snippets: snippets
    };
  } catch (error) {
    console.error('Error fetching snippets:', error);
    return {
      success: false,
      error: error.message,
      snippets: []
    };
  }
}

/**
 * Search snippets by text query
 * @param {string} searchText - Text to search for
 * @returns {Promise<Array>} Filtered snippets
 */
export async function searchSnippets(searchText) {
  try {
    const result = await getUserSnippets({ limitCount: 500 });
    if (!result.success) {
      return result;
    }

    const searchLower = searchText.toLowerCase();
    const filtered = result.snippets.filter((snippet) => {
      return (
        snippet.title.toLowerCase().includes(searchLower) ||
        snippet.ocrText.toLowerCase().includes(searchLower) ||
        snippet.tags.some((tag) => tag.toLowerCase().includes(searchLower)) ||
        snippet.category.toLowerCase().includes(searchLower)
      );
    });

    return {
      success: true,
      snippets: filtered
    };
  } catch (error) {
    console.error('Error searching snippets:', error);
    return {
      success: false,
      error: error.message,
      snippets: []
    };
  }
}

/**
 * Update an existing snippet
 * @param {string} snippetId - Snippet ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Result
 */
export async function updateSnippet(snippetId, updates) {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User must be signed in');
    }

    const snippetRef = doc(db, 'snippets', snippetId);
    await updateDoc(snippetRef, updates);

    return {
      success: true,
      message: 'Snippet updated successfully'
    };
  } catch (error) {
    console.error('Error updating snippet:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete a snippet
 * @param {string} snippetId - Snippet ID
 * @returns {Promise<Object>} Result
 */
export async function deleteSnippet(snippetId) {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User must be signed in');
    }

    // Get snippet to retrieve screenshot URL
    const snippetRef = doc(db, 'snippets', snippetId);
    const snippetDoc = await getDoc(snippetRef);

    if (!snippetDoc.exists()) {
      throw new Error('Snippet not found');
    }

    const snippetData = snippetDoc.data();

    // Delete screenshot from Storage
    if (snippetData.screenshotUrl) {
      const screenshotRef = ref(storage, snippetData.screenshotUrl);
      await deleteObject(screenshotRef);
    }

    // Delete Firestore document
    await deleteDoc(snippetRef);

    return {
      success: true,
      message: 'Snippet deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting snippet:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Add a Gemini prompt/response to a snippet
 * @param {string} snippetId - Snippet ID
 * @param {Object} promptData - Prompt and response
 * @returns {Promise<Object>} Result
 */
export async function addGeminiPrompt(snippetId, promptData) {
  try {
    const snippetRef = doc(db, 'snippets', snippetId);
    const snippetDoc = await getDoc(snippetRef);

    if (!snippetDoc.exists()) {
      throw new Error('Snippet not found');
    }

    const currentPrompts = snippetDoc.data().geminiPrompts || [];
    currentPrompts.push({
      prompt: promptData.prompt,
      response: promptData.response,
      timestamp: new Date().toISOString()
    });

    await updateDoc(snippetRef, {
      geminiPrompts: currentPrompts
    });

    return {
      success: true,
      message: 'Gemini prompt added successfully'
    };
  } catch (error) {
    console.error('Error adding Gemini prompt:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate a title from OCR text (first 50 chars)
 * @param {string} text - OCR text
 * @returns {string} Generated title
 */
function generateTitle(text) {
  if (!text || text.trim().length === 0) {
    return 'Untitled Snippet';
  }
  const cleaned = text.trim().replace(/\s+/g, ' ');
  return cleaned.length > 50 ? cleaned.substring(0, 50) + '...' : cleaned;
}
