const fs = require('fs');
const path = require('path');

function readLocationFallback(fallbackFile) {
  const filePath = path.join(__dirname, '..', 'data', 'locations', fallbackFile);
  if (!fs.existsSync(filePath)) return null;

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

module.exports = {
  readLocationFallback
};
