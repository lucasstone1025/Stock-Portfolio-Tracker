import { Link } from 'react-router-dom';

function StockAnalytics({ analytics, loading, error }) {
    if (loading) {
        return (
            <div className="card glass-card" style={{ padding: '2rem', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="text-muted">Loading Analytics...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card glass-card" style={{ padding: '2rem', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="text-danger">Failed to load analytics</div>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="card glass-card" style={{ padding: '2rem', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="text-muted">No analytics data available</div>
            </div>
        );
    }

    const { technical_indicators, statistics, volatility, trend, prediction } = analytics;

    const formatValue = (value) => {
        if (value === null || value === undefined) return 'N/A';
        return typeof value === 'number' ? value.toFixed(2) : value;
    };

    const getRSIColor = (rsi) => {
        if (!rsi) return 'var(--text-muted)';
        if (rsi > 70) return 'var(--danger)'; // Overbought
        if (rsi < 30) return 'var(--success)'; // Oversold
        return 'var(--text-main)';
    };

    const getSignalColor = (signal) => {
        if (signal === 'bullish' || signal === 'up') return 'var(--success)';
        if (signal === 'bearish' || signal === 'down') return 'var(--danger)';
        return 'var(--text-muted)';
    };

    return (
        <div className="card glass-card" style={{ 
            padding: '1.5rem', 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            overflowY: 'auto',
            maxHeight: '600px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Analytics</h2>
                <Link to="/faq" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none' }}>
                    Learn more →
                </Link>
            </div>
            
            {/* Quick Summary - Key Metrics */}
            <div style={{ 
                marginBottom: '2rem', 
                padding: '1rem', 
                backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                borderRadius: '0.5rem',
                border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
                <h3 style={{ fontSize: '1rem', marginTop: 0, marginBottom: '1rem', color: 'var(--primary)' }}>
                    Quick Summary
                </h3>
                
                {/* Volatility */}
                {volatility !== null && volatility !== undefined && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span className="text-muted" style={{ fontSize: '0.9rem' }}>Volatility</span>
                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                            {formatValue(volatility)}%
                        </span>
                    </div>
                )}

                {/* Trend Direction */}
                {trend && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span className="text-muted" style={{ fontSize: '0.9rem' }}>Trend</span>
                        <span style={{ color: getSignalColor(trend.direction), fontWeight: 'bold', fontSize: '1.1rem' }}>
                            {trend.direction?.toUpperCase()}
                        </span>
                    </div>
                )}

                {/* RSI Signal */}
                {technical_indicators?.rsi && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="text-muted" style={{ fontSize: '0.9rem' }}>RSI Signal</span>
                        <span style={{ 
                            color: getRSIColor(technical_indicators.rsi.value), 
                            fontWeight: 'bold',
                            fontSize: '1.1rem'
                        }}>
                            {technical_indicators.rsi.signal?.toUpperCase()}
                        </span>
                    </div>
                )}
            </div>

            {/* Technical Indicators - Simplified */}
            {technical_indicators && (
                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
                        Technical Indicators
                    </h3>
                    
                    {/* RSI - Simplified */}
                    {technical_indicators.rsi && technical_indicators.rsi.value && (
                        <div style={{ 
                            marginBottom: '1rem', 
                            padding: '0.75rem', 
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '0.375rem'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span style={{ fontWeight: '500' }}>RSI</span>
                                <span style={{ color: getRSIColor(technical_indicators.rsi.value), fontWeight: 'bold', fontSize: '1.1rem' }}>
                                    {formatValue(technical_indicators.rsi.value)}
                                </span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Signal: <span style={{ color: getSignalColor(technical_indicators.rsi.signal) }}>
                                    {technical_indicators.rsi.signal?.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* MACD - Simplified */}
                    {technical_indicators.macd && technical_indicators.macd.macd_line && (
                        <div style={{ 
                            marginBottom: '1rem', 
                            padding: '0.75rem', 
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '0.375rem'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span style={{ fontWeight: '500' }}>MACD</span>
                                <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                    {formatValue(technical_indicators.macd.macd_line)}
                                </span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Trend: <span style={{ color: getSignalColor(technical_indicators.macd.signal) }}>
                                    {technical_indicators.macd.signal?.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Bollinger Bands - Simplified */}
                    {technical_indicators.bollinger_bands && technical_indicators.bollinger_bands.middle && (
                        <div style={{ 
                            padding: '0.75rem', 
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '0.375rem'
                        }}>
                            <div style={{ fontWeight: '500', marginBottom: '0.5rem' }}>Bollinger Bands</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                <div>Upper: ${formatValue(technical_indicators.bollinger_bands.upper)}</div>
                                <div>Middle: ${formatValue(technical_indicators.bollinger_bands.middle)}</div>
                                <div>Lower: ${formatValue(technical_indicators.bollinger_bands.lower)}</div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Statistics - Cleaned up */}
            {statistics && (
                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
                        Price Statistics
                    </h3>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr', 
                        gap: '0.75rem',
                        padding: '1rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '0.375rem'
                    }}>
                        <div>
                            <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Average</div>
                            <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>${formatValue(statistics.mean)}</div>
                        </div>
                        <div>
                            <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Median</div>
                            <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>${formatValue(statistics.median)}</div>
                        </div>
                        <div>
                            <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Low</div>
                            <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>${formatValue(statistics.min)}</div>
                        </div>
                        <div>
                            <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>High</div>
                            <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>${formatValue(statistics.max)}</div>
                        </div>
                        <div>
                            <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Range</div>
                            <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>${formatValue(statistics.range)}</div>
                        </div>
                        <div>
                            <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Std Dev</div>
                            <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>${formatValue(statistics.std)}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Trend Analysis - Improved */}
            {trend && (
                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
                        Trend Analysis
                    </h3>
                    <div style={{ 
                        padding: '1rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '0.375rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <span className="text-muted" style={{ fontSize: '0.9rem' }}>Direction</span>
                            <span style={{ color: getSignalColor(trend.direction), fontWeight: 'bold', fontSize: '1.1rem' }}>
                                {trend.direction?.toUpperCase()}
                            </span>
                        </div>
                        {trend.r_squared !== undefined && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="text-muted" style={{ fontSize: '0.9rem' }}>R² (Fit)</span>
                                <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                    {formatValue(trend.r_squared)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Prediction - Improved */}
            {prediction && (
                <div style={{ marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
                        Prediction
                    </h3>
                    <div style={{ 
                        padding: '1rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '0.375rem'
                    }}>
                        <div style={{ marginBottom: '0.75rem' }}>
                            <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>Next Day Price</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                ${formatValue(prediction.predicted_price)}
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="text-muted" style={{ fontSize: '0.85rem' }}>Confidence</span>
                            <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                {formatValue(prediction.confidence)}%
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <Link 
                    to="/faq" 
                    style={{ 
                        fontSize: '0.85rem', 
                        color: 'var(--primary)', 
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                    }}
                >
                    Need help understanding these metrics? Visit FAQ →
                </Link>
            </div>
        </div>
    );
}

export default StockAnalytics;
