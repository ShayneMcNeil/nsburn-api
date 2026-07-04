const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;

const GITHUB_USERNAME = "ShayneMcNeil"; 
const REPO_NAME = "nsburn-api";
const BRANCH = "main";

const RAW_JSON_URL = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${BRANCH}/data.json`;

app.use(express.json());

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// Helper function to get the latest commit SHA for the branch to bypass CDN caching
async function getLatestCommitSha() {
    try {
        const refsUrl = `https://github.com/${GITHUB_USERNAME}/${REPO_NAME}/info/refs?service=git-upload-pack`;
        const response = await axios.get(refsUrl, { timeout: 5000 });
        const match = response.data.match(new RegExp(`([0-9a-f]{40})\\s+refs/heads/${BRANCH}`));
        if (match) {
            return match[1];
        }
        return null;
    } catch (error) {
        console.error('Error fetching git refs:', error.message);
        return null;
    }
}

app.get('/api/restrictions', async (req, res) => {
    try {
        console.log(`Fetching fresh data from GitHub...`);
        
        const commitSha = await getLatestCommitSha();
        
        // If we successfully fetched the latest commit SHA, use it to bust the CDN cache
        const targetUrl = commitSha 
            ? `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${commitSha}/data.json`
            : RAW_JSON_URL;
        
        console.log(`Target URL: ${targetUrl}`);

        const response = await axios.get(targetUrl, {
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