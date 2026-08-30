const fs = require('fs');
const path = require('path');

const folderPath = "data\\locations\\countries";
const outputJsonPath = "data\\polygonCountries.json";

const entries = fs.readdirSync(folderPath);

// filter only files
const files = [];
for (const entry of entries) {
    const fullPath = path.join(folderPath, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isFile()) {
        files.push(entry.slice(0, -5));
    }
}

// write to JSON
const jsonData = JSON.stringify(files, null, 2);
fs.writeFileSync(outputJsonPath, jsonData, 'utf-8');

console.log(`Saved ${files.length} files to ${outputJsonPath}`);