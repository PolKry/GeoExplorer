const STORAGE_KEYS = {
    TOKEN: "token",
    USERNAME: "username",
    SETTINGS: "settings",
    PARTY_HOST_ID: "partyHostId",
    PARTY_CODE: "partyCode"
};

export function getToken() {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

export function setToken(token) {
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
}

export function removeToken() {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    return null;
}

export function getUsername() {
    return localStorage.getItem(STORAGE_KEYS.USERNAME);
}

export function setUsername(username) {
    localStorage.setItem(STORAGE_KEYS.USERNAME, username);
}

export function removeUsername() {
    localStorage.removeItem(STORAGE_KEYS.USERNAME);
}

export function getSettings() {
    return localStorage.getItem(STORAGE_KEYS.SETTINGS);
}

export function setSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, settings);
}

export function removeSettings() {
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
}

export function getPartyHostId() {
    return localStorage.getItem(STORAGE_KEYS.PARTY_HOST_ID);
}

export function setPartyHostId(hostId) {
    localStorage.setItem(STORAGE_KEYS.PARTY_HOST_ID, hostId);
}

export function removePartyHostId() {
    localStorage.removeItem(STORAGE_KEYS.PARTY_HOST_ID);
}

export function getPartyCode() {
    return localStorage.getItem(STORAGE_KEYS.PARTY_CODE);
}

export function setPartyCode(code) {
    localStorage.setItem(STORAGE_KEYS.PARTY_CODE, code);
}

export function removePartyCode() {
    localStorage.removeItem(STORAGE_KEYS.PARTY_CODE);
}

export function logout() {
    removeToken();
}

export function clearStorage() {
    removeToken();
    removeUsername();
    removePartyHostId();
    removePartyCode();
}
