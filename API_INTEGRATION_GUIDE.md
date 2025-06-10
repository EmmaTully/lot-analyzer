# 🏠 Real Property Data API Integration Guide

This guide explains how to connect the Austin Lot Analyzer to real property data sources.

## 🎯 Current Status
- ✅ **LIVE**: Travis County API integrated and active!
- **Demo Mode**: 5 sample properties for testing fallback
- **Ready for APIs**: Extensible PropertyDataService class
- **Search Features**: Real property search, exact match, fuzzy matching, API fallback

## 🔌 Recommended APIs

### 1. **RealtyMole API** (Recommended)
**Best for**: Comprehensive property data including lot size, zoning, pricing

```javascript
// Integration example in script.js
async callRealtyMoleAPI(address) {
    const API_KEY = 'your-realtymole-api-key';
    const response = await fetch(`https://api.realtymole.com/v1/properties?address=${encodeURIComponent(address)}`, {
        headers: {
            'X-API-Key': API_KEY
        }
    });
    
    if (response.ok) {
        const data = await response.json();
        return this.formatRealtyMoleData(data);
    }
    return null;
}

formatRealtyMoleData(data) {
    return {
        address: data.address,
        price: data.price || data.estimatedValue,
        lotSize: data.lotSizeSquareFeet,
        zoning: data.zoning,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        squareFeet: data.squareFeet,
        yearBuilt: data.yearBuilt
    };
}
```

**Pricing**: ~$0.50-1.00 per lookup
**Sign up**: https://www.realtymole.com/api

### 2. **Travis County Appraisal District API**
**Best for**: Official Austin property records, lot sizes, zoning

```javascript
async callTravisCountyAPI(address) {
    // Travis County provides free access to property records
    const response = await fetch(`https://api.traviscad.org/v1/property/search?address=${encodeURIComponent(address)}`);
    
    if (response.ok) {
        const data = await response.json();
        return this.formatTravisCountyData(data);
    }
    return null;
}
```

**Pricing**: Free for public records
**Documentation**: https://www.traviscad.org/api-docs

### 3. **Attom Data API**
**Best for**: Comprehensive real estate data, market analytics

```javascript
async callAttomAPI(address) {
    const API_KEY = 'your-attom-api-key';
    const response = await fetch(`https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/address?address1=${encodeURIComponent(address)}`, {
        headers: {
            'apikey': API_KEY
        }
    });
    
    if (response.ok) {
        const data = await response.json();
        return this.formatAttomData(data.property[0]);
    }
    return null;
}
```

**Pricing**: Varies by plan
**Sign up**: https://api.developer.attomdata.com/

## 🛠️ Implementation Steps

### Step 1: Choose Your API
1. **For MVP**: Start with Travis County (free)
2. **For production**: Add RealtyMole or Attom Data
3. **For scale**: Implement multiple APIs with fallbacks

### Step 2: Get API Keys
```javascript
// Add to your environment or config
const API_CONFIG = {
    REALTYMOLE_KEY: 'your-key-here',
    ATTOM_KEY: 'your-key-here',
    // Travis County doesn't require a key
};
```

### Step 3: Update PropertyDataService
```javascript
// In script.js, update the tryExternalAPIs method:
async tryExternalAPIs(address) {
    try {
        // Try APIs in order of preference
        let property = await this.callTravisCountyAPI(address);
        if (property) return property;
        
        property = await this.callRealtyMoleAPI(address);
        if (property) return property;
        
        property = await this.callAttomAPI(address);
        if (property) return property;
        
    } catch (error) {
        console.warn('API call failed:', error);
    }
    
    return null;
}
```

### Step 4: Handle Rate Limits
```javascript
class PropertyDataService {
    constructor() {
        this.rateLimiter = new Map();
        this.maxRequestsPerMinute = 60;
    }
    
    async searchProperty(address) {
        // Check rate limits
        if (this.isRateLimited()) {
            throw new Error('Too many requests. Please wait a moment.');
        }
        
        // Continue with search...
    }
}
```

## 🔍 Data Mapping

Different APIs return data in different formats. Here's how to standardize:

```javascript
// Standard property format for our app
const standardProperty = {
    address: string,
    price: number,
    lotSize: number,        // square feet
    zoning: string,         // SF-2, SF-3, etc.
    bedrooms: number,
    bathrooms: number,
    squareFeet: number,
    yearBuilt: number
};

// API-specific formatters
formatRealtyMoleData(data) { /* ... */ }
formatTravisCountyData(data) { /* ... */ }
formatAttomData(data) { /* ... */ }
```

## 🚀 Quick Start (Travis County)

1. **Update script.js**:
```javascript
async callTravisCountyAPI(address) {
    try {
        const response = await fetch(`https://search.traviscad.org/api/property?address=${encodeURIComponent(address)}`);
        const data = await response.json();
        
        if (data.properties && data.properties.length > 0) {
            const prop = data.properties[0];
            return {
                address: prop.siteAddress,
                price: prop.marketValue,
                lotSize: prop.landSqFt,
                zoning: prop.zoning,
                bedrooms: prop.bedrooms,
                bathrooms: prop.bathrooms,
                squareFeet: prop.improvementSqFt,
                yearBuilt: prop.yearBuilt
            };
        }
    } catch (error) {
        console.warn('Travis County API error:', error);
    }
    return null;
}
```

2. **Enable in tryExternalAPIs**:
```javascript
async tryExternalAPIs(address) {
    // Uncomment this line:
    const countyData = await this.callTravisCountyAPI(address);
    if (countyData) return countyData;
    
    return null;
}
```

## 📊 Testing Your Integration

1. **Test with known addresses**:
   - 123 E 6th St, Austin, TX 78701
   - 1600 Barton Springs Rd, Austin, TX 78704

2. **Check data quality**:
   - Verify lot sizes are reasonable
   - Ensure zoning codes are valid
   - Confirm prices are current

3. **Handle edge cases**:
   - Invalid addresses
   - Properties not found
   - API timeouts

## 💡 Pro Tips

1. **Cache results** to avoid repeated API calls
2. **Implement fallbacks** - if one API fails, try another
3. **Validate data** - ensure lot sizes and prices are reasonable
4. **Add loading states** - API calls can take 1-3 seconds
5. **Monitor usage** - track API costs and rate limits

## 🔒 Security Notes

- **Never expose API keys** in client-side code
- **Use environment variables** for sensitive data
- **Implement rate limiting** to prevent abuse
- **Consider a backend proxy** for production apps

## 📈 Next Steps

1. **Start with Travis County** (free, Austin-specific)
2. **Add error handling** and user feedback
3. **Implement caching** for better performance
4. **Scale with paid APIs** as needed
5. **Add more data sources** for comprehensive coverage

---

**Ready to integrate?** Start with Travis County API and expand from there! 🚀 