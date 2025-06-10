// Global variables
let currentProperty = null;
let analysisResults = null;

// Austin zoning data
const austinZoning = {
    'SF-2': { minLotSize: 5750, frontSetback: 25, sideSetback: 5, maxHeight: 40 },
    'SF-3': { minLotSize: 7000, frontSetback: 25, sideSetback: 7.5, maxHeight: 40 },
    'SF-4A': { minLotSize: 8500, frontSetback: 25, sideSetback: 10, maxHeight: 40 },
    'SF-5': { minLotSize: 12000, frontSetback: 25, sideSetback: 15, maxHeight: 40 },
    'SF-6': { minLotSize: 1, frontSetback: 25, sideSetback: 20, maxHeight: 40 }
};

// Sample property database (in real app, this would come from an API)
const sampleProperties = {
    '1234 oak street, austin, tx 78704': {
        address: '1234 Oak Street, Austin, TX 78704',
        price: 450000,
        lotSize: 8500,
        zoning: 'SF-3',
        bedrooms: 3,
        bathrooms: 2,
        squareFeet: 1800,
        yearBuilt: 1985
    },
    '5678 elm avenue, austin, tx 78745': {
        address: '5678 Elm Avenue, Austin, TX 78745',
        price: 520000,
        lotSize: 12000,
        zoning: 'SF-4A',
        bedrooms: 4,
        bathrooms: 3,
        squareFeet: 2200,
        yearBuilt: 1992
    },
    '9012 pine road, austin, tx 78702': {
        address: '9012 Pine Road, Austin, TX 78702',
        price: 380000,
        lotSize: 7200,
        zoning: 'SF-3',
        bedrooms: 2,
        bathrooms: 2,
        squareFeet: 1500,
        yearBuilt: 1978
    }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupAddressSearch();
});

// Address search setup
function setupAddressSearch() {
    const addressInput = document.getElementById('addressInput');
    
    // Enable search on Enter key
    addressInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchProperty();
        }
    });
}

function fillExample(address) {
    document.getElementById('addressInput').value = address;
}

function searchProperty() {
    const address = document.getElementById('addressInput').value.trim();
    
    if (!address) {
        alert('Please enter an address.');
        return;
    }
    
    const searchBtn = document.querySelector('.btn-search');
    const originalText = searchBtn.innerHTML;
    searchBtn.innerHTML = '<span class="loading"></span> Searching...';
    searchBtn.disabled = true;
    
    // Simulate API call delay
    setTimeout(() => {
        try {
            const property = findProperty(address);
            if (property) {
                currentProperty = property;
                showPropertyInfo(property);
                analyzeProperty();
            } else {
                alert('Property not found. Please try one of the example addresses or check your spelling.');
            }
        } catch (error) {
            alert('Error searching property: ' + error.message);
        } finally {
            searchBtn.innerHTML = originalText;
            searchBtn.disabled = false;
        }
    }, 1500);
}

function findProperty(address) {
    // Normalize address for lookup
    const normalizedAddress = address.toLowerCase().trim();
    
    // Check our sample database
    return sampleProperties[normalizedAddress] || null;
}

function showPropertyInfo(property) {
    const propertyInfo = document.getElementById('propertyInfo');
    const propertyAddress = document.getElementById('propertyAddress');
    const propertyDetails = document.getElementById('propertyDetails');
    
    propertyAddress.textContent = property.address;
    propertyDetails.innerHTML = `
        <strong>Price:</strong> $${property.price.toLocaleString()} • 
        <strong>Lot Size:</strong> ${property.lotSize.toLocaleString()} sq ft • 
        <strong>Zoning:</strong> ${property.zoning} • 
        <strong>Built:</strong> ${property.yearBuilt}<br>
        ${property.bedrooms} bed, ${property.bathrooms} bath • ${property.squareFeet.toLocaleString()} sq ft
    `;
    
    propertyInfo.style.display = 'block';
}

function clearProperty() {
    currentProperty = null;
    analysisResults = null;
    
    const propertyInfo = document.getElementById('propertyInfo');
    const resultsSection = document.getElementById('resultsSection');
    
    propertyInfo.style.display = 'none';
    resultsSection.style.display = 'none';
    
    document.getElementById('addressInput').value = '';
    document.getElementById('exportBtn').disabled = true;
}

function analyzeProperty() {
    if (!currentProperty) return;
    
    // Get configuration values
    const config = {
        maxPrice: parseFloat(document.getElementById('maxPrice').value) || 500000,
        minLotSize: parseFloat(document.getElementById('minLotSize').value) || 7000,
        targetProfit: parseFloat(document.getElementById('targetProfit').value) || 20,
        renovationBudget: parseFloat(document.getElementById('renovationBudget').value) || 100000
    };
    
    // Analyze the single property
    const analysis = analyzeSingleProperty(currentProperty, config);
    
    if (analysis) {
        analysisResults = [analysis];
        displayResults(analysisResults);
        document.getElementById('exportBtn').disabled = false;
    } else {
        displayResults([]);
    }
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
            const price = parseFloat(property[field].replace(/[$,]/g, ''));
            if (!isNaN(price)) return price;
        }
    }
    return null;
}

function extractLotSize(property) {
    const lotFields = ['lot size', 'lot size sqft', 'lot sq ft', 'lot area', 'land area'];
    for (const field of lotFields) {
        if (property[field]) {
            const size = parseFloat(property[field].replace(/[,\s]/g, ''));
            if (!isNaN(size)) return size;
        }
    }
    return null;
}

function extractAddress(property) {
    const addressFields = ['address', 'street address', 'property address', 'full address'];
    for (const field of addressFields) {
        if (property[field]) {
            return property[field];
        }
    }
    return 'Address not available';
}

function extractZoning(property) {
    const zoningFields = ['zoning', 'zone', 'zoning code'];
    for (const field of zoningFields) {
        if (property[field]) {
            return property[field].toUpperCase();
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
        clearProperty();
        
        // Reset configuration to defaults
        document.getElementById('maxPrice').value = '500000';
        document.getElementById('minLotSize').value = '7000';
        document.getElementById('targetProfit').value = '20';
        document.getElementById('renovationBudget').value = '100000';
    }
} 