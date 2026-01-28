const HTTP_HTTPS = /^https?:\/\//i;

/** Use for href only. Returns url if https? otherwise '#' to avoid javascript:/data: etc. */
export function safeExternalUrl(url) {
    if (!url || typeof url !== 'string') return '#';
    const t = url.trim();
    return HTTP_HTTPS.test(t) ? t : '#';
}

/** Use for img src only. Returns url if https? otherwise null (don't render). */
export function safeImageUrl(url) {
    if (!url || typeof url !== 'string') return null;
    const t = url.trim();
    return HTTP_HTTPS.test(t) ? t : null;
}

export const formatMarketCap = (marketCapInMillions) => {
    if (!marketCapInMillions) return 'N/A';

    // Finnhub returns market cap in Millions
    const value = parseFloat(marketCapInMillions);

    if (value >= 1000000) {
        return (value / 1000000).toFixed(2) + 'T';
    } else if (value >= 1000) {
        return (value / 1000).toFixed(2) + 'B';
    } else {
        return value.toFixed(2) + 'M';
    }
};
