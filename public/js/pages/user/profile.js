import {
    getDashboard,
    getCountries,
    setBio,
    setCountry
} from "../../api/user-api.js";

import { showMessage } from "../../utils/toast.js";

document.addEventListener("DOMContentLoaded", init);

async function init() {
    try {
        const [dashboard, countries] = await Promise.all([
            getDashboard(),
            getCountries()
        ]);

        renderProfile(dashboard);
        renderStats(dashboard.stats);

        setupBioEditor();
        setupCountryEditor(countries);
    } catch (error) {
        console.error("Failed to load profile:", error);
        showMessage("Failed to load profile");
    }
}


// Profile
function renderProfile({ user, profile }) {
    document.querySelector("#nickname").textContent = user.username;
    document.querySelector("#bio-text").textContent = profile.bio || "Not set";
    document.querySelector("#creation-date").textContent =
        formatDate(user.createdAt);

    renderCountry(profile.country);
}

function renderCountry(country) {
    const container = document.querySelector("#country-text");

    container.replaceChildren();

    if (!country?.code) {
        container.textContent = "Not set";
        return;
    }

    const flag = document.createElement("img");
    flag.src = getFlagUrl(country.code);
    flag.className = "flag-icon";
    flag.alt = `${country.name} flag`;

    container.append(flag, document.createTextNode(` ${country.name}`));
}

function formatDate(date) {
    return new Date(date)
        .toLocaleString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        })
        .replace(",", " at");
}

function getFlagUrl(code) {
    return `https://flagcdn.com/w20/${code.toLowerCase()}.png`;
}


// Stats
function renderStats(stats) {
    const values = [
        stats.gamesPlayed,
        stats.averageScore,
        stats.maxScore,
        stats.longestStreak,
        `${stats.accuracy ?? 0}%`
    ];

    document
        .querySelectorAll(".stat-card p")
        .forEach((element, index) => {
            element.textContent = values[index] ?? 0;
        });

    const level = stats.level ?? 0;
    const xp = stats.xp ?? 0;
    const xpNeeded = stats.xpToNextLevel ?? 0;

    const progress = xpNeeded
        ? Math.min((xp / xpNeeded) * 100, 100)
        : 0;

    const remainingXp = Math.max(xpNeeded - xp, 0);

    document.querySelector(".level-label").textContent =
        `Level ${level}`;

    document.querySelector(".level-fill").style.width =
        `${progress.toFixed(1)}%`;

    document.querySelector(".level-progress").textContent =
        `${remainingXp.toLocaleString()} Points to Level ${level + 1}`;
}


// Bio editor
function setupBioEditor() {
    const button = document.querySelector(
        ".edit-btn[data-target='bio-text']"
    );

    button.addEventListener("click", () => {
        const span = document.querySelector("#bio-text");

        const input = document.createElement("input");
        input.type = "text";
        input.className = "edit-input";
        input.value = span.textContent.trim();

        span.replaceWith(input);
        input.focus();
        input.select();

        input.addEventListener("blur", () => saveBio(input));
    });
}

async function saveBio(input) {
    const value = input.value.trim();

    const span = createBioElement(value);
    input.replaceWith(span);

    try {
        await setBio(value);
        showMessage("Bio updated successfully");
    } catch (error) {
        console.error("Failed to update bio:", error);
        showMessage("Failed to update bio");
    }
}

function createBioElement(value) {
    const span = document.createElement("span");

    span.id = "bio-text";
    span.className = "meta-value";
    span.textContent = value;

    return span;
}


// Country editor
function setupCountryEditor(countries) {
    const button = document.querySelector(
        ".edit-btn[data-target='country-text']"
    );

    button.addEventListener("click", () => {
        startCountryEditing(countries);
    });
}

function startCountryEditing(countries) {
    const span = document.querySelector("#country-text");
    const currentCountry = span.textContent.trim();

    const select = createCountrySelect(countries, currentCountry);

    span.replaceWith(select);
    select.focus();

    select.addEventListener("change", async () => {
        await saveCountry(select);
    });

    select.addEventListener("blur", () => {
        restoreCountry(select);
    });
}

function createCountrySelect(countries, currentCountry) {
    const select = document.createElement("select");
    select.className = "edit-select";

    countries
        .filter(country => country?.name)
        .forEach(country => {
            const name = country.name.common ?? country.name;
            const code = country.cca2 ?? country.code;

            const option = document.createElement("option");

            option.value = code;
            option.textContent = name;
            option.selected = name === currentCountry;

            select.appendChild(option);
        });

    return select;
}

async function saveCountry(select) {
    const option = select.selectedOptions[0];

    if (!option) return;

    restoreCountry(select);

    try {
        await setCountry({
            name: option.textContent,
            code: option.value
        });

        showMessage("Country updated successfully");
    } catch (error) {
        console.error("Failed to update country:", error);
        showMessage("Failed to update country");
    }
}

function restoreCountry(select) {
    if (!select.isConnected) return;

    const option = select.selectedOptions[0];

    if (!option) return;

    const span = document.createElement("span");

    span.id = "country-text";
    span.className = "meta-value";

    const flag = document.createElement("img");
    flag.src = getFlagUrl(option.value);
    flag.className = "flag-icon";
    flag.alt = `${option.textContent} flag`;

    span.append(
        flag,
        document.createTextNode(` ${option.textContent}`)
    );

    select.replaceWith(span);
}