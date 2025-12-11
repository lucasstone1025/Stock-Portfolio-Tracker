import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function Watchlist() {
    const [watchlist, setWatchlist] = useState({ stocks: [], filter: 'def', capFilter: null });
    const [loading, setLoading] = useState(true);

    const fetchWatchlist = (filter = 'def', capFilter = null) => {
        setLoading(true);
        axios.get('/api/watchlist', { params: { filter, capFilter } })
            .then(res => {
                setWatchlist(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchWatchlist();
    }, []);

    const handleRemove = async (symbol) => {
        if (!window.confirm(`Remove ${symbol} from watchlist?`)) return;
        try {
            await axios.post('/api/watchlist/delete', { symbol });
            fetchWatchlist(watchlist.filter, watchlist.capFilter);
        } catch (err) {
            console.error(err);
        }
    };

    const getChangeColor = (price, open) => {
        // Basic heuristic if we don't have change data directly: assuming generic color for now
        // If I had change data I'd use it.
        return 'var(--text-main)';
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>My Watchlist</h1>
                <Link to="/search" className="btn btn-primary">Add Stock</Link>
            </div>

            <div className="card glass-card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button onClick={() => fetchWatchlist('def')} className={`btn ${watchlist.filter === 'def' ? 'btn-primary' : 'btn-outline'}`}>Default</button>
                    <button onClick={() => fetchWatchlist('alpha')} className={`btn ${watchlist.filter === 'alpha' ? 'btn-primary' : 'btn-outline'}`}>A-Z</button>
                    <button onClick={() => fetchWatchlist('asc')} className={`btn ${watchlist.filter === 'asc' ? 'btn-primary' : 'btn-outline'}`}>Market Cap (Low-High)</button>
                    <button onClick={() => fetchWatchlist('desc')} className={`btn ${watchlist.filter === 'desc' ? 'btn-primary' : 'btn-outline'}`}>Market Cap (High-Low)</button>
                </div>
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : watchlist.stocks.length === 0 ? (
                <div className="text-center text-muted">Your watchlist is empty.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {watchlist.stocks.map(stock => (
                        <div key={stock.symbol} className="card glass-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <Link to={`/stock/${stock.symbol}`} style={{ fontWeight: 'bold', fontSize: '1.25rem', color: 'var(--primary)' }}>
                                    {stock.symbol}
                                </Link>
                                <span className="text-muted">{stock.sector}</span>
                            </div>
                            <div style={{ fontSize: '0.9rem', marginBottom: '1rem', height: '1.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {stock.companyname}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                <div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>${stock.currentprice}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mkt Cap: ${(stock.marketcap / 1000).toFixed(2)}B</div>
                                </div>
                                <button onClick={() => handleRemove(stock.symbol)} className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>Remove</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Watchlist;
