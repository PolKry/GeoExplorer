function safeParseJson(jsonString, maxLength = 10_000_000) {
    if (typeof jsonString !== 'string' || jsonString.length > maxLength) {
        return { success: false, error: 'Too long or invalid input.' };
    }

    try {
        const data = JSON.parse(jsonString);
        return { success: true, data };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = { safeParseJson };