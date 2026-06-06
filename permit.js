const fs = require("fs").promises;
const fsSync = require("fs");
const parsePermits = require("./permit_parser.js");
const processCookies = require("./cookie_parser.js");
const getInspection = require("./inspection.js");

if (!fsSync.existsSync("permits")) {
  fsSync.mkdirSync("permits");
  console.log("Permits directory created.");
}

async function fetchPermitData() {
  try {
    // 1. Read the data from data.json
    console.log("Reading data.json");
    const fileContent = await fs.readFile("fetchpermit.test.copy.json", "utf8");
    const records = JSON.parse(fileContent);

    // 2. Loop over each record in the JSON array
    for (const record of records) {
      const recordId = record.recordId;
      const recordNumber = record["Record Number"]; // changed from .recordNumber

      if (!recordId) {
        console.log("Skipping entry: No recordId found.");
        continue;
      }

      const parts = recordId.split("-");

      if (parts.length !== 3) {
        console.log(`Skipping invalid recordId format: ${recordId}`);
        continue;
      }

      const [capID1, capID2, capID3] = parts;

      // 4. Create the target URL
      const url = `https://aca-prod.accela.com/MECKLENBURG/Cap/CapDetail.aspx?Module=Building&TabName=Building&capID1=${capID1}&capID2=${capID2}&capID3=${capID3}`;
      console.log(`\nFetching data for Record ID: ${recordId}`);
      console.log(`URL: ${url}`);

      const response = await fetch(url);

      if (!response.ok) {
        console.error(
          `Failed to fetch ${recordId}. Status: ${response.status} ${response.statusText}`,
        );
        continue;
      }

      const htmlContent = await response.text();
      const cookies = processCookies(response); // coookies here

      console.log(
        `Success! Retrieved ${htmlContent.length} characters of HTML for ${recordId}.`,
      );

      const permit = parsePermits(htmlContent); // permit data
      const inspection = await getInspection(url, htmlContent, cookies); // inspection data here
      const data = { ...permit, inspection };
      await fs.writeFile(
        `permits/${recordNumber}.json`,
        JSON.stringify(data, null, 2),
      );
    }

    console.log("\nFinished processing all records.");
  } catch (error) {
    console.error("An error occurred during execution:", error.message);
  }
}

fetchPermitData();
