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

app.get('/', async (req, res) => {
    let lastUpdated = 'Unknown';
    try {
        const commitSha = await getLatestCommitSha();
        const targetUrl = commitSha 
            ? `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/${commitSha}/data.json`
            : RAW_JSON_URL;
        const response = await axios.get(targetUrl);
        if (response.data && response.data.dateTimeScraped) {
            lastUpdated = new Date(response.data.dateTimeScraped).toLocaleString('en-US', {
                timeZoneName: 'short'
            });
        }
    } catch (err) {
        console.error('Failed to get last updated time for root page:', err.message);
    }

    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NS BurnSafe API Proxy</title>
    <style>
        :root {
            --bg-color: #0f172a;
            --text-color: #f8fafc;
            --accent-color: #38bdf8;
            --card-bg: rgba(30, 41, 59, 0.7);
            --border-color: rgba(255, 255, 255, 0.1);
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            margin: 0;
            padding: 2rem;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            box-sizing: border-box;
        }
        .container {
            max-width: 600px;
            width: 100%;
            background: var(--card-bg);
            backdrop-filter: blur(12px);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 2.5rem;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            text-align: center;
        }
        h1 {
            color: var(--accent-color);
            margin-top: 0;
            font-size: 2.25rem;
            letter-spacing: -0.025em;
        }
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(56, 189, 248, 0.1);
            color: var(--accent-color);
            padding: 8px 16px;
            border-radius: 9999px;
            font-weight: 600;
            font-size: 0.875rem;
            margin-bottom: 2rem;
            border: 1px solid rgba(56, 189, 248, 0.2);
        }
        .pulse-dot {
            width: 8px;
            height: 8px;
            background-color: #10b981;
            border-radius: 50%;
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
            animation: pulse 1.6s infinite;
        }
        @keyframes pulse {
            0% {
                transform: scale(0.95);
                box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
            }
            70% {
                transform: scale(1);
                box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
            }
            100% {
                transform: scale(0.95);
                box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
            }
        }
        .info-card {
            background: rgba(15, 23, 42, 0.4);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 2rem;
            text-align: left;
        }
        .info-item {
            margin-bottom: 1rem;
        }
        .info-item:last-child {
            margin-bottom: 0;
        }
        .label {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #94a3b8;
            margin-bottom: 4px;
        }
        .value {
            font-size: 1.1rem;
            font-weight: 500;
        }
        code {
            background: rgba(0, 0, 0, 0.3);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
            font-size: 0.9em;
            color: #f472b6;
        }
        a {
            color: var(--accent-color);
            text-decoration: none;
            transition: color 0.2s;
        }
        a:hover {
            color: #7dd3fc;
            text-decoration: underline;
        }
        .btn {
            display: inline-block;
            background: var(--accent-color);
            color: #0f172a;
            font-weight: 600;
            padding: 12px 24px;
            border-radius: 8px;
            margin-top: 1rem;
            transition: background-color 0.2s, transform 0.1s;
        }
        .btn:hover {
            background: #7dd3fc;
            text-decoration: none;
            transform: translateY(-1px);
        }
        .footer {
            margin-top: 2rem;
            font-size: 0.875rem;
            color: #64748b;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="status-badge">
            <span class="pulse-dot"></span>
            Operational
        </div>
        <h1>NS BurnSafe API Proxy</h1>
        
        <div class="info-card">
            <div class="info-item">
                <div class="label">Endpoint</div>
                <div class="value"><a href="/api/restrictions">/api/restrictions</a></div>
            </div>
            <div class="info-item">
                <div class="label">Last Scraped/Updated</div>
                <div class="value">${lastUpdated}</div>
            </div>
            <div class="info-item">
                <div class="label">How it works</div>
                <div class="value" style="font-size: 0.95rem; line-height: 1.5; color: #cbd5e1;">
                    This proxy dynamically retrieves the latest burn restriction data scraped daily from the Nova Scotia government website and cached securely on GitHub.
                </div>
            </div>
        </div>

        <a class="btn" href="https://github.com/${GITHUB_USERNAME}/${REPO_NAME}" target="_blank">View GitHub Repository</a>
        
        <div class="footer">
            Designed for BurnSafe NS integration • <a href="https://github.com/${GITHUB_USERNAME}/${REPO_NAME}" target="_blank">GitHub</a>
        </div>
    </div>
</body>
</html>
    `);
});

app.listen(PORT, () => {
    console.log(`Server is running smoothly on port ${PORT}`);
});