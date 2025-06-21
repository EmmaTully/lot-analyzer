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

// Property Data Service for API Integration
class PropertyDataService {
    constructor() {
        this.cache = new Map();
        this.rateLimiter = new Map();
        this.maxRequestsPerMinute = 60;
        this.apiKeys = {
            rentcast: '', // Add your API key
            attom: '',    // Add your API key
            // Travis County doesn't require a key
        };
    }

    async searchProperty(address) {
        // Check cache first
        if (this.cache.has(address)) {
            return this.cache.get(address);
        }

        // Check rate limits
        if (this.isRateLimited()) {
            throw new Error('Too many requests. Please wait a moment.');
        }

        try {
            // Try real Austin GIS data first
            let property = await this.tryExternalAPIs(address);
            
            if (property) {
                property.dataSource = 'austin-gis';
                this.cache.set(address, property);
                return property;
            }
            
            // If real data not found, try demo data
            property = await this.tryDemoData(address);
            
            if (property) {
                property.dataSource = 'demo';
                this.cache.set(address, property);
                return property;
            }
            
            // If neither found, create a minimal property for demo purposes
            // This allows the user to still see the analysis features
            const minimalProperty = {
                address: address,
                price: 500000, // Default price
                lotSize: 7500, // Default lot size
                zoning: 'SF-3',
                bedrooms: 3,
                bathrooms: 2,
                squareFeet: 1800,
                yearBuilt: 1990,
                dataSource: 'estimated',
                note: 'Property data not found - using estimated values for demonstration'
            };
            
            this.cache.set(address, minimalProperty);
            return minimalProperty;
            
        } catch (error) {
            throw error;
        }
    }

    isRateLimited() {
        const now = Date.now();
        const minuteAgo = now - 60000;
        
        // Clean old entries
        for (const [time, count] of this.rateLimiter) {
            if (time < minuteAgo) {
                this.rateLimiter.delete(time);
            }
        }
        
        // Count recent requests
        let recentRequests = 0;
        for (const [time, count] of this.rateLimiter) {
            recentRequests += count;
        }
        
        if (recentRequests >= this.maxRequestsPerMinute) {
            return true;
        }
        
        // Add current request
        this.rateLimiter.set(now, (this.rateLimiter.get(now) || 0) + 1);
        return false;
    }

    async tryDemoData(address) {
        // Demo properties for testing
        const demoProperties = [
            {
                address: "1234 Oak Street, Austin, TX 78704",
                price: 450000,
                lotSize: 8500,
                zoning: 'SF-3',
                bedrooms: 3,
                bathrooms: 2,
                squareFeet: 1800,
                yearBuilt: 1985,
                lotDimensions: { width: 85, depth: 100, source: 'demo' }
            },
            {
                address: "5678 Elm Avenue, Austin, TX 78745",
                price: 520000,
                lotSize: 15000,
                zoning: 'SF-4A',
                bedrooms: 4,
                bathrooms: 3,
                squareFeet: 2200,
                yearBuilt: 1992,
                lotDimensions: { width: 100, depth: 150, source: 'demo' }
            },
            {
                address: "789 Cedar Lane, Austin, TX 78703",
                price: 950000,
                lotSize: 10500,
                zoning: 'SF-3',
                bedrooms: 3,
                bathrooms: 2,
                squareFeet: 1650,
                yearBuilt: 1982,
                lotDimensions: { width: 70, depth: 150, source: 'demo' }
            }
        ];

        // Simple fuzzy matching
        const normalizedInput = address.toLowerCase().replace(/[,.\s]+/g, ' ').trim();
        
        for (const prop of demoProperties) {
            const normalizedProp = prop.address.toLowerCase().replace(/[,.\s]+/g, ' ').trim();
            if (normalizedProp.includes(normalizedInput) || normalizedInput.includes(normalizedProp)) {
                return prop;
            }
        }
        
        return null;
    }

    async tryExternalAPIs(address) {
        // Try Austin GIS service first
        try {
            const parcelData = await austinGIS.searchParcelByAddress(address);
            if (parcelData) {
                // Get additional data
                const center = this.getParcelCenter(parcelData.geometry);
                const zoningInfo = await austinGIS.getZoningInfo(center.lat, center.lon);
                const historicInfo = await austinGIS.checkHistoricDistrict(center.lat, center.lon);
                
                return {
                    address: parcelData.address,
                    price: parcelData.totalValue,
                    lotSize: parcelData.lotSize,
                    zoning: zoningInfo?.district || parcelData.zoning,
                    bedrooms: 0, // Not available from parcel data
                    bathrooms: 0, // Not available from parcel data
                    squareFeet: 0, // Would need to calculate from improvement value
                    yearBuilt: parcelData.yearBuilt,
                    lotDimensions: null, // Would need to calculate from geometry
                    parcelData: parcelData,
                    zoningInfo: zoningInfo,
                    historicInfo: historicInfo
                };
            }
        } catch (error) {
            console.warn('Austin GIS error:', error);
        }
        
        return null;
    }
    
    getParcelCenter(geometry) {
        // Simple center calculation for polygon
        if (geometry && geometry.rings && geometry.rings[0]) {
            const ring = geometry.rings[0];
            let sumX = 0, sumY = 0;
            for (const point of ring) {
                sumX += point[0];
                sumY += point[1];
            }
            return {
                lon: sumX / ring.length,
                lat: sumY / ring.length
            };
        }
        return { lat: 30.2672, lon: -97.7431 }; // Austin center as fallback
    }

    formatTravisCountyData(data) {
        if (!data.properties || data.properties.length === 0) return null;
        
        const prop = data.properties[0];
        return {
            address: prop.siteAddress,
            price: prop.marketValue,
            lotSize: prop.landSqFt,
            zoning: prop.zoning || 'SF-3',
            bedrooms: prop.bedrooms || 0,
            bathrooms: prop.bathrooms || 0,
            squareFeet: prop.improvementSqFt || 0,
            yearBuilt: prop.yearBuilt || 0,
            // Travis County doesn't provide dimensions, so we'd need to estimate
            lotDimensions: null
        };
    }
}

// Initialize the property data service
const propertyDataService = new PropertyDataService();

// Austin GIS Service Integration
class AustinGISService {
    constructor() {
        // Austin's ArcGIS REST endpoints
        this.endpoints = {
            parcels: 'https://services.arcgis.com/0L95CJ0VTaxqcmED/ArcGIS/rest/services/ParcelSearchTable/FeatureServer/0',
            zoning: 'https://services.arcgis.com/0L95CJ0VTaxqcmED/ArcGIS/rest/services/ZONING_ORDINANCE/FeatureServer/0',
            historicDistricts: 'https://services.arcgis.com/0L95CJ0VTaxqcmED/ArcGIS/rest/services/HP_Districts/FeatureServer/0',
            trees: 'https://services.arcgis.com/0L95CJ0VTaxqcmED/ArcGIS/rest/services/ENVIRONMENTAL_HERITAGE_TREES/FeatureServer/0'
        };
        
        this.map = null;
        this.currentProperty = null;
    }
    
    async searchParcelByAddress(address) {
        try {
            // Format address for query - try multiple formats
            const searchAddress = address.toUpperCase()
                .replace(/,/g, '')
                .replace(/AVENUE/g, 'AVE')
                .replace(/STREET/g, 'ST')
                .replace(/ROAD/g, 'RD')
                .replace(/DRIVE/g, 'DR')
                .replace(/LANE/g, 'LN')
                .replace(/BOULEVARD/g, 'BLVD')
                .trim();
            
            // Extract just the street number and name for a more flexible search
            const addressParts = searchAddress.match(/^(\d+)\s+(.+?)(?:\s+AUSTIN|\s+TX|\s+\d{5}|$)/);
            let queryString = searchAddress;
            
            if (addressParts) {
                const streetNumber = addressParts[1];
                const streetName = addressParts[2];
                // Try searching with just street number and partial street name
                queryString = `${streetNumber} ${streetName}`;
            }
            
            console.log('Searching for address:', queryString);
            
            // Query Austin's parcel service with a more flexible search
            const austinUrl = `${this.endpoints.parcels}/query?where=FULL_STREET_NAME LIKE '%${encodeURIComponent(queryString)}%' OR SitusAddress LIKE '%${encodeURIComponent(queryString)}%'&outFields=*&f=json&resultRecordCount=10`;
            
            // Use proxy to handle CORS
            const proxyUrl = window.location.hostname === 'localhost' 
                ? `http://localhost:3000/proxy?url=${encodeURIComponent(austinUrl)}`
                : `https://corsproxy.io/?${encodeURIComponent(austinUrl)}`;
            
            console.log('Fetching from:', proxyUrl);
            
            const response = await fetch(proxyUrl);
            const data = await response.json();
            
            console.log('Austin GIS response:', data);
            
            if (data.features && data.features.length > 0) {
                // If multiple results, try to find best match
                let bestMatch = data.features[0];
                if (data.features.length > 1) {
                    // Look for exact match
                    for (const feature of data.features) {
                        const fullStreet = feature.attributes.FULL_STREET_NAME || '';
                        if (fullStreet.includes(queryString)) {
                            bestMatch = feature;
                            break;
                        }
                    }
                }
                return this.formatParcelData(bestMatch);
            }
            
            // Try alternative search if first attempt fails
            if (addressParts) {
                const streetNumber = addressParts[1];
                const streetNameWords = addressParts[2].split(' ');
                
                // Try with just the first word of street name
                if (streetNameWords.length > 0) {
                    const simpleQuery = `${streetNumber} ${streetNameWords[0]}`;
                    const altUrl = `${this.endpoints.parcels}/query?where=FULL_STREET_NAME LIKE '%${encodeURIComponent(simpleQuery)}%'&outFields=*&f=json&resultRecordCount=10`;
                    const altProxyUrl = window.location.hostname === 'localhost' 
                        ? `http://localhost:3000/proxy?url=${encodeURIComponent(altUrl)}`
                        : `https://corsproxy.io/?${encodeURIComponent(altUrl)}`;
                    
                    const altResponse = await fetch(altProxyUrl);
                    const altData = await altResponse.json();
                    
                    if (altData.features && altData.features.length > 0) {
                        return this.formatParcelData(altData.features[0]);
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.error('Parcel search error:', error);
            return null;
        }
    }
    
    formatParcelData(feature) {
        const attrs = feature.attributes;
        return {
            parcelId: attrs.TCAD_PROP_ID,
            address: attrs.FULL_STREET_NAME,
            owner: attrs.OWNER_NAME,
            lotSize: attrs.SHAPE_Area, // Square feet
            zoning: attrs.ZONING,
            landValue: attrs.LAND_VALUE,
            improvementValue: attrs.IMPROVEMENT_VALUE,
            totalValue: attrs.TOTAL_VALUE,
            yearBuilt: attrs.YEAR_BUILT,
            geometry: feature.geometry
        };
    }
    
    async getZoningInfo(lat, lon) {
        try {
            const austinUrl = `${this.endpoints.zoning}/query?geometry=${lon},${lat}&geometryType=esriGeometryPoint&outFields=*&f=json`;
            const url = `https://corsproxy.io/?${encodeURIComponent(austinUrl)}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.features && data.features.length > 0) {
                const zoning = data.features[0].attributes;
                return {
                    district: zoning.ZONING_ZTYPE,
                    description: zoning.DESCRIPTION,
                    minLotSize: this.getMinLotSize(zoning.ZONING_ZTYPE),
                    setbacks: this.getSetbackRequirements(zoning.ZONING_ZTYPE)
                };
            }
            return null;
        } catch (error) {
            console.error('Zoning query error:', error);
            return null;
        }
    }
    
    getMinLotSize(zoningCode) {
        // Austin's actual minimum lot sizes
        const minSizes = {
            'SF-1': 10000,
            'SF-2': 5750,
            'SF-3': 5750,
            'SF-4A': 4500,
            'SF-4B': 3600,
            'SF-5': 1500, // Small lot
            'SF-6': 3500  // Townhouse
        };
        return minSizes[zoningCode] || 5750;
    }
    
    getSetbackRequirements(zoningCode) {
        // Austin's actual setback requirements
        const setbacks = {
            'SF-1': { front: 25, side: 5, rear: 10, sideStreet: 15 },
            'SF-2': { front: 25, side: 5, rear: 10, sideStreet: 15 },
            'SF-3': { front: 25, side: 5, rear: 10, sideStreet: 15 },
            'SF-4A': { front: 15, side: 5, rear: 10, sideStreet: 10 },
            'SF-4B': { front: 10, side: 5, rear: 10, sideStreet: 10 },
            'SF-5': { front: 10, side: 5, rear: 5, sideStreet: 10 },
            'SF-6': { front: 10, side: 0, rear: 5, sideStreet: 10 }
        };
        return setbacks[zoningCode] || setbacks['SF-3'];
    }
    
    async checkHistoricDistrict(lat, lon) {
        try {
            const austinUrl = `${this.endpoints.historicDistricts}/query?geometry=${lon},${lat}&geometryType=esriGeometryPoint&outFields=*&f=json`;
            const url = `https://corsproxy.io/?${encodeURIComponent(austinUrl)}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.features && data.features.length > 0) {
                return {
                    inHistoricDistrict: true,
                    districtName: data.features[0].attributes.NAME,
                    restrictions: 'Lot splits require Historic Landmark Commission approval'
                };
            }
            return { inHistoricDistrict: false };
        } catch (error) {
            console.error('Historic district query error:', error);
            return { inHistoricDistrict: false };
        }
    }
    
    async checkProtectedTrees(geometry) {
        try {
            // Query for protected trees within the property
            const austinUrl = `${this.endpoints.trees}/query?geometry=${JSON.stringify(geometry)}&geometryType=esriGeometryPolygon&outFields=*&f=json`;
            const url = `https://corsproxy.io/?${encodeURIComponent(austinUrl)}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.features && data.features.length > 0) {
                return {
                    hasProtectedTrees: true,
                    treeCount: data.features.length,
                    trees: data.features.map(f => ({
                        diameter: f.attributes.DIAMETER,
                        species: f.attributes.SPECIES,
                        condition: f.attributes.CONDITION
                    }))
                };
            }
            return { hasProtectedTrees: false };
        } catch (error) {
            console.error('Tree query error:', error);
            return { hasProtectedTrees: false };
        }
    }
}

// Initialize GIS service
const austinGIS = new AustinGISService();

// Map functionality
let map = null;
let propertyLayer = null;
let zoningLayer = null;

function initializeMap(property) {
    // Only initialize if we have coordinates
    if (!property.geometry) return;
    
    const mapSection = document.getElementById('mapSection');
    mapSection.style.display = 'block';
    
    // Initialize Mapbox - you'll need to add your own token
    mapboxgl.accessToken = 'YOUR_MAPBOX_TOKEN'; // Need to set this
    
    if (!map) {
        map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [-97.7431, 30.2672], // Austin center
            zoom: 17
        });
        
        map.on('load', () => {
            // Add property boundary
            addPropertyBoundary(property);
            
            // Add lot split visualization
            if (property.canSplit) {
                addLotSplitVisualization(property);
            }
        });
    }
}

function addPropertyBoundary(property) {
    // This would add the actual parcel geometry from Austin GIS
    // For now, showing the concept
    console.log('Adding property boundary:', property.address);
}

function toggleZoning() {
    // Toggle Austin zoning layer
    console.log('Toggling zoning layer');
}

function toggleUtilities() {
    // Toggle utility lines
    console.log('Toggling utilities layer');
}

function toggleTrees() {
    // Toggle protected trees
    console.log('Toggling trees layer');
}

// Global variables
let uploadedData = null;
let analysisResults = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Austin Lot Analyzer v2.0 - Show All Properties');
    setupFileUpload();
});

// Analyze single address function
async function analyzeAddress() {
    const addressInput = document.getElementById('addressInput');
    const address = addressInput.value.trim();
    
    if (!address) {
        showAddressError('Please enter a property address');
        return;
    }
    
    // Hide any previous errors
    document.getElementById('addressError').style.display = 'none';
    
    // Show loading state
    const loadingDiv = document.getElementById('addressLoading');
    loadingDiv.style.display = 'flex';
    
    try {
        // Fetch property data
        const property = await propertyDataService.searchProperty(address);
        
        // Update status message based on data source
        const apiStatus = document.getElementById('apiStatus');
        if (property && property.dataSource === 'austin-gis') {
            apiStatus.textContent = '✓ Connected to Austin GIS - Using real property data';
            apiStatus.style.color = '#38a169'; // Green
            apiStatus.style.display = 'block';
        } else if (property && property.dataSource === 'demo') {
            apiStatus.textContent = 'ℹ️ Using demo data - Address matches a demo property';
            apiStatus.style.color = '#3182ce'; // Blue
            apiStatus.style.display = 'block';
        } else if (property && property.dataSource === 'estimated') {
            apiStatus.textContent = '⚠️ Property not found in Austin GIS - Using estimated values for demonstration';
            apiStatus.style.color = '#f59e0b'; // Orange
            apiStatus.style.display = 'block';
        }
        
        // If property has a note (e.g., for estimated data), display it
        if (property && property.note) {
            const noteDiv = document.createElement('div');
            noteDiv.className = 'property-note';
            noteDiv.style.cssText = 'background: #fffbeb; border: 1px solid #fbbf24; padding: 12px; border-radius: 8px; margin: 16px 0; color: #92400e; font-size: 0.875rem;';
            noteDiv.innerHTML = `<strong>Note:</strong> ${property.note}`;
            
            // Insert after the address search section
            const addressSection = document.querySelector('.address-search-section');
            if (addressSection && !document.querySelector('.property-note')) {
                addressSection.after(noteDiv);
            }
        }
        
        // Configure analysis parameters (using defaults)
        const config = {
            maxPrice: 900000,
            minLotSize: 11500,
            targetProfit: 20,
            renovationBudget: 100000
        };
        
        // Analyze the property
        const analysis = analyzeSingleProperty(property, config);
        
        if (!analysis) {
            throw new Error('Unable to analyze this property');
        }
        
        // Display results as single-property table
        analysisResults = [analysis];
        displayResults(analysisResults);
        
        // Scroll to results
        document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        showAddressError(error.message || 'Failed to analyze property');
    } finally {
        loadingDiv.style.display = 'none';
    }
}

function showAddressError(message) {
    const errorDiv = document.getElementById('addressError');
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    errorDiv.style.display = 'flex';
}

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
                lotDimensions: extractLotDimensions(property),
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
                lotDimensions: extractLotDimensions(property),
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
    const realZoningAnalysis = performRealAustinZoningAnalysis(property, property.lotDimensions);
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
        squareFeet: property.squareFeet, // Add square feet to results
        splitAnalysis: splitAnalysis,
        realZoningAnalysis: realZoningAnalysis, // Add real Austin analysis
        financialAnalysis: financialAnalysis,
        score: score,
        status: status,
        canSplit: realZoningAnalysis.canSplit, // Use real analysis
        maxPotentialLots: realZoningAnalysis.splitResults ? realZoningAnalysis.splitResults.maxPotentialLots : 1, // Add max potential lots
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
            // Remove quotes, dollar signs, and commas
            const cleanValue = property[field].toString().replace(/["'$,]/g, '').trim();
            const price = parseFloat(cleanValue);
            if (!isNaN(price)) return price;
        }
    }
    return null;
}

function extractLotSize(property) {
    const lotFields = ['lot size', 'lot size sqft', 'lot sq ft', 'lot area', 'land area'];
    for (const field of lotFields) {
        if (property[field]) {
            // Remove quotes, commas, and extra spaces
            const cleanValue = property[field].toString().replace(/["',]/g, '').trim();
            const size = parseFloat(cleanValue);
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
            // Remove quotes, commas, and extra spaces
            const cleanValue = property[field].toString().replace(/["',]/g, '').trim();
            const sqft = parseInt(cleanValue);
            if (!isNaN(sqft)) return sqft;
        }
    }
    return 0;
}

// Extract lot dimensions from property data
function extractLotDimensions(property) {
    // Check for explicit dimension fields
    if (property['lot width'] && property['lot depth']) {
        return {
            width: parseFloat(property['lot width']),
            depth: parseFloat(property['lot depth']),
            source: 'explicit'
        };
    }
    
    // Look for dimensions in description or lot size fields
    const fieldsToCheck = [
        'lot dimensions', 'dimensions', 'lot size', 'lot description', 
        'description', 'remarks', 'property description'
    ];
    
    for (const field of fieldsToCheck) {
        if (property[field]) {
            // Match patterns like "100x150", "100 x 150", "100'x150'", "100 X 150"
            const dimPattern = /(\d+\.?\d*)\s*[\'']?\s*[xX]\s*(\d+\.?\d*)\s*[\'']?/;
            const match = property[field].toString().match(dimPattern);
            
            if (match) {
                const width = parseFloat(match[1]);
                const depth = parseFloat(match[2]);
                
                // Verify dimensions make sense (multiply to roughly equal lot size)
                const calculatedSize = width * depth;
                const actualSize = property.lotSize || extractLotSize(property);
                const tolerance = 0.2; // 20% tolerance
                
                if (actualSize && Math.abs(calculatedSize - actualSize) / actualSize <= tolerance) {
                    return {
                        width: width,
                        depth: depth,
                        source: 'parsed'
                    };
                }
            }
        }
    }
    
    return null;
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
        
        // Maximum potential lots
        const maxLots = result.maxPotentialLots || 1;
        const maxLotsDisplay = maxLots > 2 ? `${maxLots} lots` : (canSplit ? '2 lots' : '1 lot');
        
        // Calculate potential buildable square footage
        const lot1BuildableSqFt = canSplit && splitData ? 
            Math.floor(calculateRealBuildableArea(result.realZoningAnalysis.zoningRules.minLotSize, result.realZoningAnalysis.zoningRules, result.realZoningAnalysis.lotDimensions) * 0.6).toLocaleString() : 
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
                <td class="max-lots-cell">${maxLotsDisplay}</td>
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
                    <th>Max Splits</th>
                    <th>After Split (2 lots)</th>
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
    
    // Generate plot map SVG
    const plotMapHTML = generatePlotMap(result);
    
    let detailsHTML = `
        <h2>🏠 ${result.address}</h2>
        <div class="property-details">
            ${plotMapHTML}
            <div class="detail-section">
                <h3>📋 Austin Zoning Analysis</h3>
                <p><strong>Zoning:</strong> ${result.zoning} - ${result.realZoningAnalysis.zoningRules.description}</p>
                <p><strong>Lot Size:</strong> ${result.lotSize.toLocaleString()} sq ft</p>
                ${result.realZoningAnalysis.lotDimensions ? `
                <p><strong>Lot Dimensions:</strong> ${result.realZoningAnalysis.lotDimensions.width.toFixed(0)}' × ${result.realZoningAnalysis.lotDimensions.depth.toFixed(0)}' 
                    <span style="color: #666; font-size: 0.9em;">(${result.realZoningAnalysis.lotDimensions.source})</span></p>
                ` : ''}
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
                    <p><strong>Maximum Potential Lots:</strong> ${split.maxPotentialLots} lots (based on ${zoningRules.minLotSize.toLocaleString()} sq ft minimum)</p>
                    <p><strong>Current Analysis (2-lot split):</strong></p>
                    <p><strong>Lot 1 Size:</strong> ${zoningRules.minLotSize.toLocaleString()} sq ft (minimum for ${result.zoning})</p>
                    <p><strong>Lot 2 Size:</strong> ${split.newLotSize.toLocaleString()} sq ft</p>
                    ${split.maxPotentialLots > 2 ? `
                    <div style="background: #f0f9ff; border: 1px solid #0ea5e9; padding: 10px; margin: 10px 0; border-radius: 5px;">
                        <strong>💡 Note:</strong> This property could potentially be split into ${split.maxPotentialLots} lots. 
                        Consider consulting with a developer or city planner for optimal subdivision strategy.
                    </div>` : ''}
                    
                    <h5>Buildable Area Analysis:</h5>
                    <p><strong>Lot 1 Buildable Area:</strong> ${Math.floor(calculateRealBuildableArea(zoningRules.minLotSize, zoningRules, result.realZoningAnalysis.lotDimensions)).toLocaleString()} sq ft</p>
                    <p><strong>Lot 1 Max House Size:</strong> ${Math.floor(calculateRealBuildableArea(zoningRules.minLotSize, zoningRules, result.realZoningAnalysis.lotDimensions) * 0.6).toLocaleString()} sq ft (60% coverage)</p>
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
    let actualWidth;
    let widthSource = 'estimated';
    
    if (lotDimensions && lotDimensions.width) {
        actualWidth = lotDimensions.width;
        widthSource = lotDimensions.source;
    } else {
        // Estimate if no dimensions provided
        actualWidth = Math.sqrt(property.lotSize * 1.5); // Assume 1.5:1 depth ratio
    }
    
    const minWidthForTwoLots = zoningRules.minLotWidth * 2 + 10; // 10ft between lots
    if (actualWidth < minWidthForTwoLots) {
        analysis.reasons.push(`Insufficient width: ${widthSource === 'estimated' ? 'Est. ' : ''}${actualWidth.toFixed(0)}ft < ${minWidthForTwoLots}ft required`);
        return analysis;
    }
    
    // 3. Street Frontage Check
    if (actualWidth < austinSubdivisionRules.minStreetFrontage * 2) {
        analysis.reasons.push(`Insufficient street frontage for two lots`);
        return analysis;
    }
    
    // Store dimensions info for later use
    analysis.lotDimensions = lotDimensions || { width: actualWidth, depth: property.lotSize / actualWidth, source: 'estimated' };
    
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
        
        // Calculate maximum number of potential splits
        const totalUsableArea = property.lotSize * 0.95; // 5% for utilities/easements
        const maxPotentialLots = Math.floor(totalUsableArea / zoningRules.minLotSize);
        
        // For now, still calculate as 2-lot split (can be enhanced later for multi-splits)
        const newLotSize = Math.floor(totalUsableArea - zoningRules.minLotSize);
        const buildableArea = calculateRealBuildableArea(newLotSize, zoningRules, analysis.lotDimensions);
        
        analysis.splitResults = {
            originalLotSize: property.lotSize,
            remainingLotSize: zoningRules.minLotSize,
            newLotSize: newLotSize,
            buildableArea: buildableArea,
            maxHouseSize: Math.floor(buildableArea * 0.6), // 60% lot coverage typical
            estimatedUtilityCost: utilityAnalysis.estimatedCost,
            maxPotentialLots: maxPotentialLots // Add maximum potential lots
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

function calculateRealBuildableArea(lotSize, zoningRules, dimensions) {
    // More realistic buildable area calculation
    let width, depth;
    
    if (dimensions && dimensions.width && dimensions.depth) {
        // Use actual dimensions if available
        width = dimensions.width;
        depth = dimensions.depth;
    } else {
        // Estimate if not available
        width = Math.sqrt(lotSize * 1.2); // Assume 1.2:1 ratio
        depth = lotSize / width;
    }
    
    // Account for all setbacks
    const buildableWidth = Math.max(0, width - (2 * zoningRules.sideSetback));
    const buildableDepth = Math.max(0, depth - zoningRules.frontSetback - zoningRules.rearSetback);
    
    const grossBuildableArea = buildableWidth * buildableDepth;
    
    // Reduce for utilities, easements, and irregular shapes
    const netBuildableArea = grossBuildableArea * 0.8; // 20% reduction for real-world constraints
    
    return Math.max(0, netBuildableArea);
}

function generatePlotMap(result) {
    const dims = result.realZoningAnalysis.lotDimensions;
    if (!dims || !dims.width || !dims.depth) {
        return '<div class="plot-map-container"><p style="text-align: center; color: #718096;">Plot map not available - lot dimensions needed</p></div>';
    }
    
    const zoningRules = result.realZoningAnalysis.zoningRules;
    const canSplit = result.canSplit;
    
    // SVG dimensions and scale
    const svgWidth = 600;
    const svgHeight = 400;
    const padding = 40;
    
    // Calculate scale to fit the lot in the SVG
    const scaleX = (svgWidth - 2 * padding) / dims.width;
    const scaleY = (svgHeight - 2 * padding) / dims.depth;
    const scale = Math.min(scaleX, scaleY);
    
    // Scaled dimensions
    const lotWidth = dims.width * scale;
    const lotHeight = dims.depth * scale;
    const offsetX = (svgWidth - lotWidth) / 2;
    const offsetY = (svgHeight - lotHeight) / 2;
    
    // Setback dimensions
    const frontSetback = zoningRules.frontSetback * scale;
    const rearSetback = zoningRules.rearSetback * scale;
    const sideSetback = zoningRules.sideSetback * scale;
    
    // Buildable area
    const buildableX = offsetX + sideSetback;
    const buildableY = offsetY + frontSetback;
    const buildableWidth = lotWidth - 2 * sideSetback;
    const buildableHeight = lotHeight - frontSetback - rearSetback;
    
    // Current house footprint (if we have square footage)
    let houseFootprint = '';
    if (result.squareFeet > 0) {
        // Estimate house footprint as 40% of total square footage (accounting for multiple floors)
        const footprintSqFt = result.squareFeet * 0.5;
        const footprintRatio = footprintSqFt / result.lotSize;
        const houseWidth = Math.sqrt(footprintSqFt * 1.2) * scale; // Assume 1.2:1 ratio
        const houseDepth = (footprintSqFt / Math.sqrt(footprintSqFt * 1.2)) * scale;
        
        // Center the house in the buildable area
        const houseX = buildableX + (buildableWidth - houseWidth) / 2;
        const houseY = buildableY + (buildableHeight - houseDepth) / 2;
        
        houseFootprint = `
                <!-- Current house footprint -->
                <rect x="${houseX}" y="${houseY}" width="${houseWidth}" height="${houseDepth}" 
                      fill="#e53e3e" fill-opacity="0.3" stroke="#e53e3e" stroke-width="1"/>
                <text x="${houseX + houseWidth/2}" y="${houseY + houseDepth/2}" 
                      text-anchor="middle" font-family="Arial" font-size="12" fill="#c53030">
                    House
                </text>
        `;
    }
    
    let svg = `
        <div class="plot-map-container">
            <h3>📍 Property Plot Map</h3>
            
            <!-- Property Summary -->
            <div style="background: #fff; padding: 15px; border-radius: 6px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div>
                        <span style="color: #718096; font-size: 0.875rem;">Lot Size</span>
                        <div style="font-weight: 600; color: #2d3748;">${result.lotSize.toLocaleString()} sq ft</div>
                    </div>
                    <div>
                        <span style="color: #718096; font-size: 0.875rem;">Dimensions</span>
                        <div style="font-weight: 600; color: #2d3748;">${dims.width.toFixed(0)}' × ${dims.depth.toFixed(0)}'</div>
                    </div>
                    <div>
                        <span style="color: #718096; font-size: 0.875rem;">Zoning</span>
                        <div style="font-weight: 600; color: #2d3748;">${result.zoning}</div>
                    </div>
                    <div>
                        <span style="color: #718096; font-size: 0.875rem;">Can Split</span>
                        <div style="font-weight: 600; color: ${canSplit ? '#10b981' : '#ef4444'};">${canSplit ? '✓ Yes' : '✗ No'}</div>
                    </div>
                </div>
            </div>
            
            <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" style="background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                <!-- Property boundary -->
                <rect x="${offsetX}" y="${offsetY}" width="${lotWidth}" height="${lotHeight}" 
                      fill="none" stroke="#2d3748" stroke-width="2"/>
                
                <!-- Setback lines -->
                <rect x="${buildableX}" y="${buildableY}" width="${buildableWidth}" height="${buildableHeight}" 
                      fill="none" stroke="#667eea" stroke-width="1" stroke-dasharray="5,5"/>
                
                <!-- Buildable area -->
                <rect x="${buildableX}" y="${buildableY}" width="${buildableWidth}" height="${buildableHeight}" 
                      fill="#667eea" fill-opacity="0.1"/>
                
                ${houseFootprint}
    `;
    
    // Add lot split visualization if property can be split
    if (canSplit && result.realZoningAnalysis.splitResults) {
        const minLotSize = zoningRules.minLotSize;
        const splitRatio = minLotSize / result.lotSize;
        const splitLineY = offsetY + (lotHeight * splitRatio);
        
        svg += `
                <!-- Lot split line -->
                <line x1="${offsetX}" y1="${splitLineY}" x2="${offsetX + lotWidth}" y2="${splitLineY}" 
                      stroke="#f59e0b" stroke-width="2" stroke-dasharray="10,5"/>
                
                <!-- Lot 1 label -->
                <text x="${offsetX + lotWidth/2}" y="${offsetY + splitLineY/2}" 
                      text-anchor="middle" font-family="Arial" font-size="14" fill="#4a5568">
                    Lot 1: ${minLotSize.toLocaleString()} sq ft
                </text>
                
                <!-- Lot 2 label -->
                <text x="${offsetX + lotWidth/2}" y="${(splitLineY + offsetY + lotHeight)/2}" 
                      text-anchor="middle" font-family="Arial" font-size="14" fill="#4a5568">
                    Lot 2: ${result.realZoningAnalysis.splitResults.newLotSize.toLocaleString()} sq ft
                </text>
        `;
    }
    
    // Add dimension labels
    svg += `
                <!-- Width label -->
                <text x="${offsetX + lotWidth/2}" y="${offsetY - 10}" 
                      text-anchor="middle" font-family="Arial" font-size="12" fill="#2d3748">
                    ${dims.width.toFixed(0)}'
                </text>
                
                <!-- Depth label -->
                <text x="${offsetX - 25}" y="${offsetY + lotHeight/2}" 
                      text-anchor="middle" font-family="Arial" font-size="12" fill="#2d3748"
                      transform="rotate(-90 ${offsetX - 25} ${offsetY + lotHeight/2})">
                    ${dims.depth.toFixed(0)}'
                </text>
                
                <!-- Setback labels -->
                <text x="${offsetX + 5}" y="${offsetY + frontSetback - 5}" 
                      font-family="Arial" font-size="10" fill="#667eea">
                    Front: ${zoningRules.frontSetback}'
                </text>
                
                <text x="${buildableX + 5}" y="${offsetY + lotHeight - 5}" 
                      font-family="Arial" font-size="10" fill="#667eea">
                    Rear: ${zoningRules.rearSetback}'
                </text>
                
                <text x="${offsetX + 5}" y="${buildableY + buildableHeight/2}" 
                      font-family="Arial" font-size="10" fill="#667eea"
                      transform="rotate(-90 ${offsetX + 5} ${buildableY + buildableHeight/2})">
                    Side: ${zoningRules.sideSetback}'
                </text>
            </svg>
            
            <!-- Legend -->
            <div class="plot-map-legend">
                <div class="legend-item">
                    <svg width="20" height="20">
                        <rect x="0" y="0" width="20" height="20" fill="none" stroke="#2d3748" stroke-width="2"/>
                    </svg>
                    <span>Property Boundary</span>
                </div>
                <div class="legend-item">
                    <svg width="20" height="20">
                        <rect x="0" y="0" width="20" height="20" fill="none" stroke="#667eea" stroke-width="1" stroke-dasharray="3,2"/>
                    </svg>
                    <span>Setback Lines</span>
                </div>
                <div class="legend-item">
                    <svg width="20" height="20">
                        <rect x="0" y="0" width="20" height="20" fill="#667eea" fill-opacity="0.1"/>
                    </svg>
                    <span>Buildable Area</span>
                </div>
                ${result.squareFeet > 0 ? `
                <div class="legend-item">
                    <svg width="20" height="20">
                        <rect x="0" y="0" width="20" height="20" fill="#e53e3e" fill-opacity="0.3" stroke="#e53e3e" stroke-width="1"/>
                    </svg>
                    <span>Current House</span>
                </div>
                ` : ''}
                ${canSplit ? `
                <div class="legend-item">
                    <svg width="20" height="20">
                        <line x1="0" y1="10" x2="20" y2="10" stroke="#f59e0b" stroke-width="2" stroke-dasharray="5,2"/>
                    </svg>
                    <span>Lot Split Line</span>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    return svg;
} 