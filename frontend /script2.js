


// ================= ENHANCED SEARCH VARIABLES =================
let searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];
let searchAnalytics = JSON.parse(localStorage.getItem('searchAnalytics')) || {};
let currentSuggestions = [];
let selectedSuggestionIndex = -1;




// ✅ YEH CODE script2.js KE START MEIN ADD KAREN
// ================= VALIDATION FUNCTIONS =================
// Data validation functions
function validateInventoryItem(item) {
    if (!item || typeof item !== 'object') {
        console.error('Invalid item: not an object');
        return false;
    }
    

    // Required fields check - CODE KO ADD KAREN
    const requiredFields = ['productType', 'quality', 'code'];
    if (!requiredFields.every(field => field in item)) {
        console.error('Invalid item: missing required fields');
        return false;
    }
    
    
    
    // Type validation
    if (typeof item.productType !== 'string') {
        console.error('Invalid item: productType should be string');
        return false;
    }
    
    
    
    
    // Code validation
    if (typeof item.code !== 'string' || !/^\d{6}$/.test(item.code)) {
        console.error('Invalid item: code should be 6-digit string');
        return false;
    }
    
    
    
    
    
    
    
    
    if (typeof item.quality !== 'string') {
        console.error('Invalid item: quality should be string');
        return false;
    }
    
    // Optional fields validation
    if (item.material && (typeof item.material !== 'number' || item.material < 0)) {
        console.error('Invalid item: material should be positive number');
        return false;
    }
    
    if (item.weight && (typeof item.weight !== 'number' || item.weight < 0)) {
        console.error('Invalid item: weight should be positive number');
        return false;
    }
    
    if (item.price && (typeof item.price !== 'number' || item.price < 0)) {
        console.error('Invalid item: price should be positive number');
        return false;
    }
    
    // Color validation
    if (item.colors && !Array.isArray(item.colors)) {
        console.error('Invalid item: colors should be array');
        return false;
    }
    
    return true;
}

// Data loading with validation
function loadInventoryData() {
    try {
        const stored = localStorage.getItem('inventoryItems');
        if (!stored) return [];
        
        const parsed = JSON.parse(stored);
        
        // Data validation - check if array hai
        if (!Array.isArray(parsed)) {
            throw new Error('Invalid data format: expected array');
        }
        
        // Validate each item
        const validItems = [];
        const invalidItems = [];
        
        parsed.forEach(item => {
            if (validateInventoryItem(item)) {
                validItems.push(item);
            } else {
                console.warn('Invalid item filtered out:', item);
                invalidItems.push(item);
            }
        });
        
        // Backup invalid data
        if (invalidItems.length > 0) {
            backupCorruptedData(JSON.stringify(invalidItems));
        }
        
        return validItems;
        
    } catch (error) {
        console.error('Data loading failed:', error);
        // Backup banayein
        backupCorruptedData(stored);
        return [];
    }
}

function backupCorruptedData(data) {
    if (data) {
        const backupKey = `inventory_backup_${Date.now()}`;
        localStorage.setItem(backupKey, data);
        showNotification('Some data was invalid and has been backed up', 'warning');
        return true;
    }
    return false;
}
// ================= END VALIDATION FUNCTIONS =================

// ================= UNIQUE CODE GENERATOR =================
function generateUniqueCode() {
    const stored = localStorage.getItem('inventoryItems');
    if (!stored) {
        return String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
    }
    
    const existingItems = JSON.parse(stored);
    const usedCodes = new Set(existingItems.map(item => item.code));
    
    let code;
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
        code = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
        attempts++;
        
        if (attempts > maxAttempts) {
            console.error('Failed to generate unique code after', maxAttempts, 'attempts');
            code = String(Date.now() % 1000000).padStart(6, '0');
            break;
        }
    } while (usedCodes.has(code));
    
    return code;
}

// Purane data ko migrate karne ke liye function
function migrateOldData() {
    try {
        const stored = localStorage.getItem('inventoryItems');
        if (!stored) return;
        
        const parsed = JSON.parse(stored);
        let needsMigration = false;
        
        // Check if any item missing code
        parsed.forEach(item => {
            if (!item.code) {
                item.code = generateUniqueCode();
                needsMigration = true;
                console.log('Migrated old item with code:', item.code);
            }
        });
        
        // Save migrated data
        if (needsMigration) {
            localStorage.setItem('inventoryItems', JSON.parse(JSON.stringify(parsed)));
            showNotification('Old data migrated successfully with unique codes', 'success');
        }
        
    } catch (error) {
        console.error('Data migration failed:', error);
    }
}
// ================= END UNIQUE CODE FUNCTIONS =================

// Data storage for inventory items
let inventoryItems = [];

// Pagination variables
let currentPage = 1;
let itemsPerPage = 50;
let totalPages = 1;

// Search indexes
let searchIndex = {
    byQuality: {},
    byLotNumber: {},
    byNotes: {},
    byProductType: {}
};

// Debounce variables
let searchTimeout = null;
const SEARCH_DELAY = 300; // milliseconds

// Load data from localStorage safely
// ✅ YEH CODE ADD KAREN, EXISTING LOADING CODE KO REPLACE KARKE
// Load data with validation
inventoryItems = loadInventoryData();
// Function to format current date and time
function getCurrentDateTime() {
    const now = new Date();
    return now.toISOString();
}

// Function to calculate total pieces
function calculateTotalPieces(totalDozens) {
    return totalDozens * 12; // 1 dozen = 12 pieces
}

// Function to calculate total amount
function calculateTotalAmount(totalDozens, pricePerDozen) {
    return totalDozens * (pricePerDozen || 0);
}

// ✅ ADDED COLOR VALIDATION FUNCTIONS
function isValidColor(color) {
    // Only letters and spaces allowed, no numbers, no special characters
    return /^[a-zA-Z\s]+$/.test(color);
}

function cleanColorName(color) {
    // Remove numbers and special characters, keep only letters and spaces
    return color.replace(/[^a-zA-Z\s]/g, '').trim();
}

// Toggle between same sizes and different sizes options
function toggleSizeOption() {
    const sameSizesOption = document.querySelector('input[name="sizeOption"][value="same"]');
    const sameSizesContainer = document.getElementById('sameSizesContainer');
    const differentSizesContainer = document.getElementById('differentSizesContainer');
    
    if (sameSizesOption && sameSizesContainer && differentSizesContainer) {
        if (sameSizesOption.checked) {
            sameSizesContainer.style.display = 'block';
            differentSizesContainer.style.display = 'none';
        } else {
            sameSizesContainer.style.display = 'none';
            differentSizesContainer.style.display = 'block';
        }
    }
}

// Toggle edit size option
function toggleEditSizeOption() {
    const sameSizesOption = document.querySelector('input[name="editSizeOption"][value="same"]');
    const sameSizesContainer = document.getElementById('editSameSizesContainer');
    const differentSizesContainer = document.getElementById('editDifferentSizesContainer');
    
    if (sameSizesOption && sameSizesContainer && differentSizesContainer) {
        if (sameSizesOption.checked) {
            sameSizesContainer.style.display = 'block';
            differentSizesContainer.style.display = 'none';
        } else {
            sameSizesContainer.style.display = 'none';
            differentSizesContainer.style.display = 'block';
        }
    }
}

// Add color size item for different sizes option
function addColorSizeItem() {
    const colorSizeItems = document.getElementById('colorSizeItems');
    if (!colorSizeItems) return;
    
    const colorCount = colorSizeItems.children.length + 1;
    
    const colorSizeItem = document.createElement('div');
    colorSizeItem.className = 'color-size-item';
    colorSizeItem.innerHTML = `
        <div class="color-size-header">
            <h4>Color #${colorCount}</h4>
            <button type="button" class="remove-color-btn" onclick="removeColorSizeItem(this)">Remove</button>
        </div>
        <div class="form-group">
            <label>Color Name</label>
            <input type="text" class="color-name" placeholder="Enter color name">
        </div>
        <div class="size-grid">
            ${[28, 30, 32, 34, 36, 38, 40, 42, 44, 46].map(size => `
                <div class="size-input-group">
                    <label>Size ${size}</label>
                    <input type="number" class="color-size-${size}" min="0" step="1" placeholder="Dozens">
                </div>
            `).join('')}
        </div>
    `;
    
    colorSizeItems.appendChild(colorSizeItem);
}

// Remove color size item
function removeColorSizeItem(button) {
    const colorSizeItem = button.closest('.color-size-item');
    if (!colorSizeItem) return;
    
    colorSizeItem.remove();
    
    // Update the numbers for remaining color items
    const colorSizeItems = document.getElementById('colorSizeItems');
    if (!colorSizeItems) return;
    
    const items = colorSizeItems.getElementsByClassName('color-size-item');
    
    for (let i = 0; i < items.length; i++) {
        const header = items[i].querySelector('h4');
        if (header) {
            header.textContent = `Color #${i + 1}`;
        }
    }
}

// Add color size item for edit modal
function addEditColorSizeItem() {
    const editColorSizeItems = document.getElementById('editColorSizeItems');
    if (!editColorSizeItems) return;
    
    const colorCount = editColorSizeItems.children.length + 1;
    
    const colorSizeItem = document.createElement('div');
    colorSizeItem.className = 'color-size-item';
    colorSizeItem.innerHTML = `
        <div class="color-size-header">
            <h4>Color #${colorCount}</h4>
            <button type="button" class="remove-color-btn" onclick="removeEditColorSizeItem(this)">Remove</button>
        </div>
        <div class="form-group">
            <label>Color Name</label>
            <input type="text" class="edit-color-name" placeholder="Enter color name">
        </div>
        <div class="size-grid">
            ${[28, 30, 32, 34, 36, 38, 40, 42, 44, 46].map(size => `
                <div class="size-input-group">
                    <label>Size ${size}</label>
                    <input type="number" class="edit-color-size-${size}" min="0" step="1" placeholder="Dozens">
                </div>
            `).join('')}
        </div>
    `;
    
    editColorSizeItems.appendChild(colorSizeItem);
}

// Remove color size item from edit modal
function removeEditColorSizeItem(button) {
    // Confirm before removing
    if (!confirm('Are you sure you want to remove this color?')) {
        return;
    }
    
    const colorSizeItem = button.closest('.color-size-item');
    if (!colorSizeItem) return;
    
    colorSizeItem.remove();
    
    // Update the numbers for remaining color items
    const editColorSizeItems = document.getElementById('editColorSizeItems');
    if (!editColorSizeItems) return;
    
    const items = editColorSizeItems.getElementsByClassName('color-size-item');
    
    // Check if any items left
    if (items.length === 0) {
        // Switch back to same sizes option if no colors left
        const sameSizesOption = document.querySelector('input[name="editSizeOption"][value="same"]');
        if (sameSizesOption) {
            sameSizesOption.checked = true;
            toggleEditSizeOption();
        }
        return;
    }
    
    // Update numbering for remaining items
    for (let i = 0; i < items.length; i++) {
        const header = items[i].querySelector('h4');
        if (header) {
            header.textContent = `Color #${i + 1}`;
        }
    }
    
    // Show notification
    showNotification('Color removed successfully', 'success');
}

// Function to add new inventory item
function addInventoryItem(e) {
    e.preventDefault();
    
    // Get form values
    
    const productType = document.getElementById('productType').value;
    const cupSize = document.getElementById('cupSize').value;
    const lotNumber = document.getElementById('lotNumber').value;
    const quality = document.getElementById('quality').value;
    const material = parseFloat(document.getElementById('material').value) || 0;
    const weight = parseFloat(document.getElementById('weight').value) || 0;
    const price = parseFloat(document.getElementById('price').value) || 0;
    const notes = document.getElementById('notes').value;
    
    // Validate required fields
    if (!productType) {
        showNotification('Product Type is required', 'error');
        return;
    }
    
    if (!quality) {
        showNotification('Quality Name is required', 'error');
        return;
    }
    
    // Get size option
    const sizeOption = document.querySelector('input[name="sizeOption"]:checked');
    if (!sizeOption) {
        showNotification('Please select a size option', 'error');
        return;
    }
    
    let colors = [];
    let sizeData = {};
    let totalDozens = 0;
    
    if (sizeOption.value === 'same') {
        // Same sizes for all colors
        const colorsInput = document.getElementById('colors');
        if (!colorsInput) {
            showNotification('Colors input not found', 'error');
            return;
        }
        
        // ✅ UPDATED WITH AUTO-CLEAN VALIDATION
        colors = colorsInput.value.split(' ')
            .map(color => cleanColorName(color)) // Auto-clean first
            .filter(color => color !== '')
            .filter(color => {
                if (!isValidColor(color)) {
                    showNotification(`Invalid color: "${color}". Only letters allowed.`, 'error');
                    return false;
                }
                return true;
            });
        
        // Get size values
        const sizes = [28, 30, 32, 34, 36, 38, 40, 42, 44, 46];
        
        sizes.forEach(size => {
            const element = document.getElementById(`size${size}`);
            if (element) {
                sizeData[`size${size}`] = parseInt(element.value) || 0;
                totalDozens += parseInt(element.value) || 0;
            }
        });
    } else {
        // Different sizes for each color
        const colorSizeItems = document.getElementById('colorSizeItems');
        if (!colorSizeItems) {
            showNotification('Color size items container not found', 'error');
            return;
        }
        
        const colorObjects = [];
        
        // Process each color size item
        for (let i = 0; i < colorSizeItems.children.length; i++) {
            const item = colorSizeItems.children[i];
            const colorNameInput = item.querySelector('.color-name');
            if (!colorNameInput) continue;
            
            const colorName = cleanColorName(colorNameInput.value.trim()); // ✅ AUTO-CLEAN
            
            // ✅ ADDED VALIDATION
            if (colorName) {
                if (!isValidColor(colorName)) {
                    showNotification(`Invalid color: "${colorName}". Only letters allowed.`, 'error');
                    continue; // Skip invalid color
                }
                
                const colorSizes = {};
                let colorTotal = 0;
                
                // Get sizes for this color
                [28, 30, 32, 34, 36, 38, 40, 42, 44, 46].forEach(size => {
                    const sizeInput = item.querySelector(`.color-size-${size}`);
                    if (sizeInput) {
                        const sizeValue = parseInt(sizeInput.value) || 0;
                        colorSizes[`size${size}`] = sizeValue;
                        colorTotal += sizeValue;
                    }
                });
                
                colorObjects.push({
                    name: colorName.toUpperCase(),
                    sizes: colorSizes
                });
                
                totalDozens += colorTotal;
            }
        }
        
        colors = colorObjects;
    }
    
    // Calculate totals
    const totalPieces = calculateTotalPieces(totalDozens);
    const totalAmount = calculateTotalAmount(totalDozens, price);
    const dateTime = getCurrentDateTime();
    
    // Create new inventory item
    const newItem = {
        id: Date.now(),
        code: generateUniqueCode(), // YEH LINE ADD KAREN
        dateTime,
        productType: productType.toUpperCase(),
        cupSize: cupSize || 'N/A', // Add cup size
        lotNumber: lotNumber,
        quality: quality.toUpperCase(),
        material,
        weight,
        price,
        colors,
        notes,
        totalDozens,
        totalPieces,
        totalAmount,
        inStock: true,
        sizeOption: sizeOption.value
    };
    
    // Add size data for simple format
    if (sizeOption.value === 'same') {
        Object.assign(newItem, sizeData);
    }
    
    // ✅ YEH VALIDATION CODE ADD KAREN
// Validate before saving
if (!validateInventoryItem(newItem)) {
    showNotification('Invalid item data. Please check all fields.', 'error');
    return;
}
    
    // Add to inventory (at the beginning of the array to show newest first)
    inventoryItems.unshift(newItem);
    
    afterDataModification(); // Use centralized update function
    
    // Reset form
    document.getElementById('productForm').reset();
    
    // Reset size mode to "Same sizes for all colors"
    const sameSizesOption = document.querySelector('input[name="sizeOption"][value="same"]');
    if (sameSizesOption) {
        sameSizesOption.checked = true;
        toggleSizeOption();
    }
    
    // Clear color size items if any
    const colorSizeItems = document.getElementById('colorSizeItems');
    if (colorSizeItems) {
        colorSizeItems.innerHTML = '';
    }
    
    // Show success message
    showNotification('Product entry added successfully!', 'success');
}

// Function to update inventory display
function updateInventoryDisplay() {
    displayPaginatedItems(); // Use pagination instead of direct render
}

function renderItems(items) {
    const inventoryCards = document.getElementById('inventoryCards');
    if (!inventoryCards) return;
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    if (items.length === 0) {
        inventoryCards.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-clipboard-list"></i>
                </div>
                <h3>No inventory items found</h3>
                <p>Try changing your search criteria</p>
            </div>
        `;
        return;
    }
    
    items.forEach((item) => {
        const originalIndex = inventoryItems.findIndex(i => i.id === item.id);
        const card = createInventoryCard(item, originalIndex);
        fragment.appendChild(card);
    });
    
    // Clear and append in one operation
    inventoryCards.innerHTML = '';
    inventoryCards.appendChild(fragment);
}

// Function to create inventory card
function createInventoryCard(item, index) {
    const card = document.createElement('div');
    card.className = 'inventory-card';
    
    
    
    
    // ✅ YE CODE ADD KARNA HAI (Date formatting)
const date = new Date(item.dateTime);
const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
});
const formattedTime = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
});






// ✅ Format last modified date (if available)
let modifiedHtml = '';
if (item.lastModified) {
    const modifiedDate = new Date(item.lastModified);
    const formattedModifiedDate = modifiedDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    const formattedModifiedTime = modifiedDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    modifiedHtml = `
            <div class="detail-item">
                <span class="detail-label">LAST UPDATED:</span>
                <span class="detail-value">
                    <i class="fas fa-sync-alt"></i> 
                    ${formattedModifiedDate}, ${formattedModifiedTime}
                </span>
            </div>
        `;
}
    
    
    
    
    
    // Safe check for colors
    const hasColors = Array.isArray(item.colors) && item.colors.length > 0;
    const isSimpleColorFormat = hasColors && typeof item.colors[0] === 'string';
    
    // Calculate totals
    const sizes = [28, 30, 32, 34, 36, 38, 40, 42, 44, 46];
    let totalDozensAllColors = 0;
    
    if (isSimpleColorFormat) {
        // For simple format (colors as strings)
        sizes.forEach(size => {
            totalDozensAllColors += item[`size${size}`] || 0;
        });
        totalDozensAllColors = totalDozensAllColors * item.colors.length;
    } else if (hasColors) {
        // For complex format (colors as objects with sizes)
        item.colors.forEach(color => {
            let colorTotal = 0;
            sizes.forEach(size => {
                colorTotal += color.sizes[`size${size}`] || 0;
            });
            totalDozensAllColors += colorTotal;
        });
    }
    
    // Calculate total amount
    const totalAmount = totalDozensAllColors * item.price;
    
    // Create color tags
    let colorTags = '';
    if (hasColors) {
        if (isSimpleColorFormat) {
            colorTags = item.colors.map(color => {
                const colorClass = `color-${color.toLowerCase()}`;
                return `<span class="color-tag ${colorClass}">${color}</span>`;
            }).join('');
        } else {
            colorTags = item.colors.map(color => {
                const colorClass = `color-${color.name.toLowerCase()}`;
                return `<span class="color-tag ${colorClass}">${color.name}</span>`;
            }).join('');
        }
    }
    
    // Create card content based on format type
    let cardContent = '';
    
    if (isSimpleColorFormat) {
        // Simple format layout
        cardContent = `
            <div class="calculation-flow">
                <div class="flow-box">
                    <h4><i class="fas fa-ruler"></i> SIZE QUANTITIES (DOZENS)</h4>
                    <div class="size-chart">
                        ${sizes.map(size => `
                            <div class="size-item">
                                <div class="size-label">${size}</div>
                                <div class="size-value">${item[`size${size}`] || 0}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="calculation-step">
                        <span class="step-label">TOTAL DOZENS:</span>
                        <span class="step-value">${item.totalDozens}</span>
                    </div>
                </div>
                
                <div class="divider">
                    <div class="divider-line"></div>
                    <i class="fas fa-times divider-icon"></i>
                    <div class="divider-line"></div>
                </div>
                
                <div class="flow-box">
                    <h4><i class="fas fa-palette"></i> COLORS</h4>
                    <div class="color-tags">
                        ${colorTags || 'No colors specified'}
                    </div>
                    <div class="calculation-step">
                        <span class="step-label">NUMBER OF COLORS:</span>
                        <span class="step-value">${hasColors ? item.colors.length : 0}</span>
                    </div>
                </div>
                
                <div class="divider">
                    <div class="divider-line"></div>
                    <i class="fas fa-equals divider-icon"></i>
                    <div class="divider-line"></div>
                </div>
                
                <div class="flow-box">
                    <h4><i class="fas fa-calculator"></i> TOTAL CALCULATION</h4>
                    <div class="calculation-steps">
                        <div class="calculation-step">
                            <span class="step-label">TOTAL DOZENS (ALL COLORS):</span>
                            <span class="step-value">${totalDozensAllColors}</span>
                        </div>
                        <div class="calculation-step">
                            <span class="step-label">PRICE PER DOZEN:</span>
                            <span class="step-value">₹${item.price}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else if (hasColors) {
        // Complex format layout
        // Create color size tables
        const colorSizeTables = item.colors.map(color => {
            let colorTotal = 0;
            const sizeItems = sizes.map(size => {
                const sizeValue = color.sizes[`size${size}`] || 0;
                colorTotal += sizeValue;
                return `
                    <div class="size-item">
                        <div class="size-label">${size}</div>
                        <div class="size-value">${sizeValue}</div>
                    </div>
                `;
            }).join('');
            
            const colorClass = `color-${color.name.toLowerCase()}`;
            return `
                <div class="color-size-table">
                    <div class="color-header ${colorClass}">
                        <i class="fas fa-circle" style="color: inherit;"></i>
                        ${color.name} - TOTAL: ${colorTotal} DOZENS
                    </div>
                    <div class="size-chart">
                        ${sizeItems}
                    </div>
                </div>
            `;
        }).join('');
        
        cardContent = `
            <div class="calculation-flow">
                <div class="flow-box">
                    <h4><i class="fas fa-palette"></i> COLORS</h4>
                    <div class="color-tags">
                        ${colorTags}
                    </div>
                    <div class="calculation-step">
                        <span class="step-label">NUMBER OF COLORS:</span>
                        <span class="step-value">${item.colors.length}</span>
                    </div>
                </div>
                
                <div class="flow-box">
                    <h4><i class="fas fa-ruler-combined"></i> SIZE QUANTITIES BY COLOR (DOZENS)</h4>
                    <div class="color-size-tables">
                        ${colorSizeTables}
                    </div>
                    <div class="calculation-step">
                        <span class="step-label">TOTAL DOZENS (ALL COLORS):</span>
                        <span class="step-value">${totalDozensAllColors}</span>
                    </div>
                </div>
                
                <div class="divider">
                    <div class="divider-line"></div>
                    <i class="fas fa-times divider-icon"></i>
                    <div class="divider-line"></div>
                </div>
                
                <div class="flow-box">
                    <h4><i class="fas fa-calculator"></i> TOTAL CALCULATION</h4>
                    <div class="calculation-steps">
                        <div class="calculation-step">
                            <span class="step-label">PRICE PER DOZEN:</span>
                            <span class="step-value">₹${item.price}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else {
        // No colors specified
        cardContent = `
            <div class="calculation-flow">
                <div class="flow-box">
                    <h4><i class="fas fa-palette"></i> COLORS</h4>
                    <p>No colors specified for this item.</p>
                </div>
            </div>
        `;
    }
    
card.innerHTML = `
    <div class="card-header">
        
        <div>
                <!-- Line 1: Quality and Lot Number -->
                <h3>${item.quality}   (Lot: ${item.lotNumber || 'N/A'})</h3>
                
                <!-- Line 2: Date and Unique Code -->
                <div class="datetime">
                    ${formattedDate}, ${formattedTime}   
                    <span class="unique-code">(Unique Code: ${item.code})</span>
                </div>
            </div>
        
        <div>
            <span class="card-badge badge-primary">${item.productType}</span>
            <span class="card-badge badge-secondary">${isSimpleColorFormat ? 'SIMPLE' : 'DETAILED'}</span>
            ${item.cupSize && item.cupSize !== 'N/A' ? `<span class="card-badge" style="background-color: #4cc9f0; color: white;">${item.cupSize} CUP</span>` : ''}
        </div>
    </div>
        
        <div class="card-content">
            ${cardContent}
            
            <div class="details-container">
                <div class="detail-box">
                    <h4><i class="fas fa-info-circle"></i> PRODUCT DETAILS</h4>
                    <div class="detail-item">
                        <span class="detail-label">MATERIAL:</span>
                        <span class="detail-value">${item.material} M</span>
                    </div>
                <div class="detail-item">
                    <span class="detail-label">CUP SIZE:</span>
                    <span class="detail-value">${item.cupSize || 'N/A'}</span>
                </div>
                    <div class="detail-item">
                        <span class="detail-label">WEIGHT:</span>
                        <span class="detail-value">${item.weight} KG</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">STATUS:</span>
                        <span class="detail-value">${item.inStock ? 'IN STOCK' : 'OUT OF STOCK'}</span>
                    </div>
                </div>
                
                <div class="detail-box">
                    <h4><i class="fas fa-sticky-note"></i> ADDITIONAL INFO</h4>
                    <div class="detail-item">
                        <span class="detail-label">LOT NUMBER:</span>
                        <span class="detail-value">${item.lotNumber || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">NOTES:</span>
                        <span class="detail-value">${item.notes || 'N/A'}</span>
                    </div>
                    
                        ${modifiedHtml} <!-- ✅ YAHAN ADD HOGAA -->
                    
                </div>
            </div>
        </div>
        
        <div class="card-footer">
            <div class="card-actions">
                <button class="action-btn btn-edit" onclick="openEditModal(${index})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn btn-delete" onclick="deleteItem(${index})">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="action-btn btn-stock ${!item.inStock ? 'stock-out' : ''}" onclick="toggleStock(${index})">
                    <i class="fas ${item.inStock ? 'fa-check' : 'fa-times'}"></i>
                </button>
            </div>
            
            <div class="total-price">
                <span class="total-label">TOTAL AMOUNT</span>
                <span class="total-amount">₹${totalAmount.toLocaleString()}</span>
            </div>
        </div>
    `;
    
    return card;
}

// Function to update stats
function updateStats() {
    // Count items by type
    const braItems = inventoryItems.filter(item => item.productType === 'BRA');
    const pantyItems = inventoryItems.filter(item => item.productType === 'PANTY');
    const setItems = inventoryItems.filter(item => item.productType === 'SET');
    const blauseItems = inventoryItems.filter(item => item.productType === 'blause');
    
    const totalBraElement = document.getElementById('totalBraItems');
    const totalPantyElement = document.getElementById('totalPantyItems');
    const totalSetElement = document.getElementById('totalSetItems');
    const totalBlauseElement = document.getElementById('totalBlauseItems');
    
    
    if (totalBraElement) totalBraElement.textContent = braItems.length;
    if (totalPantyElement) totalPantyElement.textContent = pantyItems.length;
    if (totalSetElement) totalSetElement.textContent = setItems.length;
    if (totalBlauseElement) totalBlauseElement.textContent = blauseItems.length;
    
    
    // Find most added quality for each type
    const braMostAddedElement = document.getElementById('braMostAdded');
    const pantyMostAddedElement = document.getElementById('pantyMostAdded');
    const setMostAddedElement = document.getElementById('setMostAdded');
    const blauseMostAddedElement = document.getElementById('blauseMostAdded');
    
    
    if (braMostAddedElement) braMostAddedElement.textContent = findMostAddedQuality(braItems);
    if (pantyMostAddedElement) pantyMostAddedElement.textContent = findMostAddedQuality(pantyItems);
    if (setMostAddedElement) setMostAddedElement.textContent = findMostAddedQuality(setItems);
    if (blauseMostAddedElement) blauseMostAddedElement.textContent = findMostAddedQuality(blauseItems);
    
    // Update quality stats for each type
    updateQualityStats('bra', braItems);
    updateQualityStats('panty', pantyItems);
    updateQualityStats('set', setItems);
    updateQualityStats('blause', blauseItems);
}

// Function to update global quality stats
function updateGlobalQualityStats() {
    const container = document.getElementById('globalQualityStats');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (inventoryItems.length === 0) {
        container.innerHTML = '<p>No items yet</p>';
        return;
    }
    
    // Count items by quality across all product types
    const qualityCount = {};
    inventoryItems.forEach(item => {
        qualityCount[item.quality] = (qualityCount[item.quality] || 0) + 1;
    });
    
    // Sort qualities by count (descending)
    const sortedQualities = Object.entries(qualityCount)
        .sort((a, b) => b[1] - a[1]);
    
    // Display top 3 qualities
    sortedQualities.slice(0, 3).forEach(([quality, count]) => {
        const qualityItem = document.createElement('div');
        qualityItem.className = 'quality-item';
        qualityItem.innerHTML = `
            <span>${quality}</span>
            <span>${count}</span>
        `;
        container.appendChild(qualityItem);
    });
}

// Function to find most added quality
function findMostAddedQuality(items) {
    if (items.length === 0) return '-';
    
    const qualityCount = {};
    items.forEach(item => {
        qualityCount[item.quality] = (qualityCount[item.quality] || 0) + 1;
    });
    
    let maxCount = 0;
    let mostAdded = '';
    
    for (const quality in qualityCount) {
        if (qualityCount[quality] > maxCount) {
            maxCount = qualityCount[quality];
            mostAdded = quality;
        }
    }
    
    return mostAdded;
}

// Function to update quality stats
function updateQualityStats(type, items) {
    const container = document.getElementById(`${type}QualityStats`);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (items.length === 0) {
        container.innerHTML = '<p>No items yet</p>';
        return;
    }
    
    // Count items by quality
    const qualityCount = {};
    items.forEach(item => {
        qualityCount[item.quality] = (qualityCount[item.quality] || 0) + 1;
    });
    
    // Sort qualities by count (descending)
    const sortedQualities = Object.entries(qualityCount)
        .sort((a, b) => b[1] - a[1]);
    
    // Display top 3 qualities
    sortedQualities.slice(0, 3).forEach(([quality, count]) => {
        const qualityItem = document.createElement('div');
        qualityItem.className = 'quality-item';
        qualityItem.innerHTML = `
            <span>${quality}</span>
            <span>${count}</span>
        `;
        container.appendChild(qualityItem);
    });
}

// Function to toggle stock status
function toggleStock(index) {
    inventoryItems[index].inStock = !inventoryItems[index].inStock;
    afterDataModification(); // Use centralized update function
    showNotification(`Item marked as ${inventoryItems[index].inStock ? 'In Stock' : 'Out of Stock'}`, 'success');
}

// Function to open edit modal - FIXED VERSION
function openEditModal(index) {
    const item = inventoryItems[index];
    const editModal = document.getElementById('editModal');
    
    if (!editModal) return;
    
    // Unique code display update karen
    const codeDisplay = document.getElementById('uniqueCodeDisplay');
    if (codeDisplay && item.code) {
        codeDisplay.textContent = `Unique Code: ${item.code} (Cannot be changed)`;
        codeDisplay.style.display = 'block';
    }
    
    // Remove any existing event listeners first
    const editSizeOptionRadios = document.querySelectorAll('input[name="editSizeOption"]');
    editSizeOptionRadios.forEach(radio => {
        radio.replaceWith(radio.cloneNode(true));
    });
    
    // ✅ NAYA CODE: Product type set karne ke baad quality options update karein
    document.getElementById('editProductType').value = item.productType.toLowerCase();
    updateEditQualityOptions(item.productType.toLowerCase());
    
    // ✅ NAYA CODE: Quality value set karein
    document.getElementById('editQuality').value = item.quality;
    // Populate form with item data
    document.getElementById('editIndex').value = index;
    document.getElementById('editProductType').value = item.productType.toLowerCase();
    // Cup size ko set karein edit modal mein
    document.getElementById('editCupSize').value = item.cupSize || '';
    document.getElementById('editLotNumber').value = item.lotNumber;
    document.getElementById('editQuality').value = item.quality;
    document.getElementById('editMaterial').value = item.material;
    document.getElementById('editWeight').value = item.weight;
    document.getElementById('editPrice').value = item.price;
    document.getElementById('editNotes').value = item.notes || '';
    
    // Size option based on item type
    if (item.sizeOption === 'same') {
        const sameSizesOption = document.querySelector('input[name="editSizeOption"][value="same"]');
        if (sameSizesOption) {
            sameSizesOption.checked = true;
        }
        
        // Set colors (for simple format)
        if (Array.isArray(item.colors) && item.colors.length > 0 && typeof item.colors[0] === 'string') {
            document.getElementById('editColors').value = item.colors.join(' ');
        }
        
        // Set size values
        const sizes = [28, 30, 32, 34, 36, 38, 40, 42, 44, 46];
        sizes.forEach(size => {
            const element = document.getElementById(`editSize${size}`);
            if (element) {
                element.value = item[`size${size}`] || 0;
            }
        });
        
        // Show same sizes container, hide different
        document.getElementById('editSameSizesContainer').style.display = 'block';
        document.getElementById('editDifferentSizesContainer').style.display = 'none';
        
    } else {
        const differentSizesOption = document.querySelector('input[name="editSizeOption"][value="different"]');
        if (differentSizesOption) {
            differentSizesOption.checked = true;
        }
        
        // Set colors input
        if (Array.isArray(item.colors) && item.colors.length > 0 && typeof item.colors[0] === 'object') {
            document.getElementById('editColors').value = item.colors.map(c => c.name).join(' ');
        }
        
        // Populate color-size items
        const editColorSizeItems = document.getElementById('editColorSizeItems');
        if (editColorSizeItems) {
            editColorSizeItems.innerHTML = '';
            
            if (Array.isArray(item.colors) && item.colors.length > 0) {
                item.colors.forEach((colorObj, colorIndex) => {
                    const colorSizeItem = document.createElement('div');
                    colorSizeItem.className = 'color-size-item';
                    colorSizeItem.innerHTML = `
                        <div class="color-size-header">
                            <h4>Color #${colorIndex + 1}</h4>
                            <button type="button" class="remove-color-btn" onclick="removeEditColorSizeItem(this)">Remove</button>
                        </div>
                        <div class="form-group">
                            <label>Color Name</label>
                            <input type="text" class="edit-color-name" value="${colorObj.name || ''}" placeholder="Enter color name">
                        </div>
                        <div class="size-grid">
                            ${[28, 30, 32, 34, 36, 38, 40, 42, 44, 46].map(size => `
                                <div class="size-input-group">
                                    <label>Size ${size}</label>
                                    <input type="number" class="edit-color-size-${size}" value="${colorObj.sizes[`size${size}`] || 0}" min="0" step="1" placeholder="Dozens">
                                </div>
                            `).join('')}
                        </div>
                    `;
                    editColorSizeItems.appendChild(colorSizeItem);
                });
            }
        }
        
        // Show different sizes container, hide same
        document.getElementById('editSameSizesContainer').style.display = 'none';
        document.getElementById('editDifferentSizesContainer').style.display = 'block';
    }
    
    // Add event listener for size option change
    const newEditSizeOptionRadios = document.querySelectorAll('input[name="editSizeOption"]');
    newEditSizeOptionRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'different' && item.sizeOption === 'same') {
                // Convert from same to different sizes
                convertSameToDifferentSizes(item);
            }
            toggleEditSizeOption();
        });
    });
    
    // Initialize the modal state
    toggleEditSizeOption();
    
    // Show modal
    editModal.style.display = 'flex';
}

// NEW FUNCTION: Convert same sizes format to different sizes format
function convertSameToDifferentSizes(item) {
    const editColorSizeItems = document.getElementById('editColorSizeItems');
    if (!editColorSizeItems) return;
    
    editColorSizeItems.innerHTML = '';
    
    if (Array.isArray(item.colors) && item.colors.length > 0) {
        item.colors.forEach((colorName, colorIndex) => {
            const colorSizeItem = document.createElement('div');
            colorSizeItem.className = 'color-size-item';
            
            // Create size inputs with values from the same sizes format
            let sizeInputsHTML = '';
            const sizes = [28, 30, 32, 34, 36, 38, 40, 42, 44, 46];
            
            sizes.forEach(size => {
                const sizeValue = item[`size${size}`] || 0;
                sizeInputsHTML += `
                    <div class="size-input-group">
                        <label>Size ${size}</label>
                        <input type="number" class="edit-color-size-${size}" value="${sizeValue}" min="0" step="1" placeholder="Dozens">
                    </div>
                `;
            });
            
            colorSizeItem.innerHTML = `
                <div class="color-size-header">
                    <h4>Color #${colorIndex + 1}</h4>
                    <button type="button" class="remove-color-btn" onclick="removeEditColorSizeItem(this)">Remove</button>
                </div>
                <div class="form-group">
                    <label>Color Name</label>
                    <input type="text" class="edit-color-name" value="${typeof colorName === 'string' ? colorName : colorName.name}" placeholder="Enter color name">
                </div>
                <div class="size-grid">
                    ${sizeInputsHTML}
                </div>
            `;
            
            editColorSizeItems.appendChild(colorSizeItem);
        });
    }
    
    // Show different sizes container, hide same
    document.getElementById('editSameSizesContainer').style.display = 'none';
    document.getElementById('editDifferentSizesContainer').style.display = 'block';
}

// Function to close edit modal
function closeEditModal() {
    const editModal = document.getElementById('editModal');
    if (editModal) {
        editModal.style.display = 'none';
    }
}

// Function to update item
function updateItem(e) {
    e.preventDefault();
    
    const index = document.getElementById('editIndex').value;
    const item = inventoryItems[index];
    
    
    
    // ✅ ORIGINAL DATE/TIME PRESERVE KAREN
    const originalDateTime = item.dateTime;
    
    
    // Get form values
    const productType = document.getElementById('editProductType').value;
    const cupSize = document.getElementById('editCupSize').value;
    const lotNumber = document.getElementById('editLotNumber').value;
    const quality = document.getElementById('editQuality').value;
    const material = parseFloat(document.getElementById('editMaterial').value) || 0;
    const weight = parseFloat(document.getElementById('editWeight').value) || 0;
    const price = parseFloat(document.getElementById('editPrice').value) || 0;
    const notes = document.getElementById('editNotes').value;
    
    // Validate required fields
    if (!productType) {
        showNotification('Product Type is required', 'error');
        return;
    }
    
    if (!quality) {
        showNotification('Quality Name is required', 'error');
        return;
    }
    
    // Get size option
    const sizeOption = document.querySelector('input[name="editSizeOption"]:checked');
    if (!sizeOption) {
        showNotification('Please select a size option', 'error');
        return;
    }
    
    let colors = [];
    let sizeData = {};
    let totalDozens = 0;
    
    if (sizeOption.value === 'same') {
        // Same sizes for all colors - EDIT MODAL
        const colorsInput = document.getElementById('editColors');
        if (!colorsInput) {
            showNotification('Colors input not found', 'error');
            return;
        }
        
        // ✅ UPDATED WITH AUTO-CLEAN VALIDATION - EDIT MODAL
        colors = colorsInput.value.split(' ')
            .map(color => cleanColorName(color)) // Auto-clean first
            .filter(color => color !== '')
            .filter(color => {
                if (!isValidColor(color)) {
                    showNotification(`Invalid color: "${color}". Only letters allowed.`, 'error');
                    return false;
                }
                return true;
            });
        
        // Get size values
        const sizes = [28, 30, 32, 34, 36, 38, 40, 42, 44, 46];
        
        sizes.forEach(size => {
            const element = document.getElementById(`editSize${size}`);
            if (element) {
                sizeData[`size${size}`] = parseInt(element.value) || 0;
                totalDozens += parseInt(element.value) || 0;
            }
        });
    } else {
        // Different sizes for each color - EDIT MODAL
        const editColorSizeItems = document.getElementById('editColorSizeItems');
        if (!editColorSizeItems) {
            showNotification('Color size items container not found', 'error');
            return;
        }
        
        const colorObjects = [];
        
        // Process each color size item - EDIT MODAL
        for (let i = 0; i < editColorSizeItems.children.length; i++) {
            const colorItem = editColorSizeItems.children[i];
            const colorNameInput = colorItem.querySelector('.edit-color-name');
            if (!colorNameInput) continue;
            
            const colorName = cleanColorName(colorNameInput.value.trim()); // ✅ AUTO-CLEAN
            
            // ✅ ADDED VALIDATION - EDIT MODAL
            if (colorName) {
                if (!isValidColor(colorName)) {
                    showNotification(`Invalid color: "${colorName}". Only letters allowed.`, 'error');
                    continue; // Skip invalid color
                }
                
                const colorSizes = {};
                let colorTotal = 0;
                
                // Get sizes for this color - EDIT MODAL
                [28, 30, 32, 34, 36, 38, 40, 42, 44, 46].forEach(size => {
                    const sizeInput = colorItem.querySelector(`.edit-color-size-${size}`);
                    if (sizeInput) {
                        const sizeValue = parseInt(sizeInput.value) || 0;
                        colorSizes[`size${size}`] = sizeValue;
                        colorTotal += sizeValue;
                    }
                });
                
                colorObjects.push({
                    name: colorName.toUpperCase(),
                    sizes: colorSizes
                });
                
                totalDozens += colorTotal;
            }
        }
        
        colors = colorObjects;
    }
    
    // Calculate totals
    const totalPieces = calculateTotalPieces(totalDozens);
    const totalAmount = calculateTotalAmount(totalDozens, price);
    
    // Update item properties
    item.productType = productType.toUpperCase();
item.cupSize = cupSize;
    item.lotNumber = lotNumber;
    item.quality = quality.toUpperCase();
    item.material = material;
    item.weight = weight;
    item.price = price;
    item.colors = colors;
    item.notes = notes;
    item.totalDozens = totalDozens;
    item.totalPieces = totalPieces;
    item.totalAmount = totalAmount;
    item.sizeOption = sizeOption.value;
    
    // Add size data for simple format
    if (sizeOption.value === 'same') {
        Object.assign(item, sizeData);
    } else {
        // Remove size data if switching from same to different
        const sizes = [28, 30, 32, 34, 36, 38, 40, 42, 44, 46];
        sizes.forEach(size => {
            delete item[`size${size}`];
        });
    }
    
    // ✅ YEH VALIDATION CODE ADD KAREN
// Validate before saving
if (!validateInventoryItem(item)) {
    showNotification('Invalid item data. Please check all fields.', 'error');
    return;
}
    
    // Update date/time
  //  item.dateTime = getCurrentDateTime();
  
  
  // ✅ DONO DATES SET KAREN
item.dateTime = originalDateTime; // Creation date change nahi hoga
item.lastModified = getCurrentDateTime(); // Modification date update hoga
    
    afterDataModification(); // Use centralized update function
    
    // Close modal
    closeEditModal();
    
    // Show success message
    showNotification('Product entry updated successfully!', 'success');
}

// Function to delete item
function deleteItem(index) {
    if (confirm('Are you sure you want to delete this item?')) {
        inventoryItems.splice(index, 1);
        afterDataModification(); // Use centralized update function
        showNotification('Item deleted successfully', 'success');
    }
}

// Replace existing searchItems function with this:
function searchItems() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.trim();
    
    // Clear previous timeout
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    // Show loading indicator
    const searchBtn = document.getElementById('searchBtn');
    const originalHtml = searchBtn.innerHTML;
    searchBtn.innerHTML = '<div class="loading-spinner"></div>';
    
    // Set new timeout with debounce
    searchTimeout = setTimeout(() => {
        let filteredItems;
        
        // Use indexes for faster search if term is long enough
        if (searchTerm.length >= 2) {
            filteredItems = searchWithIndexes(searchTerm);
        } else {
            // Fallback to regular filter for short terms
            filteredItems = inventoryItems.filter(item => 
                (item.quality && item.quality.toLowerCase().includes(searchTerm)) || 
                (item.lotNumber && item.lotNumber.toLowerCase().includes(searchTerm)) ||
                (item.notes && item.notes.toLowerCase().includes(searchTerm)) ||
                (item.cupSize && item.cupSize.toLowerCase().includes(searchTerm))
            );
        }
        
        // Display results
        renderItems(filteredItems);
        
        // Show result count
        showNotification(`Found ${filteredItems.length} items matching "${searchTerm}"`, 'info');
        
        // Restore search button
        searchBtn.innerHTML = originalHtml;
        
    }, SEARCH_DELAY);
}

// Update handleSearch function
function handleSearch(event) {
    if (event.key === 'Enter') {
        // Immediate search on Enter
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        performSearch();
    } else {
        // Debounced search on typing
        searchItems();
    }
}



// ✅ YE NAYA performSearch FUNCTION ADD KAREN
function performSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.trim();
    let filteredItems = [];
    
    // Show loading spinner temporarily
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        const originalHtml = searchBtn.innerHTML;
        searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
        
        // Reset after delay
        setTimeout(() => {
            searchBtn.innerHTML = originalHtml;
        }, 1000);
    }
    
    if (!searchTerm) {
        // Show all items if search is empty
        filteredItems = [...inventoryItems];
        showNotification('Showing all inventory items', 'info');
    } else {
        // Perform simple search without indexes
        filteredItems = inventoryItems.filter(item => {
            const searchTermLower = searchTerm.toLowerCase();
            return (
                item.quality && item.quality.toLowerCase().includes(searchTermLower) ||
                (item.lotNumber && item.lotNumber.toString().includes(searchTerm)) ||
                (item.notes && item.notes.toLowerCase().includes(searchTermLower)) ||
                (item.cupSize && item.cupSize.toLowerCase().includes(searchTermLower)) ||
                (item.code && item.code.includes(searchTerm)) ||
                // Colors search
                (item.colors && Array.isArray(item.colors) &&
                    item.colors.some(color =>
                        typeof color === 'string' ?
                        color.toLowerCase().includes(searchTermLower) :
                        (color.name && color.name.toLowerCase().includes(searchTermLower))
                    ))
            );
        });
        
        showNotification(`Found ${filteredItems.length} items matching "${searchTerm}"`, 'info');
    }
    
    // Display results based on which page we're on
    if (typeof renderInventoryCards === 'function') {
        renderInventoryCards(filteredItems);
    } else if (typeof renderItems === 'function') {
        renderItems(filteredItems);
    }
    
    // Update pagination if available
    if (typeof updatePaginationControls === 'function') {
        updatePaginationControls();
    }
    
    // Hide suggestions
    const suggestionsList = document.getElementById('suggestionsList');
    if (suggestionsList) {
        suggestionsList.style.display = 'none';
    }
    
    return false; // Prevent form submission
}





// Function to show all items
function showAllItems() {
    const searchInput = document.getElementById('searchInput');
    const showAllBtn = document.getElementById('showAllBtn');
    
    if (searchInput) searchInput.value = '';
    if (showAllBtn) showAllBtn.style.display = 'none';
    
    displayPaginatedItems();
}

// ================= PAGINATION FUNCTIONS =================
function updatePaginationControls() {
    const paginationControls = document.getElementById('paginationControls');
    const pageInfo = document.getElementById('pageInfo');
    
    if (!paginationControls || !pageInfo) return;
    
    totalPages = Math.ceil(inventoryItems.length / itemsPerPage);
    
    if (inventoryItems.length <= itemsPerPage) {
        paginationControls.style.display = 'none';
    } else {
        paginationControls.style.display = 'flex';
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    }
}

function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        displayPaginatedItems();
    }
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        displayPaginatedItems();
    }
}

function changeItemsPerPage(value) {
    itemsPerPage = parseInt(value);
    currentPage = 1;
    displayPaginatedItems();
}

function displayPaginatedItems() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = inventoryItems.slice(start, end);
    
    renderItems(pageItems);
    updatePaginationControls();
}

// ================= SEARCH INDEX FUNCTIONS =================
function buildSearchIndexes() {
    // Reset indexes
    searchIndex = {
        byQuality: {},
        byLotNumber: {}, 
        byNotes: {},
        byProductType: {}
    };
    
    // Build indexes
    inventoryItems.forEach((item, index) => {
        // Quality index
        if (!searchIndex.byQuality[item.quality]) {
            searchIndex.byQuality[item.quality] = [];
        }
        searchIndex.byQuality[item.quality].push(index);
        
        // Lot number index
        if (item.lotNumber) {
            if (!searchIndex.byLotNumber[item.lotNumber]) {
                searchIndex.byLotNumber[item.lotNumber] = [];
            }
            searchIndex.byLotNumber[item.lotNumber].push(index);
        }
        
        // Notes index (word-based)
        if (item.notes) {
            const words = item.notes.toLowerCase().split(/\s+/);
            words.forEach(word => {
                if (word.length > 2) { // Only index words longer than 2 chars
                    if (!searchIndex.byNotes[word]) {
                        searchIndex.byNotes[word] = [];
                    }
                    searchIndex.byNotes[word].push(index);
                }
            });
        }
        
        // Product type index
        if (!searchIndex.byProductType[item.productType]) {
            searchIndex.byProductType[item.productType] = [];
        }
        searchIndex.byProductType[item.productType].push(index);
    });
}

function searchWithIndexes(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return inventoryItems;
    
    const resultIndices = new Set();
    
    // Search in quality index
    Object.keys(searchIndex.byQuality).forEach(quality => {
        if (quality.toLowerCase().includes(term)) {
            searchIndex.byQuality[quality].forEach(idx => resultIndices.add(idx));
        }
    });
    
    // Search in lot number index
    Object.keys(searchIndex.byLotNumber).forEach(lotNumber => {
        if (lotNumber.toLowerCase().includes(term)) {
            searchIndex.byLotNumber[lotNumber].forEach(idx => resultIndices.add(idx));
        }
    });
    
    // Search in notes index
    Object.keys(searchIndex.byNotes).forEach(word => {
        if (word.includes(term)) {
            searchIndex.byNotes[word].forEach(idx => resultIndices.add(idx));
        }
    });
    
    // Search in product type index
    Object.keys(searchIndex.byProductType).forEach(productType => {
        if (productType.toLowerCase().includes(term)) {
            searchIndex.byProductType[productType].forEach(idx => resultIndices.add(idx));
        }
    });
    
    // Convert set to array of items
    return Array.from(resultIndices).map(idx => inventoryItems[idx]);
}

// After any data modification, rebuild indexes
function afterDataModification() {
    localStorage.setItem('inventoryItems', JSON.stringify(inventoryItems));
    buildSearchIndexes(); // Rebuild indexes
    displayPaginatedItems(); // Refresh display
    updateStats();
    updateGlobalQualityStats();
    updateActivityFeed();
    updateTotalInventory();
}

// ========================
// NEW DASHBOARD FUNCTIONS
// ========================

// Dashboard chart animation
function animateCharts() {
    const bars = document.querySelectorAll('.chart-bar');
    bars.forEach(bar => {
        const height = bar.style.height;
        bar.style.height = '0%';
        setTimeout(() => {
            bar.style.height = height;
        }, 300);
    });
}

// Quick actions functions
function scrollToForm() {
    const formSection = document.querySelector('.form-section');
    if (formSection) {
        formSection.scrollIntoView({ 
            behavior: 'smooth' 
        });
    }
}

// ✅ YEH NAYA FUNCTION ADD KARIEN - generateReport() ko replace karien
function generateReport() {
    console.log('Inventory items:', inventoryItems); // ✅ DEBUG LINE
    if (inventoryItems.length === 0) {
        showNotification('No inventory data to generate report!', 'warning');
        return;
    }

    try {
        // Prepare data for Excel report
        const reportData = inventoryItems.map(item => {
            // Handle colors format (simple ya detailed)
            let colorsFormatted = 'N/A';
            if (Array.isArray(item.colors) && item.colors.length > 0) {
                if (typeof item.colors[0] === 'string') {
                    colorsFormatted = item.colors.join(', ');
                } else {
                    colorsFormatted = item.colors.map(color => color.name).join(', ');
                }
            }

            // Handle sizes information
            let sizesInfo = '';
            if (item.sizeOption === 'same') {
                // Same sizes for all colors
                const sizes = [28, 30, 32, 34, 36, 38, 40, 42, 44, 46];
                sizes.forEach(size => {
                    const sizeValue = item[`size${size}`] || 0;
                    if (sizeValue > 0) {
                        sizesInfo += `Size ${size}: ${sizeValue} dozens, `;
                    }
                });
                sizesInfo = sizesInfo.replace(/, $/, '');
            } else {
                // Different sizes per color
                sizesInfo = 'Multiple sizes (see details)';
            }

            return {
                'Date Added': new Date(item.dateTime).toLocaleDateString(),
                'Time': new Date(item.dateTime).toLocaleTimeString(),
                'Product Type': item.productType,
                'Quality': item.quality,
                'Lot Number': item.lotNumber || 'N/A',
                'Colors': colorsFormatted,
                'Sizes': sizesInfo,
                'Quantity (Dozens)': item.totalDozens,
                'Total Pieces': item.totalPieces,
                'Price/Dozen': item.price,
                'Total Amount': '₹' + (item.totalDozens * item.price).toLocaleString(),
                'Material (m)': item.material || 0,
                'Weight (kg)': item.weight || 0,
                'Status': item.inStock ? 'In Stock' : 'Out of Stock',
                'Size Format': item.sizeOption === 'same' ? 'Same Sizes' : 'Different Sizes',
                'Notes': item.notes || 'N/A'
            };
        });

        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(reportData);
        
        // Set column widths
        const columnWidths = [
            { wch: 15 }, // Date Added
            { wch: 12 }, // Time
            { wch: 15 }, // Product Type
            { wch: 15 }, // Quality
            { wch: 12 }, // Lot Number
            { wch: 20 }, // Colors
            { wch: 25 }, // Sizes
            { wch: 18 }, // Quantity
            { wch: 15 }, // Pieces
            { wch: 15 }, // Price/Dozen
            { wch: 18 }, // Total Amount
            { wch: 15 }, // Material
            { wch: 15 }, // Weight
            { wch: 12 }, // Status
            { wch: 15 }, // Size Format
            { wch: 25 }  // Notes
        ];
        
        ws['!cols'] = columnWidths;

        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Inventory Report');

        // Generate filename with timestamp
        const now = new Date();
        const dateStr = `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;
        const timeStr = `${now.getHours()}-${now.getMinutes()}`;
        const fileName = `ALISHAN_Inventory_Report_${dateStr}_${timeStr}.xlsx`;

        // Download the file
        XLSX.writeFile(wb, fileName);
        
        showNotification('Excel report generated successfully! Check your downloads.', 'success');
        
    } catch (error) {
        console.error('Report generation error:', error);
        showNotification('Error generating report. Please try again.', 'error');
    }
}

function checkStock() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.focus();
    }
}

// Update activity feed
function updateActivityFeed() {
    const feed = document.getElementById('activityFeed');
    if (!feed) return;
    
    if (inventoryItems.length === 0) {
        feed.innerHTML = '<li>No recent activity</li>';
        return;
    }
    
    feed.innerHTML = '';
    const recentItems = inventoryItems.slice(0, 3);
    
    recentItems.forEach(item => {
        const activityItem = document.createElement('li');
        const date = new Date(item.dateTime).toLocaleDateString();
        activityItem.textContent = `Added ${item.quality} ${item.productType} on ${date}`;
        feed.appendChild(activityItem);
    });
}

// Update total inventory count
function updateTotalInventory() {
    const totalElement = document.getElementById('totalInventoryItems');
    if (totalElement) {
        totalElement.textContent = inventoryItems.length;
    }
}

// ========================
// FORM TABS FUNCTIONALITY
// ========================

// Tab functionality
function initFormTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    if (tabButtons.length === 0) return;
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab') + '-tab';
            const tabContent = document.getElementById(tabId);
            if (tabContent) {
                tabContent.classList.add('active');
            }
        });
    });
}

// ========================
// NOTIFICATION SYSTEM
// ========================

// Notification system
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                          type === 'error' ? 'fa-exclamation-circle' : 
                          type === 'warning' ? 'fa-exclamation-triangle' : 
                          'fa-info-circle'}"></i>
        </div>
        <div class="notification-content">${message}</div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}


// Product type change event handler
function setupProductTypeChangeListener() {
    const productTypeDropdown = document.getElementById('productType');
    if (productTypeDropdown) {
        productTypeDropdown.addEventListener('change', function() {
            updateQualityOptions(this.value);
        });
    }
}

// Edit modal ke liye bhi
function setupEditProductTypeChangeListener() {
    const editProductTypeDropdown = document.getElementById('editProductType');
    if (editProductTypeDropdown) {
        editProductTypeDropdown.addEventListener('change', function() {
            updateEditQualityOptions(this.value);
        });
    }
}

// Quality options update function
function updateQualityOptions(productType) {
    const qualityDropdown = document.getElementById('quality');
    if (!qualityDropdown || !window.qualityData) return;
    
    // Clear existing options (first option ko chodkar)
    while (qualityDropdown.options.length > 1) {
        qualityDropdown.remove(1);
    }
    
    // Get qualities for selected product type
    const qualities = window.qualityData[productType] || [];
    
    // Add new options
    qualities.forEach(quality => {
        const option = new Option(quality, quality);
        qualityDropdown.add(option);
    });
}

// Edit modal ke liye quality options update function
function updateEditQualityOptions(productType) {
    const editQualityDropdown = document.getElementById('editQuality');
    if (!editQualityDropdown || !window.qualityData) return;
    
    // Clear existing options (first option ko chodkar)
    while (editQualityDropdown.options.length > 1) {
        editQualityDropdown.remove(1);
    }
    
    // Get qualities for selected product type
    const qualities = window.qualityData[productType] || [];
    
    // Add new options
    qualities.forEach(quality => {
        const option = new Option(quality, quality);
        editQualityDropdown.add(option);
    });
}

// Load qualities function ko update karein
async function loadQualities() {
    try {
        const response = await fetch('qualities.json');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        window.qualityData = await response.json(); // Global variable mein store karein
        
        // Setup event listeners
        setupProductTypeChangeListener();
        setupEditProductTypeChangeListener();
        
    } catch (error) {
        console.error('Could not load qualities:', error);
        // Fallback data
        window.qualityData = {
            "bra": ["LAZO", "ORRY", "NAIRA", "EXOTIC", "PARFECTO", "ADDITION", "JAXXON", "CHARLIE", "KANISHKA", "FLORA", "EAZY", "NANCY"],
            "panty": ["LAZO", "ORRY", "NAIRA", "EXOTIC", "ADDITION", "FLORA", "EAZY"],
            "set": ["EXOTIC", "PARFECTO", "ADDITION", "JAXXON", "CHARLIE", "KANISHKA", "ROYAL"],
            "blause": ["EXOTIC", "PARFECTO", "ADDITION", "JAXXON", "CHARLIE", "KANISHKA", "ROYAL"]
        };
        
        // Setup event listeners
        setupProductTypeChangeListener();
        setupEditProductTypeChangeListener();
    }
}

// ========================
// INITIALIZATION FUNCTION
// ========================

    // Initialize all functional
async function initApp() {
    migrateOldData();
    // ✅ YEH CODE UPDATE KAREN
    // Load data with validation
    inventoryItems = loadInventoryData();
    
    // ✅ NAYA LINE: Qualities load karo
    await loadQualities(); 
    
    // Show message if items were filtered
    if (localStorage.getItem('inventory_backup')) {
        showNotification('Some invalid items were filtered out. Check console for details.', 'warning');
    }
    
    // Build search indexes after loading data
    buildSearchIndexes();
    
    // Initialize components
    initFormTabs();
    initMobileMenu();
    
    // Initialize size option toggles
    const sizeOptions = document.querySelectorAll('input[name="sizeOption"]');
    if (sizeOptions.length > 0) {
        sizeOptions.forEach(option => {
            option.addEventListener('change', toggleSizeOption);
        });
        // Set default to same sizes
        const sameSizesOption = document.querySelector('input[name="sizeOption"][value="same"]');
        if (sameSizesOption) {
            sameSizesOption.checked = true;
        }
        toggleSizeOption();
    }
    
    const editSizeOptions = document.querySelectorAll('input[name="editSizeOption"]');
    if (editSizeOptions.length > 0) {
        editSizeOptions.forEach(option => {
            option.addEventListener('change', toggleEditSizeOption);
        });
    }
    
    // ✅ YEH LINE ADD KAREN - Pagination controls ko update karein
    updatePaginationControls();
    
    // Update displays with pagination
    displayPaginatedItems(); // Use pagination instead of direct render
    updateStats();
    updateGlobalQualityStats();
    updateActivityFeed();
    updateTotalInventory();
    animateCharts();
    // Initialize enhanced search system
    initEnhancedSearch();
    buildSearchIndex();
    
    
    
    
    // Show inventory count
    showNotification(`Loaded ${inventoryItems.length} inventory items`, 'success');
    
    
    // Temporary testing ke liye - initApp function ke END mein add karein
// YEH CODE ADD KAREN initApp function ke last mein:
//console.log("Inventory items count:", inventoryItems.length);
//console.log("Items per page:", itemsPerPage);
//console.log("Total pages:", totalPages);

// Force show pagination for testing
//const paginationControls = document.getElementById('paginationControls');
//if (paginationControls) {
    //paginationControls.style.display = 'flex';
//    paginationControls.style.border = '2px solid red'; // Visible hone ke liye
//}
}
// ========================
// EVENT LISTENERS
// ========================

// Add event listener to form
const productForm = document.getElementById('productForm');
if (productForm) {
    productForm.addEventListener('submit', addInventoryItem);
}

// Add event listener to edit form
const editForm = document.getElementById('editForm');
if (editForm) {
    editForm.addEventListener('submit', updateItem);
}

// Add event listener to search button
const searchBtn = document.getElementById('searchBtn');
if (searchBtn) {
    searchBtn.addEventListener('click', searchItems);
}

// Add event listener to show all button
const showAllBtn = document.getElementById('showAllBtn');
if (showAllBtn) {
    showAllBtn.addEventListener('click', showAllItems);
}

// Add event listener to search input for Enter key
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchItems();
        }
    });
}

// Start the app when document is loaded
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

// Dynamic color class generation
function generateColorClass(colorName, bgColor, textColor, borderColor) {
    const style = document.createElement('style');
    style.textContent = `
        .color-${colorName.toLowerCase()} {
            background-color: ${bgColor};
            color: ${textColor};
            border: 1px solid ${borderColor};
        }
    `;
    document.head.appendChild(style);
}

// Predefine some common colors
const predefinedColors = {
    'brown': ['#efebe9', '#795548', '#795548'],
    'gray': ['#f5f5f5', '#9e9e9e', '#9e9e9e'],
    'teal': ['#e0f2f1', '#009688', '#009688'],
    'indigo': ['#e8eaf6', '#3f51b5', '#3f51b5'],
    'cyan': ['#e0f7fa', '#00bcd4', '#00bcd4'],
    'lime': ['#f9fbe7', '#cddc39', '#cddc39'],
    'maroon': ['#fce4ec', '#c2185b', '#c2185b'],
    'navy': ['#e3f2fd', '#1565c0', '#1565c0'],
    'olive': ['#f1f8e9', '#558b2f', '#558b2f'],
    'silver': ['#f5f5f5', '#757575', '#757575'],
    'coral': ['#ffebee', '#ff5252', '#ff5252']
};

// Generate classes for predefined colors
Object.entries(predefinedColors).forEach(([name, colors]) => {
    generateColorClass(name, colors[0], colors[1], colors[2]);
});

// ✅ YEH CODE OPTIONAL HAI, AGAR CLOUD SYNC CHAHIYE TO ADD KAREN
// Cloud sync with validation
async function syncWithCloud() {
    try {
        // Validate data before syncing
        const validItems = inventoryItems.filter(item => validateInventoryItem(item));
        const invalidItems = inventoryItems.filter(item => !validateInventoryItem(item));
        
        if (invalidItems.length > 0) {
            console.warn('Not syncing invalid items:', invalidItems);
            showNotification(`${invalidItems.length} invalid items not synced`, 'warning');
        }
        
        // Sync only valid items
        const response = await fetch('https://your-cloud-api.com/sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                items: validItems,
                timestamp: Date.now()
            })
        });
        
        if (!response.ok) {
            throw new Error('Sync failed');
        }
        
        showNotification('Data synced successfully', 'success');
        return true;
        
    } catch (error) {
        console.error('Sync error:', error);
        showNotification('Sync failed. Data saved locally.', 'error');
        return false;
    }
}

// Cloud sync button ke liye event listener (agar chahiye to)
const cloudSyncBtn = document.getElementById('cloudSyncBtn');
if (cloudSyncBtn) {
    cloudSyncBtn.addEventListener('click', syncWithCloud);
}

// ================= MOBILE MENU FUNCTIONS =================
// Mobile menu toggle functionality
function initMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const mobileNav = document.getElementById('mobileNav');
    
    if (menuToggle && mobileNav) {
        menuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            mobileNav.classList.toggle('active');
            
            // Update icon
            const icon = menuToggle.querySelector('i');
            if (mobileNav.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            if (mobileNav.classList.contains('active') && 
                !mobileNav.contains(event.target) && 
                !menuToggle.contains(event.target)) {
                closeMobileMenu();
            }
        });
        
        // Close menu when a link is clicked
        const navLinks = mobileNav.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                closeMobileMenu();
            });
        });
    }
}

// Close mobile menu function
function closeMobileMenu() {
    const mobileNav = document.getElementById('mobileNav');
    const menuToggle = document.getElementById('menuToggle');
    
    if (mobileNav) {
        mobileNav.classList.remove('active');
    }
    
    if (menuToggle) {
        const icon = menuToggle.querySelector('i');
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
    }
}
// ================= END MOBILE MENU FUNCTIONS =================



// ================= ENHANCED SEARCH SYSTEM =================
function initEnhancedSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const suggestionsList = document.createElement('ul');
    suggestionsList.id = 'suggestionsList';
    suggestionsList.className = 'suggestions-dropdown';
    
    // Add suggestions container to DOM
    const searchContainer = searchInput.closest('.search-bar-wrapper') || searchInput.parentNode;
    searchContainer.appendChild(suggestionsList);
    
    // Event listeners
    searchInput.addEventListener('focus', showSearchHistory);
    searchInput.addEventListener('input', debounce(handleSearchInput, 300));
    searchInput.addEventListener('keydown', handleKeyboardNavigation);
    document.addEventListener('click', closeSuggestionsOnClickOutside);
}

function buildSearchIndex() {
    searchIndex = {
        qualities: new Set(),
        lotNumbers: new Set(),
        colors: new Set(),
        allItems: []
    };

    inventoryItems.forEach(item => {
        searchIndex.qualities.add(item.quality);
        if (item.lotNumber) searchIndex.lotNumbers.add(item.lotNumber.toString());
        
        if (item.colors && Array.isArray(item.colors)) {
            item.colors.forEach(color => {
                if (typeof color === 'string') {
                    searchIndex.colors.add(color);
                } else if (color.name) {
                    searchIndex.colors.add(color.name);
                }
            });
        }
        searchIndex.allItems.push(item);
    });
}

function showSearchHistory() {
    const searchInput = document.getElementById('searchInput');
    const suggestionsList = document.getElementById('suggestionsList');
    if (!suggestionsList) return;
    
    if (searchInput.value.length > 0) return;
    
    suggestionsList.innerHTML = '';
    
    if (searchHistory.length === 0) {
        suggestionsList.innerHTML = '<li class="suggestion-item"><i class="fas fa-clock"></i> No search history</li>';
        suggestionsList.style.display = 'block';
        return;
    }
    
    // Add clear history button
    const clearLi = document.createElement('li');
    clearLi.className = 'suggestion-header';
    clearLi.innerHTML = '<span>Recent Searches</span><button onclick="clearSearchHistory()" class="clear-history-btn">Clear</button>';
    suggestionsList.appendChild(clearLi);
    
    // Show recent searches (max 7)
    searchHistory.slice(-7).reverse().forEach((query, index) => {
        const li = document.createElement('li');
        li.className = 'suggestion-item history-item';
        li.innerHTML = `<i class="fas fa-clock"></i> ${query}`;
        li.onclick = () => selectSuggestion(query);
        li.onmouseover = () => setSelectedSuggestion(index);
        suggestionsList.appendChild(li);
    });
    
    suggestionsList.style.display = 'block';
}

function handleSearchInput(e) {
    const query = e.target.value.toLowerCase().trim();
    const suggestionsList = document.getElementById('suggestionsList');
    if (!suggestionsList) return;
    
    suggestionsList.innerHTML = '';
    selectedSuggestionIndex = -1;
    
    if (query.length === 0) {
        showSearchHistory();
        return;
    }
    
    if (query.length < 2) {
        suggestionsList.style.display = 'none';
        return;
    }
    
    currentSuggestions = generateSuggestions(query);
    displaySuggestions(currentSuggestions, query);
}

function generateSuggestions(query) {
    const suggestions = [];
    const queryLower = query.toLowerCase();
    
    // Search qualities
    searchIndex.qualities.forEach(quality => {
        if (quality.toLowerCase().includes(queryLower)) {
            suggestions.push({
                text: quality,
                type: 'quality',
                category: 'Qualities'
            });
        }
    });
    
    // Search lot numbers
    searchIndex.lotNumbers.forEach(lotNumber => {
        if (lotNumber.includes(query)) {
            suggestions.push({
                text: `Lot: ${lotNumber}`,
                type: 'lot',
                category: 'Lot Numbers',
                original: lotNumber
            });
        }
    });
    
    // Search colors
    searchIndex.colors.forEach(color => {
        if (color.toLowerCase().includes(queryLower)) {
            suggestions.push({
                text: `Color: ${color}`,
                type: 'color',
                category: 'Colors',
                original: color
            });
        }
    });
    
    // Fuzzy search for qualities
    if (suggestions.length < 5) {
        searchIndex.qualities.forEach(quality => {
            if (fuzzyMatch(quality, queryLower) && !suggestions.some(s => s.text === quality)) {
                suggestions.push({
                    text: quality,
                    type: 'quality',
                    category: 'Qualities',
                    fuzzy: true
                });
            }
        });
    }
    
    // Weight results
    suggestions.sort((a, b) => {
        const weightA = a.type === 'quality' ? 3 : a.type === 'lot' ? 2 : 1;
        const weightB = b.type === 'quality' ? 3 : b.type === 'lot' ? 2 : 1;
        return weightB - weightA;
    });
    
    return suggestions.slice(0, 10);
}

function displaySuggestions(suggestions, query) {
    const suggestionsList = document.getElementById('suggestionsList');
    if (!suggestionsList) return;
    
    if (suggestions.length === 0) {
        suggestionsList.innerHTML = '<li class="suggestion-item"><i class="fas fa-search"></i> No matches found</li>';
        suggestionsList.style.display = 'block';
        return;
    }
    
    let currentCategory = '';
    
    suggestions.forEach((suggestion, index) => {
        if (suggestion.category !== currentCategory) {
            currentCategory = suggestion.category;
            const categoryLi = document.createElement('li');
            categoryLi.className = 'suggestion-category';
            categoryLi.textContent = currentCategory;
            suggestionsList.appendChild(categoryLi);
        }
        
        const li = document.createElement('li');
        li.className = `suggestion-item ${suggestion.fuzzy ? 'fuzzy-match' : ''}`;
        const highlightedText = highlightMatch(suggestion.text, query);
        
        li.innerHTML = `
            <i class="fas ${suggestion.type === 'quality' ? 'fa-tag' : 
                          suggestion.type === 'lot' ? 'fa-hashtag' : 'fa-palette'}"></i>
            ${highlightedText}
        `;
        
        li.onclick = () => selectSuggestion(suggestion.original || suggestion.text, suggestion.type);
        li.onmouseover = () => setSelectedSuggestion(index);
        suggestionsList.appendChild(li);
    });
    
    suggestionsList.style.display = 'block';
    currentSuggestions = suggestions;
}

function handleKeyboardNavigation(e) {
    const suggestionsList = document.getElementById('suggestionsList');
    if (!suggestionsList || suggestionsList.style.display !== 'block') return;
    
    switch(e.key) {
        case 'ArrowDown':
            e.preventDefault();
            setSelectedSuggestion(selectedSuggestionIndex + 1);
            break;
        case 'ArrowUp':
            e.preventDefault();
            setSelectedSuggestion(selectedSuggestionIndex - 1);
            break;
        case 'Enter':
            e.preventDefault();
            if (selectedSuggestionIndex >= 0) {
                const selected = currentSuggestions[selectedSuggestionIndex];
                selectSuggestion(selected.original || selected.text, selected.type);
            } else {
                performSearch();
            }
            break;
        case 'Escape':
            suggestionsList.style.display = 'none';
            selectedSuggestionIndex = -1;
            break;
    }
}

function setSelectedSuggestion(index) {
    const items = document.querySelectorAll('#suggestionsList .suggestion-item');
    items.forEach(item => item.classList.remove('selected'));
    
    if (index < 0) index = items.length - 1;
    if (index >= items.length) index = 0;
    
    if (items[index]) {
        items[index].classList.add('selected');
        items[index].scrollIntoView({ block: 'nearest' });
        selectedSuggestionIndex = index;
    }
}

function selectSuggestion(query, type) {
    const searchInput = document.getElementById('searchInput');
    searchInput.value = query;
    addToSearchHistory(query);
    trackSearchAnalytics(query, type);
    
    const suggestionsList = document.getElementById('suggestionsList');
    if (suggestionsList) suggestionsList.style.display = 'none';
    
    selectedSuggestionIndex = -1;
    performSearch();
}

function addToSearchHistory(query) {
    searchHistory = searchHistory.filter(item => item !== query);
    searchHistory.push(query);
    if (searchHistory.length > 10) searchHistory = searchHistory.slice(-10);
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
}

function trackSearchAnalytics(query, type) {
    const now = new Date().toISOString();
    if (!searchAnalytics[query]) {
        searchAnalytics[query] = { count: 0, firstSearched: now, lastSearched: now, type: type };
    }
    searchAnalytics[query].count++;
    searchAnalytics[query].lastSearched = now;
    localStorage.setItem('searchAnalytics', JSON.stringify(searchAnalytics));
}

function clearSearchHistory() {
    searchHistory = [];
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
    showSearchHistory();
}

function closeSuggestionsOnClickOutside(e) {
    const suggestionsList = document.getElementById('suggestionsList');
    const searchInput = document.getElementById('searchInput');
    if (!suggestionsList || !searchInput) return;
    if (!suggestionsList.contains(e.target) && e.target !== searchInput) {
        suggestionsList.style.display = 'none';
        selectedSuggestionIndex = -1;
    }
}

function fuzzyMatch(text, query) {
    let searchIndex = 0;
    text = text.toLowerCase();
    for (let i = 0; i < text.length; i++) {
        if (text[i] === query[searchIndex]) searchIndex++;
        if (searchIndex === query.length) return true;
    }
    return false;
}

function highlightMatch(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<span class="match-highlight">$1</span>');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showSearchAnalytics() {
    const sortedAnalytics = Object.entries(searchAnalytics)
        .sort((a, b) => b[1].count - a[1].count);
    
    let analyticsHTML = `
        <h3><i class="fas fa-chart-line"></i> Top Search Terms</h3>
        <div class="analytics-list">
    `;
    
    sortedAnalytics.forEach(([query, data], index) => {
        if (index < 10) { // Show top 10 only
            analyticsHTML += `
                <div class="analytics-item">
                    <div class="analytics-rank">${index + 1}</div>
                    <div class="analytics-query">${query}</div>
                    <div class="analytics-count">${data.count} searches</div>
                    <div class="analytics-type">${data.type}</div>
                </div>
            `;
        }
    });
    
    analyticsHTML += `</div>`;
    
    const analyticsContainer = document.getElementById('analyticsContainer');
    if (analyticsContainer) {
        analyticsContainer.innerHTML = analyticsHTML;
    }
    
    // Show modal
    const analyticsModal = document.getElementById('analyticsModal');
    if (analyticsModal) {
        analyticsModal.style.display = 'flex';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Make sure to call buildSearchIndex when inventory updates
function afterDataModification() {
    localStorage.setItem('inventoryItems', JSON.stringify(inventoryItems));
    buildSearchIndex(); // Rebuild search index
    displayPaginatedItems();
    updateStats();
    updateGlobalQualityStats();
    updateActivityFeed();
    updateTotalInventory();
}





// ================= MOBILE PERFORMANCE OPTIMIZATION ================= 
function optimizeForMobile() {
    if (window.innerWidth <= 768) {
        // Reduce animations on mobile
        document.documentElement.style.setProperty('--transition', 'all 0.2s ease');
        
        // Debounce scroll events for better performance
        let scrollTimeout;
        window.addEventListener('scroll', function() {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(function() {
                // Hide non-essential elements during scroll
                document.querySelectorAll('.card-content').forEach(el => {
                    el.style.opacity = '0.95';
                });
            }, 100);
        });
        
        // Restore opacity after scroll
        window.addEventListener('scrollend', function() {
            document.querySelectorAll('.card-content').forEach(el => {
                el.style.opacity = '1';
            });
        });
    }
}

// Initialize on load and resize
document.addEventListener('DOMContentLoaded', function() {
    optimizeForMobile();
    window.addEventListener('resize', optimizeForMobile);
});

// Mobile-friendly hover effects
function setupMobileHover() {
    if ('ontouchstart' in window) {
        // Replace hover effects with touch effects
        document.querySelectorAll('.inventory-card').forEach(card => {
            card.addEventListener('touchstart', function() {
                this.style.transform = 'scale(0.98)';
            });
            
            card.addEventListener('touchend', function() {
                this.style.transform = 'scale(0.95)';
            });
        });
    }
}
