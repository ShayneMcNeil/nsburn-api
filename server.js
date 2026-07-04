const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;

const GITHUB_USERNAME = "shaynemcneil"; 
const REPO_NAME = "nsburn-api";
const BRANCH = "main";

const RAW_JSON_URL = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH}/data.json`;

app.use(express.json());

app.get('/api/restrictions', async (req, res) => {
    try {
        console.log(`Fetching fresh data from GitHub CDN...`);
        
        // Append a unique timestamp to the URL to completely force GitHub to ignore its cache
        const cacheBusterUrl = `${RAW_JSON_URL}?t=${Date.now()}`;
        
        const response = await axios.get(cacheBusterUrl, {
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        });

        res.json(response.data);

    } catch (error) {
        console.error('Error fetching live data from GitHub:', error.message);
        
        res.status(500).json({ 
            error: 'Failed to retrieve live data from storage.',
            details: error.message 
        });
    }
});

app.get('/', (req, res) => {
    res.send('BurnSafe NS API Proxy is running up-to-date!');
});

app.listen(PORT, () => {
    console.log(`Server is running smoothly on port ${PORT}`);
});