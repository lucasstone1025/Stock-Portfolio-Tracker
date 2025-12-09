import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Search() {
    const [symbol, setSymbol] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!symbol) return;
        setLoading(true);
        setError('');
        setResult(null);

        try {
            const res = await axios.get('/api/search', { params: { symbol } });
            setResult(res.data.stock);
        } catch (err) {
            setError(err.response?.data?.error || 'Stock not found');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!result) return;
        try {
            await axios.post('/api/watchlist/add', result);
            navigate('/watchlist');
        } catch (err) {
            console.error(err);
            setError('Failed to add stock');
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h1 className="text-center" style={{ marginBottom: '2rem' }}>Find Stocks</h1>

            <div className="card glass-card">
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem' }}>
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Enter Stock Symbol (e.g., AAPL)"
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </form>
            </div>

            {error && <div className="text-danger text-center" style={{ marginTop: '1rem' }}>{error}</div>}

            {result && (
                <div className="card glass-card" style={{ marginTop: '2rem', animation: 'fadeIn 0.5s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                            <h2 style={{ margin: 0, color: 'var(--primary)' }}>{result.symbol}</h2>
                            <h4 style={{ margin: '0.25rem 0', color: 'var(--text-muted)' }}>{result.companyname}</h4>
                            <p className="text-muted">{result.sector}</p>
                        </div>
                        <div className="text-center">
                            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>${result.price}</div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', margin: '1.5rem 0', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem' }}>
                        <div>
                            <div className="text-muted" style={{ fontSize: '0.8rem' }}>Day High</div>
                            <div style={{ fontSize: '1.1rem' }}>${result.dayhigh}</div>
                        </div>
                        <div>
                            <div className="text-muted" style={{ fontSize: '0.8rem' }}>Day Low</div>
                            <div style={{ fontSize: '1.1rem' }}>${result.daylow}</div>
                        </div>
                        <div>
                            <div className="text-muted" style={{ fontSize: '0.8rem' }}>Market Cap</div>
                            <div style={{ fontSize: '1.1rem' }}>${(result.marketcap / 1000).toFixed(2)}B</div>
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
