export function formatTimeInSec(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    let result = '';

    if (min > 0) result += `${min}m`;
    if (sec > 0) {
        if (result.length > 0) result += ' ';
        result += `${sec}s`;
    }

    if (result === '') result = '0s';
    return result;
}

export function formatTimeInMS(ms) {
    const minutes = Math.floor(ms / 60000);
    const remainingMs = ms % 60000;
    const seconds = remainingMs / 1000;
    const secondsStr = parseFloat(seconds.toFixed(3));

    return `${minutes} min ${secondsStr} sec`;
}
