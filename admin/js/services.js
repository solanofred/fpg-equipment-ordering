// ─── Services: DraftService, ProductService, API helpers

async function loadAdminEmails() {
    try {
        const res = await fetch('./admins.json');
        if (res.ok) {
            const data = await res.json();
            return data.map(a => a.email.toLowerCase().trim());
        }
    } catch (e) {}
    return FALLBACK_ADMINS;
}

// Auth Service
const AuthService = {
    login: async (email) => {
        const normalizedEmail = email.toLowerCase().trim();
        try {
            const res = await fetch('./admins.json?v=' + Date.now());
            const admins = await res.json();
            const admin = admins.find(a => a.email.toLowerCase() === normalizedEmail);
            if (admin) {
                const session = { email: normalizedEmail, name: admin.name || '', role: admin.role || 'admin', timestamp: Date.now() };
                localStorage.setItem(SESSION_KEY, JSON.stringify(session));
                return true;
            }
            return false;
        } catch {
            return false;
        }
    },
    
    logout: () => {
        localStorage.removeItem(SESSION_KEY);
    },
    
    getSession: () => {
        try {
            const session = localStorage.getItem(SESSION_KEY);
            if (!session) return null;
            
            const parsed = JSON.parse(session);
            // Session expires after 24 hours
            if (Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000) {
                AuthService.logout();
                return null;
            }
            return parsed;
        } catch {
            return null;
        }
    },
    
    isAuthenticated: () => {
        return AuthService.getSession() !== null;
    }
};

// Product Service
const ProductService = {
    // Azure Function URL - UPDATE THIS AFTER DEPLOYING
    AZURE_FUNCTION_URL: 'https://fpg-equipment-function-b1.azurewebsites.net/api/publish-products',
    
    async loadProducts() {
        try {
            const response = await fetch('./products.json');
            return await response.json();
        } catch (error) {
            console.error('Error loading products:', error);
            return [];
        }
    },
    
    async publishToGitHub(products, adminEmail) {
        try {
            const response = await fetch(ProductService.AZURE_FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-email': adminEmail
                },
                body: JSON.stringify({ action: 'publish-products', products })
            });
            
            const text = await response.text();
            if (!text || text.trim() === '') {
                throw new Error('Azure Function returned empty response. Check deployment.');
            }
            const result = JSON.parse(text);
            
            if (!response.ok) {
                throw new Error(result.message || 'Failed to publish to GitHub');
            }
            
            return result;
        } catch (error) {
            console.error('Error publishing to GitHub:', error);
            throw error;
        }
    },
    
    async saveProducts(products) {
        // Fallback: Manual download (if Azure Function fails or not configured)
        const dataStr = JSON.stringify(products, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'products.json';
        link.click();
        URL.revokeObjectURL(url);
        
        alert('Products saved! Upload the downloaded products.json file to GitHub to update the live site.');
        return true;
    }
};

// Draft Management Service
const DraftService = {
    DRAFTS_KEY: 'fpg_product_drafts_v1',
    
    getDrafts: () => {
        try {
            const drafts = localStorage.getItem(DraftService.DRAFTS_KEY);
            return drafts ? JSON.parse(drafts) : {};
        } catch (e) {
            return {};
        }
    },
    
    saveDraft: (product) => {
        const drafts = DraftService.getDrafts();
        drafts[product.id] = {
            ...product,
            _draftTimestamp: Date.now()
        };
        localStorage.setItem(DraftService.DRAFTS_KEY, JSON.stringify(drafts));
    },
    
    removeDraft: (productId) => {
        const drafts = DraftService.getDrafts();
        delete drafts[productId];
        localStorage.setItem(DraftService.DRAFTS_KEY, JSON.stringify(drafts));
    },
    
    clearAllDrafts: () => {
        localStorage.removeItem(DraftService.DRAFTS_KEY);
    },
    
    hasDrafts: () => {
        return Object.keys(DraftService.getDrafts()).length > 0;
    },
    
    getDraftCount: () => {
        return Object.keys(DraftService.getDrafts()).length;
    },
    
    applyDrafts: (products) => {
        const drafts = DraftService.getDrafts();
        return products.map(p => {
            if (drafts[p.id]) {
                const { _draftTimestamp, ...draftProduct } = drafts[p.id];
                return draftProduct;
            }
            return p;
        });
    },
    
    isDraftProduct: (productId) => {
        const drafts = DraftService.getDrafts();
        return !!drafts[productId];
    }
};

// Main App
// Custom Confirmation Modal Component
