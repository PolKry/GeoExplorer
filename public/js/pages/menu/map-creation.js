import { apiFetch } from "../../api/http.js";

document.addEventListener('DOMContentLoaded', () => {
    loadTags();

    document.querySelectorAll('.custom-select-container').forEach(container => {
        const trigger = container.querySelector('.custom-select-trigger');
        const options = container.querySelectorAll('.custom-select-options span');

        // Toggle dropdown
        trigger.addEventListener('click', () => {
            container.querySelector('.custom-select-options').style.display =
                container.querySelector('.custom-select-options').style.display === 'flex' ? 'none' : 'flex';
        });

        // Set selected option and color
        options.forEach(option => {
            option.addEventListener('click', () => {
                trigger.textContent = option.textContent;

                switch (option.dataset.value) {
                    case 'Easy':
                        trigger.style.color = '#00ffae';
                        break;
                    case 'Medium':
                        trigger.style.color = 'orange';
                        break;
                    case 'Hard':
                        trigger.style.color = 'red';
                        break;
                    default:
                        trigger.style.color = '#fff';
                }

                container.querySelector('.custom-select-options').style.display = 'none';
            });
        });

        // Close dropdown if clicked outside
        document.addEventListener('click', e => {
            if (!container.contains(e.target)) {
                container.querySelector('.custom-select-options').style.display = 'none';
            }
        });
    });

    const form = document.getElementById('map-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('map-name').value.trim();
        const description = document.getElementById('map-description').value.trim();
        const difficulty = document.getElementById('map-difficulty').value;
        const jsonText = document.getElementById('map-json').value.trim();

        if (name.length === 0 || name.length > 30) {
            alert('Name must be between 1 and 30 characters.');
            return;
        }

        if (description.length > 100) {
            alert('Description must be 100 characters max.');
            return;
        }

        if (jsonText.length > 10_000_000) {
            alert('JSON is too long (max 10,000,000 characters).');
            return;
        }

        let parsed;
        try {
            parsed = JSON.parse(jsonText);
        } catch (err) {
            alert('Invalid JSON: ' + err.message);
            return;
        }

        const locations = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed.customCoordinates)
                ? parsed.customCoordinates
                : null;

        if (!Array.isArray(locations) || locations.length === 0) {
            alert('The JSON must contain a non-empty array of locations.');
            return;
        }

        const selectedTagsElements = document.querySelectorAll('.tag-chip.selected');
        const selectedTags = Array.from(selectedTagsElements).map(el => el.dataset.tag || el.textContent.trim());

        const mapData = {
            name,
            description,
            difficulty,
            tags: selectedTags,
            locations
        };

        try {
            const response = await apiFetch('/api/mapCreationRoutes/validate-json', {
                method: 'POST',
                body: JSON.stringify(mapData),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText);
            }

            const result = await response.json();
            alert(`Map "${result.name}" published successfully!`);
            form.reset();
            window.open("/menu/explore.html", '_self');
        } catch (err) {
            alert('Failed to publish map: ' + err.message);
            console.error(err);
        }
    });
});

const selectContainer = document.querySelector('.custom-select-container');
const trigger = selectContainer.querySelector('.custom-select-trigger');
const options = selectContainer.querySelectorAll('.custom-select-options span');
const hiddenInput = document.getElementById('map-difficulty');

trigger.addEventListener('click', () => {
    selectContainer.classList.toggle('open');
});

options.forEach(option => {
    option.addEventListener('click', () => {
        trigger.textContent = option.textContent;
        hiddenInput.value = option.dataset.value;
        selectContainer.classList.remove('open');
    });
});

document.addEventListener('click', e => {
    if (!selectContainer.contains(e.target)) {
        selectContainer.classList.remove('open');
    }
});

async function loadIcons() {
    const iconsFolder = 'resources/images/maps/unofficial/';
    const modal = document.getElementById('icon-selector-modal');
    let optionsContainer = modal.querySelector('.icon-options-container');

    if (!optionsContainer) {
        optionsContainer = document.createElement('div');
        optionsContainer.classList.add('icon-options-container');
        modal.appendChild(optionsContainer);
    }

    optionsContainer.innerHTML = '';

    try {
        const response = await apiFetch('/api/mapCreationRoutes/icons');
        if (!response.ok) throw new Error('Failed to load icons list');
        const icons = await response.json();

        icons.forEach(iconName => {
            const span = document.createElement('span');
            span.classList.add('icon-option');
            span.setAttribute('tabindex', '0');
            span.setAttribute('role', 'button');
            span.setAttribute('aria-label', iconName.replace('.png', '') + ' icon');
            span.dataset.icon = iconName;

            const img = document.createElement('img');
            img.src = iconsFolder + iconName;
            img.alt = iconName.replace('.png', '') + ' icon';
            img.style.width = '24px';
            img.style.height = '24px';

            span.appendChild(img);
            optionsContainer.appendChild(span);
        });
    } catch (err) {
        console.error(err);
    }
}

function initIconSelection() {
    const openBtn = document.getElementById('open-icon-selector');
    const modal = document.getElementById('icon-selector-modal');
    const closeBtn = modal.querySelector('.close-modal');
    const preview = document.getElementById('selected-icon-preview');
    const hiddenInput = document.getElementById('map-icon');

    openBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
        const iconOptions = modal.querySelectorAll('.icon-option');
        if (iconOptions.length > 0) iconOptions[0].focus();

        iconOptions.forEach(icon => {
            icon.onclick = () => {
                const iconName = icon.dataset.icon;
                preview.innerHTML = `<img src="resources/images/maps/unofficial/${iconName}" alt="${iconName.replace('.png', '')} icon" style="width:24px; height:24px;">`;
                hiddenInput.value = iconName;
                modal.classList.add('hidden');
                openBtn.focus();
            };

            icon.onkeydown = e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    icon.click();
                }
            };
        });
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        openBtn.focus();
    });

    modal.addEventListener('click', e => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            openBtn.focus();
        }
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            modal.classList.add('hidden');
            openBtn.focus();
        }
    });
}

async function loadTags() {
    try {
        const res = await apiFetch('/api/tags/all');
        if (!res.ok) throw new Error('Failed to apiFetch tags');
        const tags = await res.json();

        const availableContainer = document.getElementById('available-tags');
        const selectedContainer = document.getElementById('selected-tags');
        const selectedSection = selectedContainer.closest('.tag-section');
        const hiddenInput = document.getElementById('map-tags');

        // Vyčistit obě sekce
        availableContainer.innerHTML = '';
        selectedContainer.innerHTML = '';
        selectedSection.classList.remove('selected');

        function createTagChip(tag) {
            const chip = document.createElement('span');
            chip.className = 'tag-chip';
            chip.textContent = tag.name;
            chip.dataset.name = tag.name;
            if (tag.color) {
                chip.style.backgroundColor = tag.color;
                chip.style.color = 'white';
            }
            return chip;
        }

        function updateHiddenInput() {
            const selectedNames = Array.from(selectedContainer.children).map(c => c.dataset.name);
            hiddenInput.value = JSON.stringify(selectedNames);

            if (selectedNames.length > 0) {
                selectedSection.classList.add('selected');
            } else {
                selectedSection.classList.remove('selected');
            }
        }

        function addToAvailable(tag) {
            const chip = createTagChip(tag);
            chip.onclick = () => {
                chip.remove();
                addToSelected(tag);
                updateHiddenInput();
            };
            availableContainer.appendChild(chip);
        }

        function addToSelected(tag) {
            const chip = createTagChip(tag);
            chip.classList.add('selected');
            chip.onclick = () => {
                chip.remove();
                addToAvailable(tag);
                updateHiddenInput();
            };
            selectedContainer.appendChild(chip);
        }

        tags.forEach(tag => addToAvailable(tag));
        updateHiddenInput();

    } catch (err) {
        console.error(err);
    }
}
