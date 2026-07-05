const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

const URL = "https://novascotia.ca/burnsafe/";

async function scrapeWebsite() {
    try {
        
        const response = await axios.get(URL);

        const html = response.data;

        const $ = cheerio.load(html);

        const table = $("#restriction-table");

        const tableBody = table.find("tbody");

        const rows = tableBody.find("tr");

        const restrictions = [];

        rows.each((index, row) => {
            let county = $(row).find("th").text().replace(" County", "");
            let colorStatus = $(row).find("img").attr("alt").split(" ");
            let restrictionLevel = $(row).find("p").text();

            let countyRestrictionObject = {
                "county": county,
                "color-status": colorStatus[0],
                "restriction-level": restrictionLevel
            }

            restrictions.push(countyRestrictionObject);
        })

        let scrapeDate = new Date();

        const scrapeReport = {
            "dateTimeScrapedUTC": scrapeDate,
            "data": restrictions
        }

        fs.writeFileSync('data.json', JSON.stringify(scrapeReport, null, 2));

        console.log("Scrape successful!");
        return scrapeReport;
    } catch(error) {
        console.log("Scrape failed: " + error.message);
        throw error; // Throw error to caller when required, don't exit process directly unless run as script
    }
};

if (require.main === module) {
    scrapeWebsite().catch(() => process.exit(1));
}

module.exports = { scrapeWebsite };