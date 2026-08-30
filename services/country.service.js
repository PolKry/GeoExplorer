const mapRepository = require("../repositories/map.repository");

const countryLookup = {};

/*
    Caches all ISO A2 to ADMIN (name) and saves it to a table
    Called after server starts
*/
async function loadCountryLookup() {
    const maps = await mapRepository.findCountryLookupRows(); for (const map of maps) {
        countryLookup[map.srcName] = map.name;
    }

    console.log(`Mapped ${Object.keys(countryLookup).length} country ISO A2 codes to their corresponding countries`);
}

function getCountryNameByIso(isoA2) {
    return countryLookup[isoA2];
}

module.exports = {
    loadCountryLookup,
    getCountryNameByIso
};
