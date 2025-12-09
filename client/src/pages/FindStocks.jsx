import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import NewsCard from '../components/NewsCard';

function FindStocks() {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // const [searchTerm, setSearchTerm] = useState(''); // If I decide to add search here
    const navigate = useNavigate();

    useEffect(() => {
        const fetchNews = async () => {
            try {
                setLoading(true);
                // The backend API we just created
                const res = await axios.get('/api/news');
                // Ensure it is an array
                if (Array.isArray(res.data)) {
                    setNews(res.data);
                } else {
                    console.error("News data is not an array:", res.data);
                    setNews([]);
                }
            } catch (err) {
                console.error("Failed to fetch news:", err);
                setError('Failed to load market news. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchNews();
    }, []);

    const popularStocks = [
        { symbol: 'SPY', name: 'S&P 500' },
        { symbol: 'QQQ', name: 'Nasdaq 100' },
        { symbol: 'NVDA', name: 'Nvidia' },
        { symbol: 'AAPL', name: 'Apple' },
        { symbol: 'TSLA', name: 'Tesla' },
        { symbol: 'AMD', name: 'AMD' },
        { symbol: 'MSFT', name: 'Microsoft' },
        { symbol: 'AMZN', name: 'Amazon' },
    ];

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '2rem' }}>
            <h1 className="text-center" style={{ marginBottom: '2rem', fontSize: '2.5rem', background: 'linear-gradient(to right, #3b82f6, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Discover Page
            </h1>

            {/* Popular Stocks Section */}
            <div style={{ marginBottom: '3rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', borderLeft: '4px solid var(--primary)', paddingLeft: '1rem' }}>Trending Assets</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                    {popularStocks.map(stock => (
                        <div
                            key={stock.symbol}
                            className="card glass-card"
                            style={{
                                padding: '1rem',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                border: '1px solid var(--border)'
                            }}
                            onClick={() => navigate(`/stock/${stock.symbol}`)}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = 'var(--primary)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = 'var(--border)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--text-main)' }}>{stock.symbol}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{stock.name}</div>
                        </div>
                    ))}
                    {/* Search "More" Card */}
                    <div
                        className="card glass-card"
                        style={{
                            padding: '1rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        onClick={() => navigate(`/search`)}
                        onMouseEnter={e => {
                            e.currentTarget.style.borderColor = 'var(--primary)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.borderColor = 'var(--border)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>Search More 🔍</div>
                    </div>
                </div>
            </div>

            {/* News Section */}
            <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', borderLeft: '4px solid var(--success)', paddingLeft: '1rem' }}>Latest Market News</h2>

                {loading && <div className="text-center text-muted">Loading market news...</div>}

                {error && <div className="text-center text-danger">{error}</div>}

                {!loading && !error && news.length === 0 && (
                    <div className="text-center text-muted">No news available at the moment.</div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {news.map((item) => (
                        <NewsCard key={item.id} news={item} />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default FindStocks;
