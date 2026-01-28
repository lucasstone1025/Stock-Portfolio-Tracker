import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { formatMarketCap } from '../utils/formatters';

const SUGGEST_DEBOUNCE_MS = 280;

function Search() {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [suggestOpen, setSuggestOpen] = useState(false);
    const [suggestLoading, setSuggestLoading] = useState(false);
    const [selectedSymbol, setSelectedSymbol] = useState(null);
    const [stock, setStock] = useState(null);
    const [stockLoading, setStockLoading] = useState(false);
    const [error, setError] = useState('');
    const debounceRef = useRef(null);
    const containerRef = useRef(null);
    const navigate = useNavigate();

    const fetchSuggestions = useCallback(async (q) => {
        if (!q.trim()) {
            setSuggestions([]);
            return;
        }
        setSuggestLoading(true);
        try {
            const { data } = await axios.get('/api/search/suggest', { params: { q: q.trim() } });
            setSuggestions(data.results || []);
            setSuggestOpen(true);
        } catch (e) {
            setSuggestions([]);
        } finally {
            setSuggestLoading(false);
        }
    }, []);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!query.trim()) {
            setSuggestions([]);
            setSuggestOpen(false);
            return;
        }
        debounceRef.current = setTimeout(() => fetchSuggestions(query), SUGGEST_DEBOUNCE_MS);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [query, fetchSuggestions]);

    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) setSuggestOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = async (item) => {
        const sym = item.symbol || item.displaySymbol;
        if (!sym) return;
        setSelectedSymbol(sym);
        setSuggestOpen(false);
        setQuery('');
        setSuggestions([]);
        setError('');
        setStock(null);
        setStockLoading(true);
        try {
            const { data } = await axios.get(`/api/stock/${sym}`);
            setStock(data);
        } catch (e) {
            setError(e.response?.data?.error || 'Could not load stock.');
        } finally {
            setStockLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!stock) return;
        try {
            await axios.post('/api/watchlist/add', stock);
            navigate('/watchlist');
        } catch (err) {
            console.error(err);
            setError('Failed to add stock');
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h1 className="text-center" style={{ marginBottom: '2rem' }}>Find Stocks</h1>

            <div className="card glass-card" ref={containerRef} style={{ position: 'relative' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Search by company name or ticker (e.g. Cloudflare, AAPL)"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => query.trim() && suggestions.length > 0 && setSuggestOpen(true)}
                        autoComplete="off"
                    />
                    {suggestOpen && (query.trim() || suggestions.length > 0) && (
                        <div
                            style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                marginTop: '2px',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                borderRadius: '0.5rem',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                                zIndex: 10,
                                maxHeight: '320px',
                                overflowY: 'auto'
                            }}
                        >
                            {suggestLoading ? (
                                <div className="text-muted" style={{ padding: '1rem', textAlign: 'center' }}>Searching…</div>
                            ) : suggestions.length === 0 ? (
                                <div className="text-muted" style={{ padding: '1rem', textAlign: 'center' }}>
                                    No matches. Try a company name or ticker.
                                </div>
                            ) : (
                                suggestions.map((s, i) => (
                                    <button
                                        key={`${s.symbol}-${i}`}
                                        type="button"
                                        onClick={() => handleSelect(s)}
                                        style={{
                                            display: 'block',
                                            width: '100%',
                                            padding: '0.75rem 1rem',
                                            textAlign: 'left',
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--text-main)',
                                            cursor: 'pointer',
                                            borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        <span style={{ fontWeight: '600', marginRight: '0.5rem' }}>{s.displaySymbol || s.symbol}</span>
                                        <span className="text-muted" style={{ fontSize: '0.9rem' }}>{s.description || s.symbol}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {error && <div className="text-danger text-center" style={{ marginTop: '1rem' }}>{error}</div>}

            {stockLoading && (
                <div className="text-muted text-center" style={{ marginTop: '1.5rem' }}>Loading…</div>
            )}

            {stock && !stockLoading && (
                <div className="card glass-card" style={{ marginTop: '2rem', animation: 'fadeIn 0.5s' }}>
                    <button
                        type="button"
                        onClick={() => { setStock(null); setSelectedSymbol(null); setError(''); }}
                        className="btn btn-outline"
                        style={{ marginBottom: '1rem', fontSize: '0.9rem' }}
                    >
                        ← Search another
                    </button>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                            <h2 style={{ margin: 0, color: 'var(--primary)' }}>{stock.symbol}</h2>
                            <h4 style={{ margin: '0.25rem 0', color: 'var(--text-muted)' }}>{stock.companyname}</h4>
                            <p className="text-muted">{stock.sector}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>${stock.price}</div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', margin: '1.5rem 0', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem' }}>
                        <div>
                            <div className="text-muted" style={{ fontSize: '0.8rem' }}>Day High</div>
                            <div style={{ fontSize: '1.1rem' }}>${stock.dayhigh}</div>
                        </div>
                        <div>
                            <div className="text-muted" style={{ fontSize: '0.8rem' }}>Day Low</div>
                            <div style={{ fontSize: '1.1rem' }}>${stock.daylow}</div>
                        </div>
                        <div>
                            <div className="text-muted" style={{ fontSize: '0.8rem' }}>Market Cap</div>
                            <div style={{ fontSize: '1.1rem' }}>{formatMarketCap(stock.marketcap)}</div>
                        </div>
                    </div>

                    <button onClick={handleAdd} className="btn btn-success" style={{ width: '100%' }}>
                        Add to Watchlist
                    </button>
                </div>
            )}
        </div>
    );
}

export default Search;
