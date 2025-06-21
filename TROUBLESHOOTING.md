# Troubleshooting Guide

## Address Search Not Finding Properties

### Why addresses might not be found:

1. **Limited Austin GIS Data**: The ParcelSearchTable service may not contain all Austin properties:
   - Some properties may not be in the public database
   - The FULL_STREET_NAME field format might not match your search
   - Newer properties or recent address changes might not be reflected

2. **Address Format Sensitivity**: The search works best with exact street name formats:
   - The database might store "1898 BRACKENRIDGE STREET" not "1898 BRACKENRIDGE ST"
   - Try different variations of street suffixes
   - Apartment/unit numbers should be omitted

3. **Data Field Limitations**: The ParcelSearchTable only searches the FULL_STREET_NAME field:
   - Other address fields might exist but aren't searchable
   - The service doesn't support fuzzy matching

### What to try:

1. **Use the demo mode**:
   - Type "demo" to see an example analysis with sample data

2. **Use CSV upload instead**:
   - Export property data from Zillow or Realtor.com
   - The CSV analysis doesn't require GIS lookups
   - You can analyze multiple properties at once

3. **Try simpler searches**:
   - Just the street number: "1898"
   - Number and street name: "1898 Brackenridge"
   - Different suffixes: "Street" vs "St"

### Technical Details:

- The app uses City of Austin's ParcelSearchTable service
- Only real GIS data or clearly marked demo data is shown
- No property values are estimated or made up
- CORS proxy is required for browser security

### Alternative Data Sources:

If you need property data that's not in the Austin GIS:
1. Use the CSV upload feature with data from:
   - Zillow.com
   - Realtor.com
   - Redfin.com
   - Travis County Appraisal District (traviscad.org)

2. The CSV analysis provides full lot split analysis without needing GIS lookups

### Common Austin Addresses That Should Work:

These are examples of addresses in the Austin GIS system:
- "100 Congress Avenue" (City Hall)
- "301 W 2nd Street" (Austin Convention Center)
- "1000 Barton Springs Road" (Zilker Park area)

Note: Even these may not always return data if the GIS service is down or the data has changed. 