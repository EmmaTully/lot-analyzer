# Troubleshooting Guide

## Address Search Not Finding Properties

### Why addresses might not be found:

1. **Data Availability**: The Austin GIS database may not have all properties, especially:
   - New constructions
   - Recently annexed areas
   - Properties with non-standard addresses

2. **Address Format**: The search tries multiple formats, but works best with:
   - Street number + street name (e.g., "1234 Main St")
   - Avoid apartment/unit numbers
   - Common abbreviations are automatically converted (Avenue → Ave, Street → St)

3. **Multiple Data Sources**: The app tries several Austin GIS services in order:
   - Land Database (TCAD view)
   - Address Points
   - Parcel Search Table
   - Simplified street number search

### What to try:

1. **Simplify the address**:
   - Instead of: "1898 Brackenridge St Apt 2, Austin, TX 78704"
   - Try: "1898 Brackenridge St"

2. **Try variations**:
   - "1898 Brackenridge Street"
   - "1898 Brackenridge"
   - Just the street number: "1898"

3. **Use demo mode**:
   - Type "demo" to see an example analysis

4. **Use CSV upload**:
   - If you have property data from Zillow or Realtor.com
   - The CSV analysis doesn't require GIS lookups

### Technical Details:

- The app uses City of Austin's ArcGIS REST services
- CORS proxy is required (localhost:3000 for development, corsproxy.io for production)
- No fake data is generated - only real GIS data or clearly marked demo data

### Common Austin Addresses That Should Work:

These are examples of addresses in the Austin GIS system:
- "100 Congress Avenue" (City Hall)
- "301 W 2nd Street" (Austin Convention Center)
- "1000 Barton Springs Road" (Zilker Park area)

Note: Even these may not always return data if the GIS service is down or the data has changed. 