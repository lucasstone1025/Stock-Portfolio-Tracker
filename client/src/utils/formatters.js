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
