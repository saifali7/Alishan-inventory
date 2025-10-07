


// Data storage
let inventoryItems = [];
let filteredItems = [];
let currentPage = 1;
let itemsPerPage = 50;
let totalPages = 1;

// Initialize the page
async function initPage() {
    loadInventoryData();
    updateDashboard();
    populateQualityFilter();
    updatePaginationControls();
    renderInventoryCards();
    await loadQualities();
        // Initialize Google Cloud services
    await initializeGoogleCloud();
    
    
    
    
        // ✅ YE NAYA CODE ADD KAREN - Backend se initialize karein
    try {
        await googleCloudManager.initializeGoogleApis();
        console.log("✅ Google Cloud initialized with backend config");
    } catch (error) {
        console.error("❌ Google Cloud initialization failed:", error);
        showNotification('Google Drive integration unavailable', 'warning');
    }
    
    
    
    
    
    // Set up event listeners
    document.getElementById('editForm').addEventListener('submit', function(e) {
        e.preventDefault();
        updateItem(e);
    });
    
    // Initialize backup system
    initializeBackupSystem();
    
    console.log("Inventory page initialized with", inventoryItems.length, "items");
}

// Load inventory data from localStorage
function loadInventoryData() {
    try {
        const inventoryData = localStorage.getItem('inventoryItems');
        inventoryItems = inventoryData ? JSON.parse(inventoryData) : [];
        filteredItems = [...inventoryItems];
    } catch (error) {
        console.error('Error loading inventory data:', error);
        showNotification('Error loading inventory data. Please check console for details.', 'error');
    }
}

// Update dashboard with summary stats
function updateDashboard() {
    // Count total items
    const totalItems = inventoryItems.length;
    
    // Calculate total inventory value
    const totalValue = inventoryItems.reduce((total, item) => {
        return total + (item.totalDozens * item.price);
    }, 0);
    
    // Count in-stock items
    const inStockItems = inventoryItems.filter(item => item.inStock).length;
    
    // Count aging items (more than 8 days in stock)
    const now = new Date();
    const agingItems = inventoryItems.filter(item => {
        const addedDate = new Date(item.dateTime);
        const daysInStock = Math.floor((now - addedDate) / (1000 * 60 * 60 * 24));
        return daysInStock > 8;
    }).length;
    
    // Update dashboard cards
    document.getElementById('totalItems').textContent = totalItems;
    document.getElementById('totalValue').textContent = '₹' + totalValue.toLocaleString();
    document.getElementById('inStockItems').textContent = inStockItems;
    document.getElementById('agingItems').textContent = agingItems;
}

// Populate quality filter dropdown
function populateQualityFilter() {
    const qualityFilter = document.getElementById('qualityFilter');
    
    // Get unique qualities
    const qualities = [...new Set(inventoryItems.map(item => item.quality))];
    
    // Clear existing options except the first one
    while (qualityFilter.options.length > 1) {
        qualityFilter.remove(1);
    }
    
    // Add quality options
    qualities.forEach(quality => {
        const option = document.createElement('option');
        option.value = quality;
        option.textContent = quality;
        qualityFilter.appendChild(option);
    });
}

// Apply filters to inventory data
function applyFilters() {
    const productTypeFilter = document.getElementById('productTypeFilter').value;
    const qualityFilter = document.getElementById('qualityFilter').value;
    const stockFilter = document.getElementById('stockFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    
    filteredItems = inventoryItems.filter(item => {
        // Product type filter
        if (productTypeFilter !== 'all' && item.productType.toLowerCase() !== productTypeFilter) {
            return false;
        }
        
        // Quality filter
        if (qualityFilter !== 'all' && item.quality !== qualityFilter) {
            return false;
        }
        
        // Stock status filter
        if (stockFilter !== 'all') {
            if (stockFilter === 'inStock' && !item.inStock) return false;
            if (stockFilter === 'outOfStock' && item.inStock) return false;
        }
        
        // Date filter
        if (dateFilter !== 'all') {
            const itemDate = new Date(item.dateTime);
            const today = new Date();
            
            if (dateFilter === 'today') {
                if (itemDate.toDateString() !== today.toDateString()) return false;
            } else if (dateFilter === 'week') {
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(today.getDate() - 7);
                if (itemDate < oneWeekAgo) return false;
            } else if (dateFilter === 'month') {
                const oneMonthAgo = new Date();
                oneMonthAgo.setMonth(today.getMonth() - 1);
                if (itemDate < oneMonthAgo) return false;
            }
        }
        
        return true;
    });
    
    currentPage = 1;
    renderInventoryCards();
    showNotification('Filters applied successfully.', 'success');
}

// Clear all filters
function clearFilters() {
    document.getElementById('productTypeFilter').value = 'all';
    document.getElementById('qualityFilter').value = 'all';
    document.getElementById('stockFilter').value = 'all';
    document.getElementById('dateFilter').value = 'all';
    
    filteredItems = [...inventoryItems];
    renderInventoryCards();
    showNotification('Filters cleared successfully.', 'success');
}

// Handle search input
function handleSearch(event) {
    if (event.key === 'Enter') {
        performSearch();
    }
}

// Perform search
function performSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (!searchTerm) {
        filteredItems = [...inventoryItems];
    } else {
        filteredItems = inventoryItems.filter(item => {
            return (
                item.quality.toLowerCase().includes(searchTerm) ||
                (item.lotNumber && item.lotNumber.toLowerCase().includes(searchTerm)) ||
                (item.notes && item.notes.toLowerCase().includes(searchTerm))
            );
        });
    }
    
    currentPage = 1;
    renderInventoryCards();
    showNotification(`Found ${filteredItems.length} items matching your search.`, 'info');
}

// Render inventory cards
function renderInventoryCards() {
    const inventoryCards = document.getElementById('inventoryCards');
    inventoryCards.innerHTML = '';
    
    if (filteredItems.length === 0) {
        inventoryCards.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-clipboard-list"></i>
                </div>
                <h3>No inventory items found</h3>
                <p>Try changing your filters or search criteria</p>
            </div>
        `;
        updatePaginationControls();
        return;
    }
    
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = filteredItems.slice(start, end);
    
    const fragment = document.createDocumentFragment();
    
    // Sort by date (newest first)
    const sortedItems = [...pageItems].sort((a, b) =>
        new Date(b.dateTime) - new Date(a.dateTime)
    );
    
    sortedItems.forEach((item) => {
        const originalIndex = inventoryItems.findIndex(i => i.id === item.id);
        const card = createInventoryCard(item, originalIndex);
        fragment.appendChild(card);
    });
    
    inventoryCards.innerHTML = '';
    inventoryCards.appendChild(fragment);
    
    updatePaginationControls();
}

// Function to create inventory card
function createInventoryCard(item, index) {
    const card = document.createElement('div');
    card.className = 'inventory-card';
    
    // Format date
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
                <h3>${item.quality} (Lot: ${item.lotNumber || 'N/A'})</h3>
                <div class="datetime">
                    ${formattedDate}, ${formattedTime}
                    ${item.code ? `<span class="unique-code">(Unique Code: ${item.code})</span>` : ''}
                </div>
            </div>
            <div>
                <span class="card-badge badge-primary">${item.productType}</span>
                ${item.cupSize && item.cupSize !== 'N/A' ?
                `<span class="card-badge" style="background-color: #4cc9f0; color: white;">${item.cupSize} CUP</span>` : ''}
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

// Function to open edit modal
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

    // Populate form with item data
    document.getElementById('editIndex').value = index;
    document.getElementById('editProductType').value = item.productType.toLowerCase();
    updateEditQualityOptions(item.productType.toLowerCase());
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

// Convert same sizes format to different sizes format
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

// Function to toggle edit size option
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
        
        // Process colors
        colors = colorsInput.value.split(' ')
            .map(color => color.trim())
            .filter(color => color !== '');
        
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
            
            const colorName = colorNameInput.value.trim();
            
            if (colorName) {
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
    const totalPieces = totalDozens * 12;
    const totalAmount = totalDozens * price;
    
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
    
    // Update date/time
    item.dateTime = new Date().toISOString();
    
    // Save to localStorage
    localStorage.setItem('inventoryItems', JSON.stringify(inventoryItems));
    
    // Update display
    renderInventoryCards();
    updateDashboard();
    
    // Close modal
    closeEditModal();
    
    // Show success message
    showNotification('Product entry updated successfully!', 'success');
}

// Function to delete item
function deleteItem(index) {
    if (confirm('Are you sure you want to delete this item?')) {
        inventoryItems.splice(index, 1);
        localStorage.setItem('inventoryItems', JSON.stringify(inventoryItems));
        loadInventoryData();
        applyFilters();
        
        showNotification('Item deleted successfully', 'success');
    }
}

// Function to toggle stock status
function toggleStock(index) {
    inventoryItems[index].inStock = !inventoryItems[index].inStock;
    localStorage.setItem('inventoryItems', JSON.stringify(inventoryItems));
    renderInventoryCards();
    updateDashboard();
    
    showNotification(`Item marked as ${inventoryItems[index].inStock ? 'In Stock' : 'Out of Stock'}`, 'success');
}

// Show export modal
function showExportModal() {
    document.getElementById('exportModal').style.display = 'flex';
}

// Close export modal
function closeExportModal() {
    document.getElementById('exportModal').style.display = 'none';
}

// Export inventory data
function exportInventory(format) {
    const exportAll = document.getElementById('exportAll').checked;
    const dataToExport = exportAll ? inventoryItems : filteredItems;
    
    if (dataToExport.length === 0) {
        showNotification('No data to export!', 'warning');
        return;
    }
    
    // Prepare data for export
    const exportData = dataToExport.map(item => {
        const colors = Array.isArray(item.colors) ? 
            (typeof item.colors[0] === 'string' ? 
                item.colors.join(', ') : 
                item.colors.map(c => c.name).join(', ')) : 
            'N/A';
        
        return {
            'Date Added': new Date(item.dateTime).toLocaleDateString(),
            'Time': new Date(item.dateTime).toLocaleTimeString(),
            'Product Type': item.productType,
            'Quality': item.quality,
            'Lot Number': item.lotNumber || 'N/A',
            'Colors': colors,
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
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    
    // Generate file name
    const date = new Date();
    const dateStr = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
    const timeStr = `${date.getHours()}-${date.getMinutes()}`;
    const fileName = `ALISHAN_Inventory_${dateStr}_${timeStr}.${format}`;
    
    // Export the file
    try {
        if (format === 'csv') {
            const csv = XLSX.utils.sheet_to_csv(ws);
            downloadFile(csv, fileName, 'text/csv');
        } else {
            XLSX.writeFile(wb, fileName);
        }
        
        showNotification('Inventory data exported successfully!', 'success');
        closeExportModal();
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Error exporting data. Please try again.', 'error');
    }
}

// Download file helper function
function downloadFile(data, fileName, type) {
    try {
        const blob = new Blob([data], { type: type });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
    } catch (error) {
        console.error('Download error:', error);
        showNotification('Error downloading file. Please try again.', 'error');
    }
}

// Show notification function
function showNotification(message, type = 'info', duration = 5000) {
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
    
    // Auto remove after duration
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, duration);
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

// ================= PAGINATION FUNCTIONS =================
function updatePaginationControls() {
    const paginationControls = document.getElementById('paginationControls');
    const pageInfo = document.getElementById('pageInfo');
    
    if (!paginationControls || !pageInfo) {
        console.log("Pagination elements not found in inventory.html");
        return;
    }
    
    totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    
    if (filteredItems.length <= itemsPerPage) {
        paginationControls.style.display = 'none';
    } else {
        paginationControls.style.display = 'flex';
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    }
}

function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        renderInventoryCards();
        updatePaginationControls();
    }
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderInventoryCards();
        updatePaginationControls();
    }
}

function changeItemsPerPage(value) {
    itemsPerPage = parseInt(value);
    currentPage = 1;
    renderInventoryCards();
    updatePaginationControls();
}

// ================= BACKUP SYSTEM FUNCTIONS =================
function initializeBackupSystem() {
    // Check if auto backup is enabled
    const autoBackupEnabled = localStorage.getItem('autoBackupEnabled') !== 'false';
    
    if (autoBackupEnabled) {
        const frequency = parseInt(localStorage.getItem('backupFrequency') || '24');
        if (frequency > 0) {
            setInterval(createAutoBackup, frequency * 60 * 60 * 1000);
        }
    }
    
    // Create initial backup if none exists
    const lastBackup = localStorage.getItem('lastBackupDate');
    if (!lastBackup) {
        createAutoBackup();
    }
}

function createAutoBackup() {
    const inventoryData = localStorage.getItem('inventoryItems');
    if (!inventoryData) return;
    
    const backupData = {
        metadata: {
            type: "AUTO_BACKUP",
            created: new Date().toISOString(),
            totalItems: JSON.parse(inventoryData).length,
            version: "1.0"
        },
        inventory: JSON.parse(inventoryData)
    };
    
    // Save backup to localStorage for quick restore
    localStorage.setItem('lastBackup', JSON.stringify(backupData));
    localStorage.setItem('lastBackupDate', new Date().toISOString());
    
    showNotification('Auto backup created successfully', 'success');
}

function exportCompleteBackup() {
    const inventoryData = localStorage.getItem('inventoryItems');
    if (!inventoryData) {
        showNotification('No data to backup!', 'warning');
        return;
    }
    
    const backupData = {
        metadata: {
            type: "COMPLETE_BACKUP",
            exportedAt: new Date().toISOString(),
            totalItems: JSON.parse(inventoryData).length,
            system: "ALISHAN_INVENTORY"
        },
        inventory: JSON.parse(inventoryData)
    };
    
    const fileName = `ALISHAN_Complete_Backup_${new Date().getTime()}.json`;
    downloadFile(JSON.stringify(backupData, null, 2), fileName, 'application/json');
    showNotification('Complete backup exported successfully!', 'success');
    closeExportModal();
}

function showImportModal() {
    document.getElementById('importModal').style.display = 'flex';
}

function closeImportModal() {
    document.getElementById('importModal').style.display = 'none';
}

function handleImport() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showNotification('Please select a file to import', 'error');
        return;
    }
    
    const importOption = document.querySelector('input[name="importOption"]:checked').value;
    importBackupData(file, importOption);
}

function importBackupData(file, importOption) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const backupData = JSON.parse(e.target.result);
            
            // Validate backup file
            if (!backupData.inventory || !Array.isArray(backupData.inventory)) {
                throw new Error('Invalid backup file format');
            }
            
            let newInventory = [];
            
            if (importOption === 'replace') {
                // Replace all current data
                newInventory = backupData.inventory;
            } else {
                // Merge with existing data
                const currentData = JSON.parse(localStorage.getItem('inventoryItems') || '[]');
                const currentIds = new Set(currentData.map(item => item.id));
                
                // Add only new items from backup
                const newItems = backupData.inventory.filter(item => !currentIds.has(item.id));
                newInventory = [...currentData, ...newItems];
            }
            
            // Save to localStorage
            localStorage.setItem('inventoryItems', JSON.stringify(newInventory));
            
            // Update display
            loadInventoryData();
            renderInventoryCards();
            updateDashboard();
            
            showNotification(`Successfully imported ${backupData.inventory.length} items!`, 'success');
            closeImportModal();
            
        } catch (error) {
            console.error('Import error:', error);
            showNotification('Error importing file. Please check file format.', 'error');
        }
    };
    
    reader.readAsText(file);
}

function showBackupSettingsModal() {
    document.getElementById('backupSettingsModal').style.display = 'flex';
}

function closeBackupSettingsModal() {
    document.getElementById('backupSettingsModal').style.display = 'none';
}

function createBackupNow() {
    exportCompleteBackup();
    closeBackupSettingsModal();
}

// ================= ADVANCED EXPORT SYSTEM - NEW ADDED =================

// Show advanced export modal
function showAdvancedExportModal() {
    document.getElementById('advancedExportModal').style.display = 'flex';
    populateExportQualities();
    populateCustomQualities();
    updateExportSummary();
    closeExportModal(); // Close basic export modal
}

// Close advanced export modal
function closeAdvancedExportModal() {
    document.getElementById('advancedExportModal').style.display = 'none';
}

// Toggle export options based on selection
function toggleExportOptions() {
    const exportType = document.getElementById('exportType').value;
    
    // Sab options hide karo
    const allOptions = document.querySelectorAll('.export-sub-options');
    allOptions.forEach(option => option.style.display = 'none');
    
    // Selected option show karo
    const selectedOption = document.getElementById(exportType + 'Options');
    if (selectedOption) {
        selectedOption.style.display = 'block';
    }
    
    updateExportSummary();
}

// Populate quality dropdowns
function populateExportQualities() {
    const qualitySelect = document.getElementById('exportQuality');
    const qualities = [...new Set(inventoryItems.map(item => item.quality))].sort();
    
    qualitySelect.innerHTML = '<option value="">All Qualities</option>';
    qualities.forEach(quality => {
        const option = document.createElement('option');
        option.value = quality;
        option.textContent = quality;
        qualitySelect.appendChild(option);
    });
}

function populateCustomQualities() {
    const customQualitySelect = document.getElementById('customQuality');
    const qualities = [...new Set(inventoryItems.map(item => item.quality))].sort();
    
    customQualitySelect.innerHTML = '<option value="">All Qualities</option>';
    qualities.forEach(quality => {
        const option = document.createElement('option');
        option.value = quality;
        option.textContent = quality;
        customQualitySelect.appendChild(option);
    });
}

// Update export summary preview
async function updateExportSummary() {
    const exportType = document.getElementById('exportType').value;
    const summaryElement = document.getElementById('summaryText');
    const detailsElement = document.getElementById('summaryDetails');
    const summaryContainer = document.getElementById('exportSummary');
    
    let filteredData = [];
    let summaryText = '';
    let detailsHTML = '';
    
    switch(exportType) {
        case 'complete':
            filteredData = inventoryItems;
            summaryText = `📦 Complete Inventory Data`;
            detailsHTML = `Total Items: <strong>${filteredData.length}</strong><br>All records will be exported`;
            break;
            
        case 'dateRange':
            filteredData = await filterByDateRange();
            const fromDate = document.getElementById('exportFromDate').value;
            const toDate = document.getElementById('exportToDate').value;
            summaryText = `📅 Date Range Export`;
            detailsHTML = `From: <strong>${fromDate || 'Not set'}</strong><br>To: <strong>${toDate || 'Not set'}</strong><br>Matching Items: <strong>${filteredData.length}</strong>`;
            break;
            
        case 'quality':
            filteredData = await filterByQuality();
            const quality = document.getElementById('exportQuality').value;
            summaryText = `🎯 Quality Based Export`;
            detailsHTML = `Quality: <strong>${quality || 'All'}</strong><br>Matching Items: <strong>${filteredData.length}</strong>`;
            break;
            
        case 'productType':
            filteredData = await filterByProductType();
            const productType = document.getElementById('exportProductType').value;
            summaryText = `👕 Product Type Export`;
            detailsHTML = `Product Type: <strong>${productType || 'All'}</strong><br>Matching Items: <strong>${filteredData.length}</strong>`;
            break;
            
        case 'lotNumber':
            filteredData = await filterByLotNumber();
            const lotNumber = document.getElementById('exportLotNumber').value;
            summaryText = `🏷️ Lot Number Export`;
            detailsHTML = `Lot Number: <strong>${lotNumber || 'Not specified'}</strong><br>Matching Items: <strong>${filteredData.length}</strong>`;
            break;
            
        case 'uniqueCode':
            filteredData = await filterByUniqueCode();
            const uniqueCode = document.getElementById('exportUniqueCode').value;
            summaryText = `🔖 Unique Code Export`;
            detailsHTML = `Unique Code: <strong>${uniqueCode || 'Not specified'}</strong><br>Matching Items: <strong>${filteredData.length}</strong>`;
            break;
            
        case 'customFilter':
            filteredData = await filterByCustom();
            summaryText = `🔧 Custom Filter Export`;
            detailsHTML = `Multiple criteria applied<br>Matching Items: <strong>${filteredData.length}</strong>`;
            break;
    }
    
    summaryElement.innerHTML = summaryText;
    detailsElement.innerHTML = detailsHTML;
    summaryContainer.style.display = 'block';
}

// ================= FILTER FUNCTIONS FOR EXPORT =================

async function filterByDateRange() {
    const fromDate = document.getElementById('exportFromDate').value;
    const toDate = document.getElementById('exportToDate').value;
    
    if (!fromDate || !toDate) return inventoryItems;
    
    const from = new Date(fromDate);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999); // End of day
    
    return inventoryItems.filter(item => {
        const itemDate = new Date(item.dateTime);
        return itemDate >= from && itemDate <= to;
    });
}

async function filterByQuality() {
    const quality = document.getElementById('exportQuality').value;
    if (!quality) return inventoryItems;
    
    return inventoryItems.filter(item => item.quality === quality);
}

async function filterByProductType() {
    const productType = document.getElementById('exportProductType').value;
    if (productType === 'all') return inventoryItems;
    
    return inventoryItems.filter(item => 
        item.productType.toLowerCase() === productType.toLowerCase()
    );
}

async function filterByLotNumber() {
    const lotNumber = document.getElementById('exportLotNumber').value.trim();
    if (!lotNumber) return inventoryItems;
    
    return inventoryItems.filter(item => 
        item.lotNumber && item.lotNumber.toLowerCase().includes(lotNumber.toLowerCase())
    );
}

async function filterByUniqueCode() {
    const uniqueCode = document.getElementById('exportUniqueCode').value.trim();
    if (!uniqueCode) return inventoryItems;
    
    return inventoryItems.filter(item => 
        item.code && item.code.toLowerCase().includes(uniqueCode.toLowerCase())
    );
}

async function filterByCustom() {
    const productType = document.getElementById('customProductType').value;
    const quality = document.getElementById('customQuality').value;
    const stockStatus = document.getElementById('customStockStatus').value;
    
    return inventoryItems.filter(item => {
        // Product type filter
        if (productType && item.productType.toLowerCase() !== productType) {
            return false;
        }
        
        // Quality filter
        if (quality && item.quality !== quality) {
            return false;
        }
        
        // Stock status filter
        if (stockStatus !== 'all') {
            if (stockStatus === 'inStock' && !item.inStock) return false;
            if (stockStatus === 'outOfStock' && item.inStock) return false;
        }
        
        return true;
    });
}

// ================= MAIN EXPORT EXECUTION =================

async function executeAdvancedExport() {
    const exportType = document.getElementById('exportType').value;
    let filteredData = [];
    
    showNotification('🔄 Processing export...', 'info');
    
    // Data filter karo based on selection
    switch(exportType) {
        case 'complete':
            filteredData = inventoryItems;
            break;
        case 'dateRange':
            filteredData = await filterByDateRange();
            break;
        case 'quality':
            filteredData = await filterByQuality();
            break;
        case 'productType':
            filteredData = await filterByProductType();
            break;
        case 'lotNumber':
            filteredData = await filterByLotNumber();
            break;
        case 'uniqueCode':
            filteredData = await filterByUniqueCode();
            break;
        case 'customFilter':
            filteredData = await filterByCustom();
            break;
    }
    
    if (filteredData.length === 0) {
        showNotification('❌ No data found for selected criteria!', 'warning');
        return;
    }
    
    // File name generate karo
    const customFileName = document.getElementById('exportFileName').value.trim();
    let fileName = customFileName || generateExportFileName(exportType, filteredData);
    
    // Export karo
    try {
        await exportFilteredData(filteredData, fileName);
        showNotification(`✅ Exported ${filteredData.length} items successfully!`, 'success');
        closeAdvancedExportModal();
    } catch (error) {
        console.error('Export error:', error);
        showNotification('❌ Export failed: ' + error.message, 'error');
    }
}

function generateExportFileName(exportType, data) {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.getHours() + '-' + date.getMinutes();
    
    let typeStr = '';
    let criteriaStr = '';
    
    switch(exportType) {
        case 'dateRange':
            const fromDate = document.getElementById('exportFromDate').value;
            const toDate = document.getElementById('exportToDate').value;
            typeStr = `DATE_RANGE`;
            criteriaStr = `${fromDate}_to_${toDate}`;
            break;
        case 'quality':
            const quality = document.getElementById('exportQuality').value;
            typeStr = `QUALITY`;
            criteriaStr = quality;
            break;
        case 'productType':
            const productType = document.getElementById('exportProductType').value;
            typeStr = `PRODUCT_TYPE`;
            criteriaStr = productType;
            break;
        case 'lotNumber':
            const lotNumber = document.getElementById('exportLotNumber').value;
            typeStr = `LOT_NUMBER`;
            criteriaStr = lotNumber;
            break;
        case 'uniqueCode':
            const uniqueCode = document.getElementById('exportUniqueCode').value;
            typeStr = `UNIQUE_CODE`;
            criteriaStr = uniqueCode;
            break;
        case 'customFilter':
            typeStr = `CUSTOM_FILTER`;
            criteriaStr = `items_${data.length}`;
            break;
        default:
            typeStr = 'COMPLETE_DATA';
            criteriaStr = `all_${data.length}_items`;
    }
    
    return `ALISHAN_${typeStr}_${criteriaStr}_${dateStr}_${timeStr}.json`;
}

async function exportFilteredData(data, fileName) {
    const exportData = {
        metadata: {
            exportType: "ADVANCED_EXPORT",
            exportedAt: new Date().toISOString(),
            totalItems: data.length,
            criteria: getExportCriteria(),
            fileSize: calculateFileSize(data),
            system: "ALISHAN_INVENTORY",
            version: "2.0"
        },
        inventory: data
    };
    
    // Large data check - agar data bahut bada hai toh chunk mein export karein
    if (data.length > 10000) {
        await exportLargeDataInChunks(data, fileName);
    } else {
        downloadFile(JSON.stringify(exportData, null, 2), fileName, 'application/json');
    }
}

function getExportCriteria() {
    const exportType = document.getElementById('exportType').value;
    let criteria = { type: exportType };
    
    switch(exportType) {
        case 'dateRange':
            criteria.fromDate = document.getElementById('exportFromDate').value;
            criteria.toDate = document.getElementById('exportToDate').value;
            break;
        case 'quality':
            criteria.quality = document.getElementById('exportQuality').value;
            break;
        case 'productType':
            criteria.productType = document.getElementById('exportProductType').value;
            break;
        case 'lotNumber':
            criteria.lotNumber = document.getElementById('exportLotNumber').value;
            break;
        case 'uniqueCode':
            criteria.uniqueCode = document.getElementById('exportUniqueCode').value;
            break;
        case 'customFilter':
            criteria.productType = document.getElementById('customProductType').value;
            criteria.quality = document.getElementById('customQuality').value;
            criteria.stockStatus = document.getElementById('customStockStatus').value;
            break;
    }
    
    return criteria;
}

function calculateFileSize(data) {
    const jsonString = JSON.stringify(data);
    const sizeInBytes = new Blob([jsonString]).size;
    const sizeInKB = (sizeInBytes / 1024).toFixed(2);
    const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
    
    return {
        bytes: sizeInBytes,
        kb: sizeInKB,
        mb: sizeInMB
    };
}

// Large data export (10,000+ items)
async function exportLargeDataInChunks(data, baseFileName) {
    const chunkSize = 5000; // 5,000 items per chunk
    const totalChunks = Math.ceil(data.length / chunkSize);
    
    const backupInfo = {
        metadata: {
            type: "LARGE_EXPORT",
            totalChunks: totalChunks,
            totalItems: data.length,
            exportDate: new Date().toISOString(),
            chunkSize: chunkSize,
            originalFile: baseFileName
        }
    };
    
    // Backup info file export karo
    downloadFile(JSON.stringify(backupInfo, null, 2), 
                `BACKUP_INFO_${baseFileName}`, 
                'application/json');
    
    // Har chunk ko alag file mein export karo
    for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = start + chunkSize;
        const chunkData = data.slice(start, end);
        
        const chunkExport = {
            metadata: {
                chunkNumber: i + 1,
                totalChunks: totalChunks,
                itemsInChunk: chunkData.length,
                chunkStart: start,
                chunkEnd: end
            },
            inventory: chunkData
        };
        
        const chunkFileName = `CHUNK_${i + 1}_OF_${totalChunks}_${baseFileName}`;
        downloadFile(JSON.stringify(chunkExport, null, 2), chunkFileName, 'application/json');
        
        // Browser ko thoda time do
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    showNotification(`📦 Large export completed! ${totalChunks} files generated.`, 'success');
}


// Initialize the page when loaded
document.addEventListener('DOMContentLoaded', initPage);

