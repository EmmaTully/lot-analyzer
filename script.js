// Real Austin Zoning Analysis Engine - Based on Austin Land Development Code
const austinZoningRules = {
    'SF-1': {
        minLotSize: 43560, // 1 acre
        minLotWidth: 150,
        frontSetback: 40,
        sideSetback: 20,
        rearSetback: 25,
        maxHeight: 40,
        maxImpervious: 0.20, // 20% impervious cover
        description: 'Single Family - Large Lot'
    },
    'SF-2': {
        minLotSize: 5750,
        minLotWidth: 50,
        frontSetback: 25,
        sideSetback: 5,
        rearSetback: 20,
        maxHeight: 40,
        maxImpervious: 0.45,
        description: 'Single Family - Standard'
    },
    'SF-3': {
        minLotSize: 7000,
        minLotWidth: 60,
        frontSetback: 25,
        sideSetback: 7.5,
        rearSetback: 20,
        maxHeight: 40,
        maxImpervious: 0.40,
        description: 'Single Family - Medium'
    },
    'SF-4A': {
        minLotSize: 8500,
        minLotWidth: 70,
        frontSetback: 25,
        sideSetback: 10,
        rearSetback: 25,
        maxHeight: 40,
        maxImpervious: 0.35,
        description: 'Single Family - Large'
    },
    'SF-5': {
        minLotSize: 10000,
        minLotWidth: 80,
        frontSetback: 25,
        sideSetback: 12,
        rearSetback: 25,
        maxHeight: 40,
        maxImpervious: 0.30,
        description: 'Single Family - Estate'
    },
    'SF-6': {
        minLotSize: 12500,
        minLotWidth: 100,
        frontSetback: 25,
        sideSetback: 15,
        rearSetback: 30,
        maxHeight: 40,
        maxImpervious: 0.25,
        description: 'Single Family - Estate Large'
    },
    // Add mixed-use and multi-family zones that might allow splitting
    'MF-1': {
        minLotSize: 5750,
        frontSetback: 20,
        sideSetback: 5,
        maxHeight: 40,
        description: 'Multi-Family Low Density'
    },
    'MF-2': {
        minLotSize: 7000,
        frontSetback: 20,
        sideSetback: 7.5,
        maxHeight: 60,
        description: 'Multi-Family Medium Density'
    }
};

// Austin Lot Subdivision Requirements (Real City Requirements)
const austinSubdivisionRules = {
    // Minimum requirements for creating new lots
    minStreetFrontage: 25, // feet
    minUtilityEasement: 10, // feet
    maxSlopeForBuilding: 0.15, // 15% grade
    
    // Required infrastructure
    requiredUtilities: ['water', 'sewer', 'electric', 'gas'],
    
    // Platting requirements
    requiresPlatting: true,
    plattingCost: 15000, // Estimated cost
    plattingTimeMonths: 6,
    
    // Tree preservation (Austin Tree Ordinance)
    protectedTreeDiameter: 19, // inches
    treePreservationRequired: true,
    
    // Drainage requirements
    drainageStudyRequired: true,
    maxRunoffIncrease: 0.10, // 10% max increase
    
    // Historic districts (simplified - would need API lookup)
    historicDistrictRestrictions: [
        'Hyde Park', 'Clarksville', 'French Place', 'Old West Austin'
    ]
};

// Austin market data for more accurate valuations
const austinMarketData = {
    averagePricePerSqFt: 350, // Updated Austin average
    lotValuePerSqFt: 25, // Land value per sq ft
    renovationCostPerSqFt: 150, // Renovation cost per sq ft
    constructionCostPerSqFt: 200, // New construction cost
    appreciationRate: 0.08, // 8% annual appreciation
    marketMultiplier: {
        '78701': 1.8, // Downtown premium
        '78703': 1.6, // Tarrytown premium
        '78704': 1.4, // South Austin premium
        '78745': 1.2, // South Austin
        '78702': 1.3, // East Austin
        '78746': 1.5, // West Austin
        '78748': 1.1, // South
        '78749': 1.1, // Southwest
        'default': 1.0
    }
};

// Global variables
let uploadedData = null;
let analysisResults = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Austin Lot Analyzer v2.0 - Show All Properties');
    setupFileUpload();
});

// File upload setup
function setupFileUpload() {
    const csvFile = document.getElementById('csvFile');
    const uploadZone = document.getElementById('uploadZone');
    
    // File input change
    csvFile.addEventListener('change', handleFileSelect);
    
    // Click to upload
    uploadZone.addEventListener('click', () => {
        csvFile.click();
    });
    
    // Drag and drop
    uploadZone.addEventListener('dragover', handleDragOver);
    uploadZone.addEventListener('drop', handleDrop);
    uploadZone.addEventListener('dragenter', handleDragEnter);
    uploadZone.addEventListener('dragleave', handleDragLeave);
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('uploadZone').classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    // Only remove drag-over if we're actually leaving the upload zone
    if (!e.currentTarget.contains(e.relatedTarget)) {
        document.getElementById('uploadZone').classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('uploadZone').classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
        alert('Please select a CSV file.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvData = e.target.result;
            const properties = parseCSV(csvData);
            
            if (properties.length === 0) {
                alert('No valid properties found in the CSV file.');
                return;
            }
            
            uploadedData = properties;
            showFileInfo(file, properties.length);
            
        } catch (error) {
            alert('Error reading CSV file: ' + error.message);
        }
    };
    
    reader.readAsText(file);
}

function parseCSV(csvData) {
    const lines = csvData.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
        throw new Error('CSV file must have at least a header row and one data row.');
    }
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
    const properties = [];
    
    // Check if this is an MLS export
    const isMLS = headers.includes('acres') || headers.includes('# beds') || headers.includes('listing id');
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length !== headers.length) continue;
        
        const property = {};
        headers.forEach((header, index) => {
            property[header] = values[index];
        });
        
        // Convert to standard format
        let standardProperty;
        if (isMLS) {
            // Handle MLS format
            standardProperty = {
                address: extractAddressMLS(property),
                price: extractPriceMLS(property),
                lotSize: extractLotSizeMLS(property),
                zoning: extractZoningMLS(property),
                bedrooms: parseInt(property['# beds']) || 0,
                bathrooms: parseFloat(property['# full baths']) || 0,
                squareFeet: extractSquareFeetMLS(property),
                yearBuilt: parseInt(property['year built']) || 0
            };
        } else {
            // Handle standard format (Zillow/Realtor)
            standardProperty = {
                address: extractAddress(property),
                price: extractPrice(property),
                lotSize: extractLotSize(property),
                zoning: extractZoning(property),
                bedrooms: parseInt(property.bedrooms) || 0,
                bathrooms: parseFloat(property.bathrooms) || 0,
                squareFeet: extractSquareFeet(property),
                yearBuilt: parseInt(property['year built']) || 0
            };
        }
        
        if (standardProperty.address && standardProperty.lotSize) {
            properties.push(standardProperty);
        }
    }
    
    return properties;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

function showFileInfo(file, propertyCount) {
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileDetails = document.getElementById('fileDetails');
    const uploadZone = document.getElementById('uploadZone');
    
    fileName.textContent = file.name;
    fileDetails.textContent = `${propertyCount} properties found • ${(file.size / 1024).toFixed(1)} KB`;
    
    uploadZone.style.display = 'none';
    fileInfo.style.display = 'block';
}

function clearFile() {
    uploadedData = null;
    analysisResults = null;
    
    const fileInfo = document.getElementById('fileInfo');
    const uploadZone = document.getElementById('uploadZone');
    const resultsSection = document.getElementById('resultsSection');
    
    fileInfo.style.display = 'none';
    uploadZone.style.display = 'block';
    resultsSection.style.display = 'none';
    
    document.getElementById('csvFile').value = '';
    document.getElementById('exportBtn').disabled = true;
}

function analyzeCSV() {
    if (!uploadedData) {
        alert('Please upload a CSV file first.');
        return;
    }
    
    // Get configuration values
    const config = {
        maxPrice: parseFloat(document.getElementById('maxPrice').value) || 900000,
        minLotSize: parseFloat(document.getElementById('minLotSize').value) || 11500,
        targetProfit: parseFloat(document.getElementById('targetProfit').value) || 20,
        renovationBudget: parseFloat(document.getElementById('renovationBudget').value) || 100000
    };
    
    // Analyze all properties
    const results = [];
    
    uploadedData.forEach(property => {
        const analysis = analyzeSingleProperty(property, config);
        if (analysis) {
            results.push(analysis);
        }
    });
    
    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);
    
    analysisResults = results;
    displayResults(results);
    document.getElementById('exportBtn').disabled = false;
}

function analyzeSingleProperty(property, config) {
    const price = property.price;
    const lotSize = property.lotSize;
    const address = property.address;
    const zoning = property.zoning;
    
    // Skip only if missing essential data
    if (!price || !lotSize || !address) {
        return null;
    }
    
    // Calculate lot split potential using REAL Austin zoning analysis
    const realZoningAnalysis = performRealAustinZoningAnalysis(property);
    const splitAnalysis = calculateLotSplitPotential(lotSize, zoning); // Keep for compatibility
    
    // Calculate financial viability (even if can't split)
    const financialAnalysis = calculateFinancialViability(price, config, splitAnalysis, property);
    
    // Calculate overall score
    const score = calculateOverallScore(splitAnalysis, financialAnalysis, config);
    
    // Determine status based on multiple factors
    let status = getStatus(score);
    if (!splitAnalysis.canSplit) {
        status = 'poor'; // Can't split = poor investment
    } else if (price > config.maxPrice) {
        status = 'poor'; // Too expensive
    }
    
    return {
        address: address,
        price: price,
        lotSize: lotSize,
        zoning: zoning,
        splitAnalysis: splitAnalysis,
        realZoningAnalysis: realZoningAnalysis, // Add real Austin analysis
        financialAnalysis: financialAnalysis,
        score: score,
        status: status,
        canSplit: realZoningAnalysis.canSplit, // Use real analysis
        meetsPrice: price <= config.maxPrice,
        meetsSize: lotSize >= config.minLotSize,
        splitReasons: realZoningAnalysis.reasons,
        requirements: realZoningAnalysis.requirements,
        estimatedCosts: realZoningAnalysis.estimatedCosts,
        timeline: realZoningAnalysis.timeline,
        risks: realZoningAnalysis.risks
    };
}

function extractPrice(property) {
    const priceFields = ['price', 'list price', 'asking price', 'sale price'];
    for (const field of priceFields) {
        if (property[field]) {
            const price = parseFloat(property[field].toString().replace(/[$,]/g, ''));
            if (!isNaN(price)) return price;
        }
    }
    return null;
}

function extractLotSize(property) {
    const lotFields = ['lot size', 'lot size sqft', 'lot sq ft', 'lot area', 'land area'];
    for (const field of lotFields) {
        if (property[field]) {
            const size = parseFloat(property[field].toString().replace(/[,\s]/g, ''));
            if (!isNaN(size)) return size;
        }
    }
    return null;
}

function extractAddress(property) {
    const addressFields = ['address', 'street address', 'property address', 'full address'];
    for (const field of addressFields) {
        if (property[field]) {
            return property[field].toString().replace(/"/g, '');
        }
    }
    return 'Address not available';
}

function extractZoning(property) {
    const zoningFields = ['zoning', 'zone', 'zoning code'];
    for (const field of zoningFields) {
        if (property[field]) {
            return property[field].toString().toUpperCase();
        }
    }
    // Default to SF-3 if no zoning info
    return 'SF-3';
}

function extractSquareFeet(property) {
    const sqftFields = ['square feet', 'sqft', 'living area', 'living sqft'];
    for (const field of sqftFields) {
        if (property[field]) {
            const sqft = parseInt(property[field].toString().replace(/[,\s]/g, ''));
            if (!isNaN(sqft)) return sqft;
        }
    }
    return 0;
}

// MLS-specific extraction functions
function extractAddressMLS(property) {
    // MLS format typically has address in "Address" column
    if (property.address) {
        // Add Austin, TX if not present
        let addr = property.address.toString().replace(/"/g, '');
        if (!addr.toLowerCase().includes('austin') && !addr.toLowerCase().includes('tx')) {
            addr += ', Austin, TX';
        }
        return addr;
    }
    return 'Address not available';
}

function extractPriceMLS(property) {
    // MLS uses "List Price" or "Close Price"
    const priceFields = ['list price', 'close price', 'price'];
    for (const field of priceFields) {
        if (property[field]) {
            const price = parseFloat(property[field].toString().replace(/[$,]/g, ''));
            if (!isNaN(price)) return price;
        }
    }
    return 0;
}

function extractLotSizeMLS(property) {
    // MLS uses "Acres" - need to convert to sq ft
    if (property.acres) {
        const acres = parseFloat(property.acres.toString().replace(/[,\s]/g, ''));
        if (!isNaN(acres)) {
            return Math.round(acres * 43560); // Convert acres to sq ft
        }
    }
    return null;
}

function extractZoningMLS(property) {
    // MLS might not have zoning, estimate from lot size
    if (property.zoning) {
        return property.zoning.toString().toUpperCase();
    }
    
    // Estimate based on lot size (acres)
    if (property.acres) {
        const acres = parseFloat(property.acres.toString().replace(/[,\s]/g, ''));
        if (acres >= 1) return 'SF-1';
        if (acres >= 0.287) return 'SF-6'; // 12,500 sq ft
        if (acres >= 0.23) return 'SF-5';  // 10,000 sq ft
        if (acres >= 0.195) return 'SF-4A'; // 8,500 sq ft
        if (acres >= 0.161) return 'SF-3';  // 7,000 sq ft
        if (acres >= 0.132) return 'SF-2';  // 5,750 sq ft
    }
    
    return 'SF-3'; // Default
}

function extractSquareFeetMLS(property) {
    // MLS uses "SqFt" column
    if (property.sqft) {
        const sqft = parseInt(property.sqft.toString().replace(/[,\s]/g, ''));
        if (!isNaN(sqft)) return sqft;
    }
    return 0;
}

function calculateLotSplitPotential(lotSize, zoning) {
    const zoningRules = austinZoningRules[zoning] || austinZoningRules['SF-3'];
    const minSizeForSplit = zoningRules.minLotSize * 2; // Need space for 2 lots
    
    const canSplit = lotSize >= minSizeForSplit;
    const newLotSize = canSplit ? Math.floor((lotSize - zoningRules.minLotSize) * 0.9) : 0;
    const buildableArea = canSplit ? calculateBuildableArea(newLotSize, zoningRules) : 0;
    
    return {
        canSplit: canSplit,
        originalLotSize: lotSize,
        newLotSize: newLotSize,
        buildableArea: buildableArea,
        zoningRules: zoningRules,
        splitRatio: canSplit ? (newLotSize / lotSize) : 0
    };
}

function calculateBuildableArea(lotSize, zoningRules) {
    // Simplified calculation - assumes rectangular lot
    const lotWidth = Math.sqrt(lotSize);
    const lotDepth = lotSize / lotWidth;
    
    const buildableWidth = Math.max(0, lotWidth - (2 * zoningRules.sideSetback));
    const buildableDepth = Math.max(0, lotDepth - zoningRules.frontSetback - 20); // 20ft rear setback
    
    return buildableWidth * buildableDepth;
}

function calculateFinancialViability(purchasePrice, config, splitAnalysis, property) {
    const renovationCost = config.renovationBudget;
    
    // Get zip code from address for market multiplier
    const zipCode = extractZipCode(property.address);
    const marketMultiplier = austinMarketData.marketMultiplier[zipCode] || austinMarketData.marketMultiplier.default;
    
    // More sophisticated valuation based on Austin market data
    const baseRenovatedValue = property.squareFeet * austinMarketData.averagePricePerSqFt * marketMultiplier;
    const renovatedValue = Math.max(baseRenovatedValue, purchasePrice * 1.15); // At least 15% increase
    
    // Calculate new lot value with market considerations
    const baseLotValue = splitAnalysis.newLotSize * austinMarketData.lotValuePerSqFt;
    const newLotValue = splitAnalysis.canSplit ? baseLotValue * marketMultiplier : 0;
    
    // Add potential for building on new lot
    const newConstructionValue = splitAnalysis.canSplit ? 
        (splitAnalysis.buildableArea * 0.4 * austinMarketData.constructionCostPerSqFt * marketMultiplier) : 0;
    
    const totalInvestment = purchasePrice + renovationCost;
    const totalValue = renovatedValue + newLotValue + (newConstructionValue * 0.3); // 30% of construction value as profit potential
    const profit = totalValue - totalInvestment;
    const profitMargin = (profit / totalInvestment) * 100;
    
    const meetsTarget = profitMargin >= config.targetProfit;
    
    // Calculate break-even scenarios
    const breakEvenRenovatedSale = totalInvestment - newLotValue;
    const breakEvenLotSale = totalInvestment - renovatedValue;
    
    return {
        purchasePrice: purchasePrice,
        renovationCost: renovationCost,
        totalInvestment: totalInvestment,
        renovatedValue: renovatedValue,
        newLotValue: newLotValue,
        newConstructionValue: newConstructionValue,
        totalValue: totalValue,
        profit: profit,
        profitMargin: profitMargin,
        meetsTarget: meetsTarget,
        marketMultiplier: marketMultiplier,
        zipCode: zipCode,
        breakEvenRenovatedSale: breakEvenRenovatedSale,
        breakEvenLotSale: breakEvenLotSale
    };
}

function extractZipCode(address) {
    const zipMatch = address.match(/\b(\d{5})\b/);
    return zipMatch ? zipMatch[1] : 'default';
}

function calculateOverallScore(splitAnalysis, financialAnalysis, config) {
    let score = 0;
    
    // If can't split, score is very low
    if (!splitAnalysis.canSplit) {
        return Math.round(splitAnalysis.splitRatio * 20); // Max 20 points for non-splittable
    }
    
    // Lot size score (0-30 points)
    const lotSizeRatio = splitAnalysis.splitRatio;
    score += Math.min(30, lotSizeRatio * 60);
    
    // Profit margin score (0-40 points)
    const profitRatio = Math.max(0, financialAnalysis.profitMargin / config.targetProfit);
    score += Math.min(40, profitRatio * 40);
    
    // Buildable area score (0-20 points)
    if (splitAnalysis.newLotSize > 0) {
        const buildableRatio = splitAnalysis.buildableArea / splitAnalysis.newLotSize;
        score += Math.min(20, buildableRatio * 30);
    }
    
    // Financial viability bonus (0-10 points)
    if (financialAnalysis.meetsTarget) {
        score += 10;
    }
    
    return Math.round(score);
}

function getStatus(score) {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    return 'poor';
}

function displayResults(results) {
    const resultsSection = document.getElementById('resultsSection');
    const resultsContent = document.getElementById('resultsContent');
    
    if (results.length === 0) {
        resultsContent.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-search" style="font-size: 3rem; color: #a0aec0; margin-bottom: 20px;"></i>
                <h3>No suitable properties found</h3>
                <p>Try adjusting your criteria or uploading a different dataset.</p>
            </div>
        `;
    } else {
        const viableCount = results.filter(r => r.canSplit).length;
        resultsContent.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h3>Austin Zoning Analysis: ${results.length} properties analyzed</h3>
                <p><strong>${viableCount} properties can be split</strong> according to Austin city zoning codes. This analysis shows lot sizes and buildable square footage based on current zoning regulations.</p>
            </div>
            ${generateResultsTable(results)}
        `;
    }
    
    resultsSection.style.display = 'block';
}

function generateResultsTable(results) {
    const tableRows = results.map((result, index) => {
        // Get split analysis data
        const splitData = result.realZoningAnalysis.splitResults;
        const canSplit = result.canSplit;
        
        // Current house size
        const currentHouseSize = result.squareFeet > 0 ? 
            `${result.squareFeet.toLocaleString()} sq ft` : 
            'No data';
        
        // Calculate potential buildable square footage
        const lot1BuildableSqFt = canSplit && splitData ? 
            Math.floor(calculateRealBuildableArea(result.realZoningAnalysis.zoningRules.minLotSize, result.realZoningAnalysis.zoningRules) * 0.6).toLocaleString() : 
            'N/A';
        const lot2BuildableSqFt = canSplit && splitData ? 
            splitData.maxHouseSize.toLocaleString() : 
            'N/A';
        
        // New lot sizes
        const newLotSize = canSplit && splitData ? 
            `${result.realZoningAnalysis.zoningRules.minLotSize.toLocaleString()} + ${splitData.newLotSize.toLocaleString()}` : 
            'Cannot split';
        
        // Max build display
        const maxBuildDisplay = canSplit ? 
            `${lot1BuildableSqFt} / ${lot2BuildableSqFt}` : 
            'N/A';
        
        // Status based on split ability
        let statusIcon = canSplit ? '✓' : '✗';
        let statusClass = canSplit ? 'can-split' : 'cannot-split';
        
        return `
            <tr class="${canSplit ? 'viable-property' : 'non-viable-property'}">
                <td>
                    <div class="address-cell">
                        ${result.address}
                        <div class="zoning-info">${result.zoning}</div>
                    </div>
                </td>
                <td class="price-cell">$${result.price.toLocaleString()}</td>
                <td class="size-cell">${result.lotSize.toLocaleString()}</td>
                <td class="current-house-cell">${currentHouseSize}</td>
                <td class="split-size-cell">${newLotSize}</td>
                <td class="buildable-cell">${maxBuildDisplay}</td>
                <td class="status-cell-minimal">
                    <span class="status-icon ${statusClass}" onclick="showPropertyDetails(${index})">
                        ${statusIcon}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
    
    return `
        <table class="results-table minimal">
            <thead>
                <tr>
                    <th>Property</th>
                    <th>Price</th>
                    <th>Lot Size</th>
                    <th>Current House</th>
                    <th>After Split</th>
                    <th>Max Build (Lot 1 / Lot 2)</th>
                    <th class="split-header">Split</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
        
        <!-- Property Details Modal -->
        <div id="propertyModal" class="modal" style="display: none;">
            <div class="modal-content">
                <span class="close" onclick="closePropertyDetails()">&times;</span>
                <div id="propertyDetailsContent"></div>
            </div>
        </div>
    `;
}

// Function to show detailed property analysis
function showPropertyDetails(index) {
    const result = analysisResults[index];
    const modal = document.getElementById('propertyModal');
    const content = document.getElementById('propertyDetailsContent');
    
    let detailsHTML = `
        <h2>🏠 ${result.address}</h2>
        <div class="property-details">
            <div class="detail-section">
                <h3>📋 Austin Zoning Analysis</h3>
                <p><strong>Zoning:</strong> ${result.zoning} - ${result.realZoningAnalysis.zoningRules.description}</p>
                <p><strong>Lot Size:</strong> ${result.lotSize.toLocaleString()} sq ft</p>
                <p><strong>Can Split:</strong> ${result.canSplit ? '✅ Yes' : '❌ No'}</p>
    `;
    
    if (!result.canSplit && result.splitReasons.length > 0) {
        detailsHTML += `
                <div class="reasons-section">
                    <h4>❌ Reasons Cannot Split:</h4>
                    <ul>
                        ${result.splitReasons.map(reason => `<li>${reason}</li>`).join('')}
                    </ul>
                </div>
        `;
    }
    
    if (result.canSplit && result.realZoningAnalysis.splitResults) {
        const split = result.realZoningAnalysis.splitResults;
        const zoningRules = result.realZoningAnalysis.zoningRules;
        detailsHTML += `
                <div class="split-results">
                    <h4>✅ Lot Split Analysis:</h4>
                    <p><strong>Number of Lots After Split:</strong> 2 lots</p>
                    <p><strong>Lot 1 Size:</strong> ${zoningRules.minLotSize.toLocaleString()} sq ft (minimum for ${result.zoning})</p>
                    <p><strong>Lot 2 Size:</strong> ${split.newLotSize.toLocaleString()} sq ft</p>
                    
                    <h5>Buildable Area Analysis:</h5>
                    <p><strong>Lot 1 Buildable Area:</strong> ${Math.floor(calculateRealBuildableArea(zoningRules.minLotSize, zoningRules)).toLocaleString()} sq ft</p>
                    <p><strong>Lot 1 Max House Size:</strong> ${Math.floor(calculateRealBuildableArea(zoningRules.minLotSize, zoningRules) * 0.6).toLocaleString()} sq ft (60% coverage)</p>
                    <p><strong>Lot 2 Buildable Area:</strong> ${split.buildableArea.toLocaleString()} sq ft</p>
                    <p><strong>Lot 2 Max House Size:</strong> ${split.maxHouseSize.toLocaleString()} sq ft (60% coverage)</p>
                    
                    <h5>Setback Requirements (${result.zoning}):</h5>
                    <p><strong>Front Setback:</strong> ${zoningRules.frontSetback} ft</p>
                    <p><strong>Side Setback:</strong> ${zoningRules.sideSetback} ft each side</p>
                    <p><strong>Rear Setback:</strong> ${zoningRules.rearSetback} ft</p>
                    <p><strong>Max Height:</strong> ${zoningRules.maxHeight} ft</p>
                    <p><strong>Max Impervious Cover:</strong> ${(zoningRules.maxImpervious * 100).toFixed(0)}%</p>
                </div>
        `;
    }
    
    if (result.requirements && result.requirements.length > 0) {
        detailsHTML += `
                <div class="requirements-section">
                    <h4>📝 Austin City Requirements:</h4>
                    <ul>
                        ${result.requirements.map(req => `<li>${req}</li>`).join('')}
                    </ul>
                </div>
        `;
    }
    

    
    if (result.timeline && result.timeline.totalMonths) {
        detailsHTML += `
                <div class="timeline-section">
                    <h4>⏱️ Estimated Timeline:</h4>
                    <p><strong>Platting Process:</strong> ${result.timeline.plattingMonths} months</p>
                    <p><strong>Utility Connections:</strong> ${result.timeline.utilityMonths} months</p>
                    <p><strong>Total Timeline:</strong> ${result.timeline.totalMonths} months</p>
                </div>
        `;
    }
    
    if (result.risks && result.risks.length > 0) {
        detailsHTML += `
                <div class="risks-section">
                    <h4>⚠️ Potential Risks:</h4>
                    <ul>
                        ${result.risks.map(risk => `<li>${risk}</li>`).join('')}
                    </ul>
                </div>
        `;
    }
    
    detailsHTML += `
            </div>
        </div>
    `;
    
    content.innerHTML = detailsHTML;
    modal.style.display = 'block';
}

function closePropertyDetails() {
    document.getElementById('propertyModal').style.display = 'none';
}

function exportResults() {
    if (!analysisResults) {
        alert('No results to export. Please run analysis first.');
        return;
    }
    
    const csvContent = generateCSVExport(analysisResults);
    downloadCSV(csvContent, 'austin_lot_analysis_results.csv');
}

function generateCSVExport(results) {
    const headers = [
        'Address', 'Purchase Price', 'Original Lot Size', 'New Lot Size', 
        'Buildable Area', 'Estimated Profit', 'Profit Margin', 'Status', 'Score'
    ];
    
    const rows = results.map(result => [
        result.address,
        result.price,
        result.lotSize,
        result.splitAnalysis.newLotSize,
        Math.round(result.splitAnalysis.buildableArea),
        Math.round(result.financialAnalysis.profit),
        result.financialAnalysis.profitMargin.toFixed(2),
        result.status,
        result.score
    ]);
    
    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
    
    return csvContent;
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function clearAll() {
    if (confirm('Are you sure you want to clear all data and start over?')) {
        clearFile();
        
        // Reset configuration to defaults
        document.getElementById('maxPrice').value = '900000';
        document.getElementById('minLotSize').value = '11500';
        document.getElementById('targetProfit').value = '20';
        document.getElementById('renovationBudget').value = '100000';
    }
}

function performRealAustinZoningAnalysis(property, lotDimensions) {
    const zoning = property.zoning;
    const zoningRules = austinZoningRules[zoning] || austinZoningRules['SF-3'];
    
    const analysis = {
        zoning: zoning,
        zoningRules: zoningRules,
        canSplit: false,
        reasons: [],
        requirements: [],
        estimatedCosts: {},
        timeline: {},
        risks: []
    };
    
    // 1. Basic Size Requirements
    // Austin typically requires exactly 2x minimum lot size for subdivision
    // Additional space for utilities comes from the lot itself
    const minSizeForTwoLots = zoningRules.minLotSize * 2; // Exactly 2 minimum lots
    if (property.lotSize < minSizeForTwoLots) {
        analysis.reasons.push(`Lot too small: ${property.lotSize.toLocaleString()} sq ft < ${minSizeForTwoLots.toLocaleString()} sq ft required (need ${zoningRules.minLotSize.toLocaleString()} sq ft × 2 lots)`);
        return analysis;
    }
    
    // 2. Width Requirements (Critical for Austin)
    const estimatedWidth = Math.sqrt(property.lotSize * 1.5); // Assume 1.5:1 depth ratio
    const minWidthForTwoLots = zoningRules.minLotWidth * 2 + 10; // 10ft between lots
    if (estimatedWidth < minWidthForTwoLots) {
        analysis.reasons.push(`Insufficient width: Est. ${estimatedWidth.toFixed(0)}ft < ${minWidthForTwoLots}ft required`);
        return analysis;
    }
    
    // 3. Street Frontage Check
    if (estimatedWidth < austinSubdivisionRules.minStreetFrontage * 2) {
        analysis.reasons.push(`Insufficient street frontage for two lots`);
        return analysis;
    }
    
    // 4. Utility Access Analysis
    const utilityAnalysis = analyzeUtilityAccess(property);
    if (!utilityAnalysis.feasible) {
        analysis.reasons.push(`Utility access issues: ${utilityAnalysis.issues.join(', ')}`);
        analysis.risks.push('High utility connection costs');
    }
    
    // 5. Drainage and Environmental
    const drainageAnalysis = analyzeDrainageRequirements(property);
    if (!drainageAnalysis.compliant) {
        analysis.risks.push('Drainage study required - potential restrictions');
    }
    
    // 6. Calculate Realistic New Lot
    if (analysis.reasons.length === 0) {
        analysis.canSplit = true;
        
        // More realistic lot calculation
        // Typically you keep one lot at minimum size and make the other lot with remaining space
        // Account for ~5% loss to utilities and easements
        const totalUsableArea = property.lotSize * 0.95; // 5% for utilities/easements
        const newLotSize = Math.floor(totalUsableArea - zoningRules.minLotSize);
        const buildableArea = calculateRealBuildableArea(newLotSize, zoningRules);
        
        analysis.splitResults = {
            originalLotSize: property.lotSize,
            remainingLotSize: zoningRules.minLotSize,
            newLotSize: newLotSize,
            buildableArea: buildableArea,
            maxHouseSize: Math.floor(buildableArea * 0.6), // 60% lot coverage typical
            estimatedUtilityCost: utilityAnalysis.estimatedCost
        };
        
        // Timeline and costs
        analysis.estimatedCosts = {
            platting: austinSubdivisionRules.plattingCost,
            utilities: utilityAnalysis.estimatedCost,
            surveying: 5000,
            permits: 3000,
            total: austinSubdivisionRules.plattingCost + utilityAnalysis.estimatedCost + 8000
        };
        
        analysis.timeline = {
            plattingMonths: austinSubdivisionRules.plattingTimeMonths,
            utilityMonths: 3,
            totalMonths: Math.max(austinSubdivisionRules.plattingTimeMonths, 3) + 2
        };
        
        // Requirements checklist
        analysis.requirements = [
            'Submit preliminary plat to City of Austin',
            'Conduct drainage study',
            'Survey existing utilities',
            'Check for protected trees (19"+ diameter)',
            'Verify no historic district restrictions',
            'Obtain utility commitment letters',
            'Pay impact fees'
        ];
    }
    
    return analysis;
}

function analyzeUtilityAccess(property) {
    // Simplified utility analysis - in reality would need GIS data
    const zipCode = extractZipCode(property.address);
    
    // Austin utility availability by area (simplified)
    const utilityAvailability = {
        '78701': { water: true, sewer: true, electric: true, gas: true, cost: 25000 }, // Downtown
        '78703': { water: true, sewer: true, electric: true, gas: true, cost: 20000 }, // Tarrytown
        '78704': { water: true, sewer: true, electric: true, gas: true, cost: 18000 }, // South Austin
        '78745': { water: true, sewer: false, electric: true, gas: true, cost: 35000 }, // May need septic
        '78702': { water: true, sewer: true, electric: true, gas: true, cost: 22000 }, // East Austin
        'default': { water: true, sewer: true, electric: true, gas: true, cost: 25000 }
    };
    
    const availability = utilityAvailability[zipCode] || utilityAvailability.default;
    const issues = [];
    
    if (!availability.sewer) {
        issues.push('Septic system required');
    }
    if (!availability.gas) {
        issues.push('Gas line extension needed');
    }
    
    return {
        feasible: issues.length === 0,
        issues: issues,
        estimatedCost: availability.cost,
        utilities: availability
    };
}

function analyzeDrainageRequirements(property) {
    // Simplified drainage analysis
    const lotSize = property.lotSize;
    const zoning = property.zoning;
    const zoningRules = austinZoningRules[zoning] || austinZoningRules['SF-3'];
    
    // Austin requires drainage study for lots > 1 acre or in flood zones
    const requiresStudy = lotSize > 43560; // 1 acre
    const estimatedRunoffIncrease = 0.15; // 15% increase typical for subdivision
    
    return {
        compliant: estimatedRunoffIncrease <= austinSubdivisionRules.maxRunoffIncrease,
        requiresStudy: requiresStudy,
        estimatedRunoffIncrease: estimatedRunoffIncrease,
        maxAllowed: austinSubdivisionRules.maxRunoffIncrease
    };
}

function calculateRealBuildableArea(lotSize, zoningRules) {
    // More realistic buildable area calculation
    const assumedWidth = Math.sqrt(lotSize * 1.2); // Assume 1.2:1 ratio
    const assumedDepth = lotSize / assumedWidth;
    
    // Account for all setbacks
    const buildableWidth = Math.max(0, assumedWidth - (2 * zoningRules.sideSetback));
    const buildableDepth = Math.max(0, assumedDepth - zoningRules.frontSetback - zoningRules.rearSetback);
    
    const grossBuildableArea = buildableWidth * buildableDepth;
    
    // Reduce for utilities, easements, and irregular shapes
    const netBuildableArea = grossBuildableArea * 0.8; // 20% reduction for real-world constraints
    
    return Math.max(0, netBuildableArea);
} 