const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function runTests() {
    const renderUrl = process.env.RENDER_URL;
    let serverProcess = null;
    let testUrl = 'http://localhost:3000/api/restrictions';

    if (renderUrl) {
        console.log(`RENDER_URL provided: ${renderUrl}`);
        testUrl = `${renderUrl.replace(/\/$/, '')}/api/restrictions`;
    } else {
        console.log('Starting local server for integration testing...');
        serverProcess = spawn('node', ['server.js'], {
            env: { ...process.env, PORT: '3000' }
        });

        serverProcess.stdout.on('data', (data) => {
            console.log(`[Server stdout]: ${data}`);
        });

        serverProcess.stderr.on('data', (data) => {
            console.error(`[Server stderr]: ${data}`);
        });

        // Wait 2 seconds for server to start
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    try {
        console.log(`Fetching restriction data from API: ${testUrl}`);
        const response = await axios.get(testUrl);
        
        console.log('Reading local data.json...');
        const localData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json'), 'utf8'));

        console.log('Comparing API response with local data.json...');
        
        const apiDataString = JSON.stringify(response.data.data);
        const localDataString = JSON.stringify(localData.data);

        if (apiDataString === localDataString) {
            console.log('✅ Success: API response matches local data.json!');
        } else {
            console.log('⚠️ Notice: API response does not match local data.json exactly (remote might be newer/older than local).');
        }

        // Validate basic structure
        if (response.data && response.data.data && response.data.data.length > 0) {
            console.log(`✅ Success: API response contains valid data array with ${response.data.data.length} items.`);
        } else {
            throw new Error('API response data is empty or invalid.');
        }

        if (serverProcess) serverProcess.kill();
        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (serverProcess) serverProcess.kill();
        process.exit(1);
    }
}

runTests();
