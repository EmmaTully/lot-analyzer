// Austin Zoning Rules
const austinZoning = {
    'SF-2': {
        minLotSize: 5750,
        frontSetback: 25,
        sideSetback: 5,
        maxHeight: 40
    },
    'SF-3': {
        minLotSize: 7000,
        frontSetback: 25,
        sideSetback: 7.5,
        maxHeight: 40
    },
    'SF-4A': {
        minLotSize: 8500,
        frontSetback: 25,
        sideSetback: 10,
        maxHeight: 40
    },
    'SF-5': {
        minLotSize: 10000,
        frontSetback: 25,
        sideSetback: 12,
        maxHeight: 40
    },
    'SF-6': {
        minLotSize: 12500,
        frontSetback: 25,
        sideSetback: 15,
        maxHeight: 40
    }
};

// Global variables
let uploadedData = null;
let analysisResults = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
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
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length !== headers.length) continue;
        
        const property = {};
        headers.forEach((header, index) => {
            property[header] = values[index];
        });
        
        // Convert to standard format
        const standardProperty = {
            address: extractAddress(property),
            price: extractPrice(property),
            lotSize: extractLotSize(property),
            zoning: extractZoning(property),
            bedrooms: parseInt(property.bedrooms) || 0,
            bathrooms: parseFloat(property.bathrooms) || 0,
            squareFeet: parseInt(property['square feet']) || 0,
            yearBuilt: parseInt(property['year built']) || 0
        };
        
        if (standardProperty.address && standardProperty.price && standardProperty.lotSize) {
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
        maxPrice: parseFloat(document.getElementById('maxPrice').value) || 500000,
        minLotSize: parseFloat(document.getElementById('minLotSize').value) || 7000,
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
    
    if (!price || !lotSize || price > config.maxPrice || lotSize < config.minLotSize) {
        return null;
    }
    
    // Calculate lot split potential
    const splitAnalysis = calculateLotSplitPotential(lotSize, zoning);
    if (!splitAnalysis.canSplit) {
        return null;
    }
    
    // Calculate financial viability
    const financialAnalysis = calculateFinancialViability(price, config, splitAnalysis);
    
    // Calculate overall score
    const score = calculateOverallScore(splitAnalysis, financialAnalysis, config);
    
    return {
        address: address,
        price: price,
        lotSize: lotSize,
        zoning: zoning,
        splitAnalysis: splitAnalysis,
        financialAnalysis: financialAnalysis,
        score: score,
        status: getStatus(score)
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

function calculateLotSplitPotential(lotSize, zoning) {
    const zoningRules = austinZoning[zoning] || austinZoning['SF-3'];
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

function calculateFinancialViability(purchasePrice, config, splitAnalysis) {
    const renovationCost = config.renovationBudget;
    const totalInvestment = purchasePrice + renovationCost;
    
    // Estimate renovated house value (simplified)
    const renovatedValue = purchasePrice * 1.2; // 20% increase after renovation
    
    // Estimate new lot value based on area and location
    const newLotValue = splitAnalysis.newLotSize * 15; // $15 per sq ft estimate
    
    const totalValue = renovatedValue + newLotValue;
    const profit = totalValue - totalInvestment;
    const profitMargin = (profit / totalInvestment) * 100;
    
    const meetsTarget = profitMargin >= config.targetProfit;
    
    return {
        purchasePrice: purchasePrice,
        renovationCost: renovationCost,
        totalInvestment: totalInvestment,
        renovatedValue: renovatedValue,
        newLotValue: newLotValue,
        totalValue: totalValue,
        profit: profit,
        profitMargin: profitMargin,
        meetsTarget: meetsTarget
    };
}

function calculateOverallScore(splitAnalysis, financialAnalysis, config) {
    let score = 0;
    
    // Lot size score (0-30 points)
    const lotSizeRatio = splitAnalysis.splitRatio;
    score += Math.min(30, lotSizeRatio * 60);
    
    // Profit margin score (0-40 points)
    const profitRatio = financialAnalysis.profitMargin / config.targetProfit;
    score += Math.min(40, profitRatio * 40);
    
    // Buildable area score (0-20 points)
    const buildableRatio = splitAnalysis.buildableArea / splitAnalysis.newLotSize;
    score += Math.min(20, buildableRatio * 30);
    
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
        resultsContent.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h3>Found ${results.length} properties with lot split potential!</h3>
                <p>Properties are ranked by overall investment opportunity score.</p>
            </div>
            ${generateResultsTable(results)}
        `;
    }
    
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function generateResultsTable(results) {
    const tableRows = results.map(result => `
        <tr>
            <td>${result.address}</td>
            <td>$${result.price.toLocaleString()}</td>
            <td>${result.lotSize.toLocaleString()} sq ft</td>
            <td>${result.splitAnalysis.newLotSize.toLocaleString()} sq ft</td>
            <td>$${Math.round(result.financialAnalysis.profit).toLocaleString()}</td>
            <td>${result.financialAnalysis.profitMargin.toFixed(1)}%</td>
            <td>
                <span class="status-badge status-${result.status}">
                    ${result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                </span>
            </td>
            <td>${result.score}/100</td>
        </tr>
    `).join('');
    
    return `
        <table class="results-table">
            <thead>
                <tr>
                    <th>Address</th>
                    <th>Price</th>
                    <th>Original Lot</th>
                    <th>New Lot Size</th>
                    <th>Est. Profit</th>
                    <th>Profit Margin</th>
                    <th>Status</th>
                    <th>Score</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    `;
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
        document.getElementById('maxPrice').value = '500000';
        document.getElementById('minLotSize').value = '7000';
        document.getElementById('targetProfit').value = '20';
        document.getElementById('renovationBudget').value = '100000';
    }
} 