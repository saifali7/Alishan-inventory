// Render Backend Storage Manager - Complete Solution
class RenderStorageManager {
    constructor() {
        this.backendUrl = this.getBackendUrl();
        this.userId = this.getUserId();
        this.autoSaveEnabled = true;
        this.autoSaveInterval = 30000; // 30 seconds
        this.isInitialized = false;
    }

    getBackendUrl() {
        const currentDomain = window.location.hostname;
        
        if (currentDomain === 'localhost' || currentDomain === '127.0.0.1') {
            return 'http://localhost:3000';
        } else {
            // ✅ APNA RENDER BACKEND URL YAHAN DALEN
            return 'https://alishanapp.onrender.com';
        }
    }

    getUserId() {
        let userId = localStorage.getItem('alishan_user_id');
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('alishan_user_id', userId);
        }
        return userId;
    }

    // ✅ User ID management functions
    showUserId() {
        const userId = this.getUserId();
        const userIdDisplay = document.getElementById('userIdDisplay');
        if (userIdDisplay) {
            userIdDisplay.textContent = userId;
        }
        
        // Copy to clipboard
        navigator.clipboard.writeText(userId).then(() => {
            if (typeof showNotification === 'function') {
                showNotification('✅ User ID copied to clipboard!', 'success');
            }
        }).catch(() => {
            prompt('Copy your User ID:', userId);
        });
    }

    importUserId() {
        const newUserId = prompt('Enter your User ID from another device:');
        if (newUserId && newUserId.startsWith('user_')) {
            localStorage.setItem('alishan_user_id', newUserId);
            if (typeof showNotification === 'function') {
                showNotification('✅ User ID imported! Refreshing page...', 'success');
            }
            setTimeout(() => {
                location.reload();
            }, 2000);
        } else if (newUserId) {
            if (typeof showNotification === 'function') {
                showNotification('❌ Invalid User ID format', 'error');
            }
        }
    }

    // ✅ Initialize storage system
    async initialize() {
        try {
            // Setup database first time
            await this.setupDatabase();
            
            // Start auto-save
            this.startAutoSave();
            
            this.isInitialized = true;
            console.log('✅ Render storage initialized successfully');
            
            // Update user ID display
            this.showUserId();
            
            return true;
        } catch (error) {
            console.error('❌ Render storage initialization failed:', error);
            return false;
        }
    }

    // ✅ Setup database (first time)
    async setupDatabase() {
        try {
            const response = await fetch(`${this.backendUrl}/api/setup-database`);
            
            if (!response.ok) {
                throw new Error(`Database setup failed: ${response.status}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Database setup failed');
            }

            console.log('✅ Database setup completed:', result.message);
            return true;
        } catch (error) {
            console.error('Database setup error:', error);
            throw error;
        }
    }

    // ✅ Save data to backend
    async saveToBackend(inventoryData) {
        try {
            const payload = {
                userId: this.userId,
                inventoryData: inventoryData
            };

            const response = await fetch(`${this.backendUrl}/api/inventory/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Backend save failed: ${response.status}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Backend save failed');
            }

            console.log('✅ Data saved to backend:', result.message);
            localStorage.setItem('lastBackendSave', new Date().toISOString());
            localStorage.setItem('lastBackendResult', JSON.stringify(result));
            
            return result;
        } catch (error) {
            console.error('❌ Backend save error:', error);
            throw error;
        }
    }

    // ✅ Load data from backend
    async loadFromBackend() {
        try {
            const response = await fetch(`${this.backendUrl}/api/inventory/load/${this.userId}`);
            
            if (!response.ok) {
                throw new Error(`Backend load failed: ${response.status}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Backend load failed');
            }

            if (!result.data) {
                console.log('ℹ️ No data found in backend for user:', this.userId);
                return null;
            }

            console.log('✅ Data loaded from backend:', result.message);
            localStorage.setItem('lastBackendLoad', new Date().toISOString());
            
            return result.data;
        } catch (error) {
            console.error('❌ Backend load error:', error);
            throw error;
        }
    }

    // ✅ Auto-save system
    startAutoSave() {
        if (!this.autoSaveEnabled) return;

        console.log('🔄 Auto-save started (30 second intervals)');
        
        setInterval(() => {
            this.autoSave();
        }, this.autoSaveInterval);
    }

    async autoSave() {
        try {
            const inventoryData = localStorage.getItem('inventoryItems');
            if (!inventoryData) return;

            const data = JSON.parse(inventoryData);
            if (data.length === 0) return;

            await this.saveToBackend(data);
            console.log('🔄 Auto-save completed');
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }

    // ✅ Manual save
    async manualSave() {
        try {
            const inventoryData = localStorage.getItem('inventoryItems');
            if (!inventoryData) {
                throw new Error('No local data to save');
            }

            const data = JSON.parse(inventoryData);
            if (data.length === 0) {
                throw new Error('Inventory is empty');
            }

            if (typeof showNotification === 'function') {
                showNotification('🔄 Saving to cloud...', 'info');
            }

            const result = await this.saveToBackend(data);
            
            if (typeof showNotification === 'function') {
                showNotification('✅ Data saved to cloud successfully!', 'success');
            }
            
            return { success: true, message: 'Manual save completed', result };
        } catch (error) {
            console.error('Manual save failed:', error);
            
            if (typeof showNotification === 'function') {
                showNotification('❌ Save failed: ' + error.message, 'error');
            }
            
            return { success: false, message: error.message };
        }
    }

    // ✅ Manual load
    async manualLoad() {
        try {
            if (typeof showNotification === 'function') {
                showNotification('🔄 Loading from cloud...', 'info');
            }

            const cloudData = await this.loadFromBackend();
            
            if (!cloudData) {
                throw new Error('No data found in cloud storage');
            }

            // Local storage mein save karen
            localStorage.setItem('inventoryItems', JSON.stringify(cloudData));
            localStorage.setItem('lastCloudRestore', new Date().toISOString());
            
            // UI update karen
            if (window.inventoryItems !== undefined) {
                window.inventoryItems = cloudData;
                window.filteredItems = [...cloudData];
                
                if (window.renderInventoryCards) window.renderInventoryCards();
                if (window.updateDashboard) window.updateDashboard();
            }

            if (typeof showNotification === 'function') {
                showNotification('✅ Data loaded from cloud successfully!', 'success');
            }
            
            return { success: true, data: cloudData };
        } catch (error) {
            console.error('Manual load failed:', error);
            
            if (typeof showNotification === 'function') {
                showNotification('❌ Load failed: ' + error.message, 'error');
            }
            
            return { success: false, message: error.message };
        }
    }

    // ✅ Check connection status
    async checkConnection() {
        try {
            const response = await fetch(`${this.backendUrl}/api/health`);
            const data = await response.json();
            
            return {
                connected: true,
                backend: data.service,
                database: data.database,
                databaseConnected: data.databaseConnected,
                timestamp: data.timestamp
            };
        } catch (error) {
            return {
                connected: false,
                error: error.message
            };
        }
    }

    // ✅ Get sync status
    async getSyncStatus() {
        try {
            const connection = await this.checkConnection();
            const lastSave = localStorage.getItem('lastBackendSave');
            const lastLoad = localStorage.getItem('lastBackendLoad');
            
            // Get sync history
            const historyResponse = await fetch(`${this.backendUrl}/api/inventory/history/${this.userId}`);
            const historyData = await historyResponse.json();
            
            return {
                initialized: this.isInitialized,
                connected: connection.connected,
                databaseConnected: connection.databaseConnected,
                lastSave: lastSave,
                lastLoad: lastLoad,
                syncHistory: historyData.success ? historyData.history : [],
                userId: this.userId,
                backendUrl: this.backendUrl
            };
        } catch (error) {
            return {
                initialized: this.isInitialized,
                connected: false,
                error: error.message
            };
        }
    }

    // ✅ Force sync (save & load)
    async forceSync() {
        try {
            if (typeof showNotification === 'function') {
                showNotification('🔄 Force syncing data...', 'info');
            }

            // First save current data
            await this.manualSave();
            
            // Then load latest data
            await this.manualLoad();
            
            if (typeof showNotification === 'function') {
                showNotification('✅ Force sync completed!', 'success');
            }
            
            return { success: true, message: 'Force sync completed' };
        } catch (error) {
            if (typeof showNotification === 'function') {
                showNotification('❌ Force sync failed: ' + error.message, 'error');
            }
            return { success: false, message: error.message };
        }
    }
}

// Global instance
const renderStorage = new RenderStorageManager();