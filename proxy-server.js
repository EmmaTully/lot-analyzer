const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

// Enable CORS for all origins
app.use(cors());

// Proxy endpoint
app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    try {
        console.log('Proxying request to:', targetUrl);
        
        const response = await fetch(targetUrl);
        const data = await response.json();
        
        res.json(data);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'Proxy server is running' });
});

app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
    console.log('Use http://localhost:3000/proxy?url=YOUR_ENCODED_URL');
}); 