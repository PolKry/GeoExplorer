function formatDistance(meters) {
    if (meters >= 1000) {
        return formatKm(meters);
    } else {
        return Math.round(meters) + " meters";
    }
}

function formatKm(meters) {
    const km = (meters / 1000).toFixed(2);
    return km.replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " km";
}

function toLatLngLiteral(location) {
    return {
        lat: typeof location.lat === 'function' ? location.lat() : location.lat,
        lng: typeof location.lng === 'function' ? location.lng() : location.lng
    };
}

function animateScore(finalScore, element, suffix = "", duration = 500) {
    const startTime = performance.now();
    const formatNumber = new Intl.NumberFormat("en-US");

    function update(currentTime) {
        console.debug(currentTime);
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = Math.floor(progress * finalScore);
        element.textContent = formatNumber.format(current) + suffix;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = formatNumber.format(finalScore) + suffix;
        }
    }

    requestAnimationFrame(update);
}