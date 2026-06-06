const fs = require("fs");

function parseCSVToJSON(csvText) {
  const rows = [];
  let currentRow = [];
  let currentValue = "";
  let insideQuotes = false;

  // Character by character processing (State Machine)
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      // Handle escaped quotes inside quotes (e.g., "")
      currentValue += '"';
      i++; // Skip the next quote
    } else if (char === '"') {
      // Toggle quote state
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      // End of column
      currentRow.push(currentValue);
      currentValue = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      // End of row
      if (char === "\r" && nextChar === "\n") i++; // Skip \n in \r\n
      currentRow.push(currentValue);

      // Ignore empty lines
      if (currentRow.join("").trim() !== "") {
        rows.push(currentRow);
      }
      currentRow = [];
      currentValue = "";
    } else {
      currentValue += char;
    }
  }

  // Push the last row if the file doesn't end with a newline
  if (currentRow.length > 0 || currentValue !== "") {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  // Extract headers (Filter out empty strings caused by trailing commas)
  const headers = rows[0].filter((h) => h.trim() !== "");

  // Map rows to JSON objects
  const jsonData = rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, index) => {
      // Assign value, or null if empty/missing
      obj[header] =
        row[index] && row[index].trim() !== "" ? row[index].trim() : null;
    });
    return obj;
  });

  return jsonData;
}

// Read, Parse, and Save
try {
  const csvData = fs.readFileSync(
    "C:\\Users\\itsro\\Downloads\\RecordList20260606.csv",
    "utf8",
  );
  const jsonResult = parseCSVToJSON(csvData);
  fs.writeFileSync("output.json", JSON.stringify(jsonResult, null, 2), "utf8");
  console.log(
    `Successfully parsed ${jsonResult.length} records into output.json`,
  );
} catch (err) {
  console.error("Error processing file:", err);
}
