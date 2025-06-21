# 🏠 Austin Lot Analyzer - Real Estate Mentor Program

A web-based tool designed to help identify properties in Austin, TX with lot splitting potential for profitable real estate investment.

## 🎯 Project Goal

Find properties that can be purchased, split into multiple lots, renovated, and sold profitably. The ideal scenario:
- Buy a property for $500K
- Split the lot into two parcels
- Renovate and sell the original house for $500K
- Keep the second lot for free (or sell for additional profit)

## 🚀 How to Use

### 1. Open the Application
Simply open `index.html` in any modern web browser. No installation required!

### 2. Upload Property Data
- Export property listings from Zillow or Realtor.com as CSV files
- Drag and drop the CSV file onto the upload area, or click to browse
- The app supports various CSV formats with common field names

### 3. Configure Analysis Parameters
Adjust the settings based on your investment criteria:
- **Maximum Purchase Price**: Your budget limit
- **Minimum Lot Size**: Smallest lot you'll consider
- **Target Profit Margin**: Your desired return percentage
- **Renovation Budget**: How much you plan to spend on improvements

### 4. Analyze Properties
Click "Analyze Properties" to run the analysis. The tool will:
- Check if each property meets your size and price criteria
- Verify lot splitting potential based on Austin zoning laws
- Calculate financial viability and profit projections
- Score each property from 0-100 based on investment potential

### 5. Review Results
Properties are ranked by their overall score:
- **Excellent (80-100)**: Prime investment opportunities
- **Good (60-79)**: Solid potential with some considerations
- **Poor (0-59)**: May not meet your criteria

### 6. Export Results
Download your analysis results as a CSV file for further review or sharing.

## 📊 What the Analysis Considers

### Lot Split Potential
- **Zoning Requirements**: Checks Austin city zoning minimums
- **Lot Size**: Ensures enough space for two viable lots
- **Setback Requirements**: Calculates buildable area after setbacks
- **Split Ratio**: How much of the original lot becomes the new lot

### Financial Analysis
- **Purchase Price**: Your initial investment
- **Renovation Costs**: Estimated improvement expenses
- **Renovated Value**: Projected value after improvements
- **New Lot Value**: Estimated worth of the split lot
- **Profit Calculation**: Total return minus total investment

### Austin Zoning Quick Reference
The app includes current Austin zoning requirements:

| Zone | Min Lot Size | Front Setback | Side Setback | Max Height |
|------|-------------|---------------|--------------|------------|
| SF-2 | 5,750 sq ft | 25 ft | 5 ft | 40 ft |
| SF-3 | 7,000 sq ft | 25 ft | 7.5 ft | 40 ft |
| SF-4A | 8,500 sq ft | 25 ft | 10 ft | 40 ft |

## 📁 Sample Data

Use `sample_properties.csv` to test the application. This file contains 10 sample Austin properties with realistic data.

## 🔧 Technical Details

### CSV Format Support
The app automatically detects common field names:
- **Address**: address, street address, property address, full address
- **Price**: price, list price, asking price, sale price
- **Lot Size**: lot size, lot size sqft, lot sq ft, lot area, land area
- **Zoning**: zoning, zone, zoning code

### Browser Compatibility
Works in all modern browsers:
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 🎓 Learning Opportunities

This project teaches valuable skills:

### Real Estate Concepts
- Property valuation and analysis
- Zoning laws and regulations
- Investment return calculations
- Market research and data analysis

### Technical Skills
- Data processing and analysis
- Web development (HTML, CSS, JavaScript)
- File handling and CSV parsing
- User interface design

### Business Skills
- Investment criteria development
- Risk assessment
- Profit margin analysis
- Decision-making frameworks

## ⚠️ Important Disclaimers

1. **Always Verify Zoning**: City codes change frequently. Always verify current zoning requirements with the City of Austin before making investment decisions.

2. **Professional Consultation**: This tool provides estimates only. Consult with real estate professionals, contractors, and legal experts before investing.

3. **Market Conditions**: Property values and renovation costs vary. Update your assumptions based on current market conditions.

4. **Due Diligence**: Always perform thorough property inspections and title searches before purchasing.

## 🛠️ Future Enhancements

Ideas for expanding the tool:
- Integration with real estate APIs for live data
- More sophisticated valuation models
- Neighborhood analysis and comparables
- Construction cost calculators
- Permit and approval timeline estimates
- Interactive maps and visualizations

## 📞 Support

This tool was built as part of a real estate mentorship program. For questions or suggestions, discuss with your mentor or real estate professionals.

## Features

- **Address Lookup**: Search individual Austin properties for instant analysis
- **CSV Upload**: Analyze multiple properties at once from Zillow/Realtor exports
- **Zoning Analysis**: Checks Austin zoning requirements (SF-1 through SF-6)
- **Financial Calculations**: Estimates costs and potential profits
- **Visual Plot Maps**: See lot dimensions and split possibilities

## Data Sources

The app uses real data when available:

1. **Austin GIS Database**: When you search for an address, the app queries the official City of Austin GIS services for:
   - Real parcel boundaries
   - Actual lot sizes
   - Current zoning information
   - Property details

2. **Demo Mode**: Type "demo" to see an example analysis with sample data

3. **CSV Upload**: You provide your own property data from Zillow, Realtor.com, or other sources

**Important**: The app will only show real property data from Austin GIS or clearly marked demo examples. It will not generate or estimate property values for addresses it cannot find.

## Getting Started

---

**Happy Investing! 🏡💰**

*Remember: Real estate investment involves risk. This tool is for educational purposes and should not be your only source of investment analysis.* 