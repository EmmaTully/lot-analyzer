# 🚀 Quick Start Guide - Austin Lot Analyzer

## Get Started in 10 Minutes

### 1. Install Proxy Server (2 min)
```bash
# In your project directory
npm install
```

### 2. Start Proxy Server (1 min)
```bash
# In one terminal window
npm start
```

### 3. Open the Website (1 min)
```bash
# In another terminal window
open index.html
```

### 4. Test with Real Austin Addresses (5 min)

Try these addresses in the search box:

#### Known Good Test Addresses:
- `1000 Congress Ave, Austin, TX 78701` - State Capitol area
- `4400 Avenue G, Austin, TX 78751` - Hyde Park (large lot)
- `1500 W 35th St, Austin, TX 78703` - Tarrytown (corner lot)

### 5. What You'll See

When it's working correctly:
- ✅ Property data loads (address, lot size, zoning)
- ✅ Analysis shows if lot can be split
- ✅ Plot map displays (if dimensions available)

Current limitations:
- ❌ Map view needs Mapbox token
- ❌ Some properties may not have complete data
- ❌ HOA/deed restrictions not available

### 6. Check Console for Errors

Press F12 to open browser console. Look for:
- `Proxy server running` message
- Any red error messages
- CORS errors (should be fixed by proxy)

## Troubleshooting

### "Property not found"
- Try different address format (with/without unit numbers)
- Some newer properties may not be in GIS yet
- Check if proxy server is running

### CORS Errors
- Make sure proxy server is running on port 3000
- Check `http://localhost:3000/health` in browser

### No Lot Dimensions
- Not all properties have dimension data in GIS
- Manual entry may be needed for accurate split visualization

## Next Steps

1. **Get a Mapbox Token** (free)
   - Sign up at https://www.mapbox.com
   - Replace `YOUR_MAPBOX_TOKEN` in script.js

2. **Try More Properties**
   - Search properties you're interested in
   - Note which ones show split potential

3. **Enhance Data**
   - Add TCAD integration for more complete data
   - Set up automated property monitoring

## Need Help?

- Check browser console (F12) for detailed errors
- Review IMPLEMENTATION_GUIDE.md for detailed setup
- Austin GIS documentation: https://www.austintexas.gov/department/gis-and-maps 