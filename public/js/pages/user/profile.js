import { apiFetch } from "../../api/http.js";
import { requireToken } from "../../utils/auth.js";

const avatarElement = document.querySelector('.profile-avatar');

document.addEventListener('DOMContentLoaded', async () => {
    const token = requireToken();
    if (!token) return;

    try {
        // apiFetch user, stats, and countries in parallel
        const [resUser, resProfile, resStats, resCountries] = await Promise.all([
            apiFetch('/api/auth/me'),
            apiFetch('/api/users/me'),
            apiFetch('/api/users/stats'),
            apiFetch('/api/countries')
        ]);

        if (!resUser.ok) throw new Error('Failed to apiFetch user info');
        if (!resProfile.ok) throw new Error('Failed to apiFetch user info');

        const user = await resUser.json();
        const userProfile = await resProfile.json();
        const countries = resCountries.ok ? await resCountries.json() : [];

        // --- User Info ---
        document.querySelector('#nickname').textContent = user.username;
        document.querySelector('#bio-text').textContent = userProfile.bio;

        const countrySpan = document.getElementById('country-text');
        const countryFlag = document.getElementById('country-flag');

        if (userProfile.country && userProfile.country.code) {
            countrySpan.innerHTML = `
            <img id="country-flag" src="https://flagcdn.com/w20/${userProfile.country.code.toLowerCase()}.png" class="flag-icon">
            ${userProfile.country.name}
            `;
        } else {
            countrySpan.textContent = 'Not set';
            countryFlag.src = '';
        }

        const date = new Date(user.createdAt);
        const formattedDate = date.toLocaleString('en-US', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        });
        document.querySelector('#creation-date').textContent = formattedDate;

        // Avatar (optional, uncomment if you have profile images API)
        // avatarElement.src = `/api/uploadProfileImage/${user._id}/profile-pic`;

        // Stats
        if (resStats.ok) {
            const stats = await resStats.json();
            document.querySelector('.stat-card:nth-child(1) p').textContent = stats.gamesPlayed ?? 0;
            document.querySelector('.stat-card:nth-child(2) p').textContent = stats.averageScore ?? 0;
            document.querySelector('.stat-card:nth-child(3) p').textContent = stats.maxScore ?? 0;
            document.querySelector('.stat-card:nth-child(4) p').textContent = stats.longestStreak ?? 0;
            document.querySelector('.stat-card:nth-child(5) p').textContent = (stats.accuracy ?? 0) + '%';

            const level = stats.level;
            const xp = stats.xp;
            const xpNeeded = stats.xpToNextLevel;
            const percent = Math.min((xp / xpNeeded) * 100, 100).toFixed(1);
            const xpNeededFromCurrent = xpNeeded - xp;

            document.querySelector('.level-label').textContent = `Level ${level}`;
            document.querySelector('.level-fill').style.width = `${percent}%`;
            document.querySelector('.level-progress').textContent = `${xpNeededFromCurrent.toLocaleString()} Points to Level ${level + 1}`;
        }

        // Editable Bio
        makeBioEditable(userProfile, token);

        // Editable Country
        if (countries && countries.length > 0) {
            makeCountryEditable(userProfile, token, countries);
        }

    } catch (err) {
        console.error('Network error:', err);
        alert('Network error');
    }
});

function makeBioEditable(profile, token) {
    const bioBtn = document.querySelector(".edit-btn[data-target='bio-text']");
    let span = document.getElementById('bio-text');

    // Remove previous listeners by cloning
    bioBtn.replaceWith(bioBtn.cloneNode(true));
    const newBioBtn = document.querySelector(".edit-btn[data-target='bio-text']");

    newBioBtn.addEventListener('click', () => {
        const currentValue = span.innerText.trim();
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentValue;
        input.className = 'edit-input';
        span.replaceWith(input);
        input.focus();

        input.addEventListener('blur', async () => {
            span = document.createElement('span');
            span.id = 'bio-text';
            span.className = 'meta-value';
            span.innerText = input.value;
            input.replaceWith(span);

            // Re-enable editing again
            makeBioEditable(profile, token);

            try {
                const res = await apiFetch(`/api/users/${profile._id}/bio`, {
                    method: 'PUT',
                    body: JSON.stringify({ bio: input.value })
                });
                if (!res.ok) throw new Error('Failed to update bio');
            } catch (err) {
                console.error(err);
                alert('Failed to update bio');
            }
        });
    });
}

function makeCountryEditable(profile, token, countries) {
    const countryBtn = document.querySelector(".edit-btn[data-target='country-text']");

    // Remove previous listeners
    countryBtn.replaceWith(countryBtn.cloneNode(true));
    const newCountryBtn = document.querySelector(".edit-btn[data-target='country-text']");

    newCountryBtn.addEventListener('click', () => {
        const span = document.getElementById('country-text');
        const currentValue = span.innerText.trim();

        const select = document.createElement('select');
        select.className = 'edit-select';

        countries.forEach(c => {
            if (!c || !c.name) return;
            const option = document.createElement('option');
            option.value = c.cca2 ?? c.code ?? c.name;
            option.textContent = c.name.common ?? c.name;
            if ((c.name.common ?? c.name) === currentValue) option.selected = true;
            select.appendChild(option);
        });

        span.replaceWith(select);
        select.focus();

        let replaced = false;

        const replaceWithSpan = (selectedOption) => {
            if (replaced || !select.isConnected) return;
            replaced = true;

            const newSpan = document.createElement('span');
            newSpan.id = 'country-text';
            newSpan.className = 'meta-value';
            newSpan.innerHTML = `
        <img src="https://flagcdn.com/w20/${selectedOption.value.toLowerCase()}.png" class="flag-icon">
        ${selectedOption.textContent}
    `;
            select.replaceWith(newSpan);
            makeCountryEditable(profile, token, countries);
        };

        select.addEventListener('change', async () => {
            const selectedOption = select.options[select.selectedIndex];
            if (!selectedOption) return;

            replaceWithSpan(selectedOption);

            try {
                const res = await apiFetch(`/api/users/${profile._id}/country`, {
                    method: 'PUT',
                    body: JSON.stringify({ name: selectedOption.textContent, code: selectedOption.value })
                });
                if (!res.ok) throw new Error('Failed to update country');
            } catch (err) {
                console.error(err);
                alert('Failed to update country');
            }
        });

        select.addEventListener('blur', () => {
            const selectedOption = select.options[select.selectedIndex];
            if (!selectedOption) return;

            // Only replace if select still exists
            replaceWithSpan(selectedOption);
        });
    });
}
