export async function startCountryGameRes(mapSrcName, roundLength) {
    try {
        const res = await apiFetch(`/api/game/country/start?name=${encodeURIComponent(mapSrcName)}&roundLength=${roundLength}`, {
            method: "POST",
        });
        return res;
    } catch (err) {
        console.error("Error starting country game:", err);
        return null;
    }
}

// TODO: Mabey add points param
export async function startPointsGameRes(mapSrcName, movingModeValue, roundLength) {
    try {
        const res = await apiFetch(`/api/game/points/start?name=${encodeURIComponent(mapSrcName)}&movingMode=${encodeURIComponent(movingModeValue)}&roundLength=${roundLength}`, {
            method: "POST",
        });
        return res;
    } catch (err) {
        console.error("Error starting points game:", err);
        return null;
    }
}

export async function startFFAGameRes(mapSrcName, roundLength) {
    try {
        const res = await apiFetch(`/api/game/ffa/start?name=${encodeURIComponent(mapSrcName)}&roundLength=${roundLength}`, {
            method: "POST",
        });
        return res;
    } catch (err) {
        console.error("Error starting FFA game:", err);
        return null;
    }
}