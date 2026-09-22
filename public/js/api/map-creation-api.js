export async function createMap(mapData) {
    try {
        const res = await apiFetch('/api/map-creation-routes/create-map', {
            method: 'POST',
            body: JSON.stringify(mapData),
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Failed to create map');
        }

        return data;
    } catch (error) {
        console.error('Error creating map:', error);
        throw error;
    }
}

export async function fetchTags() {
    try {
        const res = await apiFetch('/api/tags/all');
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Failed to fetch tags');
        }

        return data;
    } catch (error) {
        console.error('Error fetching tags:', error);
        throw error;
    }
}