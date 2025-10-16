// Firebase Module Loader - This runs as a module and makes Firebase available globally
import {
    signInWithGoogle,
    signOutUser,
    onAuthChange,
    getCurrentUser
} from '../firebase/firebase-config.js';
import { saveSnippet, addGeminiPrompt } from '../firebase/firebase-service.js';
import { extractAllData } from '../utils/text-extractor.js';

// Make Firebase functions available globally for elements.js
window.firebaseAuth = {
    signInWithGoogle,
    signOutUser,
    onAuthChange,
    getCurrentUser
};

window.firebaseService = {
    saveSnippet,
    addGeminiPrompt
};

window.textExtractor = {
    extractAllData
};

console.log('Firebase modules loaded successfully');
