import { Link } from 'react-router-dom';

function formatMarketCap(val) {
    if (val == null || val === undefined || Number.isNaN(Number(val))) return 'N/A';
    const n = Number(val);
    if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
    return `$${n.toFixed(0)}`;
}

function StockAnalytics({ stock, analytics, loading, error }) {
    if (loading) {
        return (
            <div className="card glass-card" style={{ padding: '2rem', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="text-muted">Loading Analytics...</div>
            </div>
        );
    }

    if (!stock && !analytics) {
        return (
            <div className="card glass-card" style={{ padding: '2rem', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="text-muted">No data available</div>
            </div>
        );
    }

    const formatValue = (value) => {
        if (value === null || value === undefined) return 'N/A';
        return typeof value === 'number' ? value.toFixed(2) : value;
    };

    const getRSIColor = (rsi) => {
        if (!rsi) return 'var(--text-muted)';
        if (rsi > 70) return 'var(--danger)';
        if (rsi < 30) return 'var(--success)';
        return 'var(--text-main)';
    };

    const getSignalColor = (signal) => {
        if (signal === 'bullish' || signal === 'up') return 'var(--success)';
        if (signal === 'bearish' || signal === 'down') return 'var(--danger)';
        return 'var(--text-muted)';
    };

    const { technical_indicators, statistics, volatility, trend } = analytics || {};
    const hasAnalytics = !!analytics && !error;

    return (
        <div className="card glass-card" style={{
            padding: '1.5rem',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            maxHeight: '600px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.35rem' }}>Analytics</h2>
                <Link to="/faq" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none' }}>
                    Learn more →
                </Link>
            </div>

            {/* 1. Key metrics – consumer-friendly, always on top */}
            {stock && (
            <div style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                borderRadius: '0.5rem',
                border: '1px solid rgba(16, 185, 129, 0.2)'
            }}>
                <h3 style={{ fontSize: '0.95rem', marginTop: 0, marginBottom: '1rem', color: 'var(--success)' }}>
                    At a glance
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1rem' }}>
                    {stock?.marketcap != null && (
                        <div>
                            <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.2rem' }}>Market cap</div>
                            <div style={{ fontWeight: '600', fontSize: '1rem' }}>{formatMarketCap(stock.marketcap)}</div>
                        </div>
                    )}
                    {(stock?.changePercent != null && !Number.isNaN(Number(stock.changePercent))) && (
                        <div>
                            <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.2rem' }}>Today</div>
                            <div style={{
                                fontWeight: '600',
                                fontSize: '1rem',
                                color: Number(stock.changePercent) >= 0 ? 'var(--success)' : 'var(--danger)'
                            }}>
                                {Number(stock.changePercent) >= 0 ? '+' : ''}{Number(stock.changePercent).toFixed(2)}%
                            </div>
                        </div>
                    )}
                    {stock?.open != null && !Number.isNaN(Number(stock.open)) && (
                        <div>
                            <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.2rem' }}>Open</div>
                            <div style={{ fontWeight: '600', fontSize: '1rem' }}>${formatValue(stock.open)}</div>
                        </div>
                    )}
                    {stock?.previousClose != null && !Number.isNaN(Number(stock.previousClose)) && (
                        <div>
                            <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.2rem' }}>Prev close</div>
                            <div style={{ fontWeight: '600', fontSize: '1rem' }}>${formatValue(stock.previousClose)}</div>
                        </div>
                    )}
                    {stock?.dayhigh != null && (
                        <div>
                            <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.2rem' }}>High</div>
                            <div style={{ fontWeight: '600', fontSize: '1rem' }}>${formatValue(stock.dayhigh)}</div>
                        </div>
                    )}
                    {stock?.daylow != null && (
                        <div>
                            <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.2rem' }}>Low</div>
                            <div style={{ fontWeight: '600', fontSize: '1rem' }}>${formatValue(stock.daylow)}</div>
                        </div>
                    )}
                    {stock?.price != null && (
                        <div>
                            <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.2rem' }}>Close</div>
                            <div style={{ fontWeight: '600', fontSize: '1rem' }}>${formatValue(stock.price)}</div>
                        </div>
                    )}
                    {stock?.sector && (
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.2rem' }}>Sector</div>
                            <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{stock.sector}</div>
                        </div>
                    )}
                </div>
            </div>
            )}

            {error && (
                <div className="text-danger" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                    Analytics could not be loaded. Key metrics above are still shown.
                </div>
            )}

            {/* 2. Volatility, period range, trend */}
            {hasAnalytics && (volatility != null || (statistics?.min != null && statistics?.max != null) || trend) && (
                <div style={{
                    marginBottom: '1.5rem',
                    padding: '1rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)'
                }}>
                    <h3 style={{ fontSize: '0.95rem', marginTop: 0, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                        This period
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                        {volatility != null && (
                            <div>
                                <span className="text-muted" style={{ fontSize: '0.8rem' }}>Volatility </span>
                                <span style={{ fontWeight: '600' }}>{formatValue(volatility)}%</span>
                            </div>
                        )}
                        {statistics?.min != null && statistics?.max != null && (
                            <div>
                                <span className="text-muted" style={{ fontSize: '0.8rem' }}>Range </span>
                                <span style={{ fontWeight: '600' }}>${formatValue(statistics.min)} – ${formatValue(statistics.max)}</span>
                            </div>
                        )}
                        {trend?.direction && (
                            <div>
                                <span className="text-muted" style={{ fontSize: '0.8rem' }}>Trend </span>
                                <span style={{ fontWeight: '600', color: getSignalColor(trend.direction) }}>
                                    {trend.direction?.toUpperCase()}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 3. Technical indicators – compact, below everything else */}
            {hasAnalytics && technical_indicators && (technical_indicators.rsi?.value != null || technical_indicators.macd?.macd_line != null || technical_indicators.bollinger_bands?.middle != null) && (
                <div style={{
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)'
                }}>
                    <h3 style={{ fontSize: '0.85rem', marginTop: 0, marginBottom: '0.6rem', color: 'var(--text-muted)' }}>
                        Technical indicators
                    </h3>
                    <Link to="/faq#technical-indicators" style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', marginBottom: '0.5rem', display: 'inline-block' }}>
                        What do RSI, MACD &amp; Bollinger Bands mean? →
                    </Link>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.8rem' }}>
                        {technical_indicators.rsi?.value != null && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                <span className="text-muted">RSI</span>
                                <span style={{ fontWeight: '600', color: getRSIColor(technical_indicators.rsi.value) }}>
                                    {formatValue(technical_indicators.rsi.value)}
                                </span>
                            </div>
                        )}
                        {technical_indicators.macd?.macd_line != null && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                <span className="text-muted">MACD</span>
                                <span style={{ fontWeight: '600' }}>{formatValue(technical_indicators.macd.macd_line)}</span>
                            </div>
                        )}
                        {technical_indicators.bollinger_bands?.middle != null && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                <span className="text-muted">BB mid</span>
                                <span style={{ fontWeight: '600' }}>${formatValue(technical_indicators.bollinger_bands.middle)}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <Link to="/faq" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none' }}>
                    FAQ: indicators, statistics &amp; budgeting →
                </Link>
            </div>
        </div>
    );
}

export default StockAnalytics;
