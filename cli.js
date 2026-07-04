#!/usr/bin/env node
const axios = require('axios');

// Get URL from command line arguments, default to local server
const targetUrl = process.argv[2] || 'http://localhost:3000/api/restrictions';

console.log(`Fetching burn restrictions from: ${targetUrl}...\n`);

axios.get(targetUrl)
    .then(response => {
        const { dateTimeScraped, data } = response.data;

        if (dateTimeScraped) {
            const date = new Date(dateTimeScraped);
            console.log(`Last Checked/Updated: ${date.toLocaleString()} local time`);
            console.log('='.repeat(60));
        }

        if (Array.isArray(data)) {
            // Format keys for a cleaner table representation
            const tableData = data.map(item => ({
                'County': item.county,
                'Status': item['color-status'],
                'Restriction Level': item['restriction-level']
            }));
            
            console.table(tableData);
        } else {
            console.log('No data found in the response.');
        }
    })
    .catch(error => {
        console.error(`Error: Failed to fetch data. (${error.message})`);
        console.log('\nTips:');
        console.log('1. Make sure your local server is running (e.g. node server.js).');
        console.log('2. Or pass your deployed Render URL as an argument:');
        console.log('   node cli.js https://your-app.onrender.com/api/restrictions');
    });
