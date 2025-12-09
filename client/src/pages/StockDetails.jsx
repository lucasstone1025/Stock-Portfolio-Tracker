import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import CreateAlertModal from '../components/CreateAlertModal';

function StockDetails() {
    const { symbol } = useParams();
    const [stock, setStock] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [period, setPeriod] = useState('1w');
    const [loading, setLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(true);
    const [showAlertModal, setShowAlertModal] = useState(false);

    const [news, setNews] = useState([]);
    const [newsLoading, setNewsLoading] = useState(true);

    useEffect(() => {
        // Fetch Stock Details
        axios.get(`/api/stock/${symbol}`)
            .then(res => {
                setStock(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });

        // Fetch News
        setNewsLoading(true);
        axios.get(`/api/news/${symbol}`)
            .then(res => {
                setNews(res.data);
                setNewsLoading(false);
            })
            .catch(err => {
                console.error("Error fetching news:", err);
                setNewsLoading(false);
            });
    }, [symbol]);

    useEffect(() => {
        // Fetch Chart Data
        setChartLoading(true);
        axios.get(`/api/chart/${symbol}`, { params: { period } })
            .then(res => {
                // Assume res.data is the structure. We might need to transform it.
                // If it comes from Finnhub directly: { c: [], t: [] }
                // If processed by python script, it might be different.
                // Let's inspect: 
                const rawData = res.data;
                if (rawData.t && rawData.c) {
                    const formatted = rawData.t.map((timestamp, index) => ({
                        date: new Date(timestamp * 1000).toLocaleDateString(),
                        price: rawData.c[index]
                    }));
                    setChartData(formatted);
                } else if (rawData.labels && rawData.data) {
                    // Handle format from Python script: { labels: [], data: [] }
                    const formatted = rawData.labels.map((label, index) => ({
                        date: label,
                        price: rawData.data[index]
                    }));
                    setChartData(formatted);
                } else if (Array.isArray(rawData)) {
                    setChartData(rawData);
                } else {
                    // Fallback or Unknown format
                    console.log("Unknown chart data format", rawData);
                    setChartData([]);
                }
                setChartLoading(false);
            })
            .catch(err => {
                console.error(err);
                setChartLoading(false);
            });
    }, [symbol, period]);

    const addToWatchlist = async () => {
        try {
            await axios.post('/api/watchlist/add', {
                symbol: stock.symbol,
                companyname: stock.companyname,
                marketcap: stock.marketcap,
                price: stock.price,
                dayhigh: stock.dayhigh,
                daylow: stock.daylow,
                sector: stock.sector
            });
            alert('Added to watchlist!');
        } catch (err) {
            console.error('Error adding to watchlist:', err);
            alert('Failed to add to watchlist');
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!stock) return <div>Stock not found</div>;

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', alignItems: 'flex-start' }}>
                    <Link to="/watchlist" className="btn btn-outline">&larr; Back to Watchlist</Link>
                    <Link to="/find-stocks" className="btn btn-outline">&larr; Back to Discover</Link>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ margin: 0 }}>{stock.symbol}</h1>
                        <h3 style={{ margin: 0, color: 'var(--text-muted)' }}>{stock.companyname}</h3>
                        <span className="text-muted">{stock.sector}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <h1 style={{ margin: 0 }}>${stock.price}</h1>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <div>High: ${stock.dayhigh}</div>
                            <div>Low: ${stock.daylow}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                            <button
                                className="btn btn-success"
                                onClick={addToWatchlist}
                            >
                                Add to Watchlist
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowAlertModal(true)}
                            >
                                Set Alert
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {showAlertModal && (
                <CreateAlertModal
                    symbol={stock.symbol}
                    currentPrice={stock.price}
                    onClose={() => setShowAlertModal(false)}
                />
            )}

            <div className="card glass-card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', justifyContent: 'flex-end' }}>
                    {['1d', '1w', '1m', '3m', '6m'].map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`btn ${period === p ? 'btn-primary' : 'btn-outline'}`}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}
                        >
                            {p.toUpperCase()}
                        </button>
                    ))}
                </div>

                <div style={{ height: '400px', width: '100%' }}>
                    {chartLoading ? (
                        <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>Loading Chart...</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 12 }} minTickGap={30} />
                                <YAxis domain={['auto', 'auto']} stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-main)' }}
                                    itemStyle={{ color: 'var(--primary)' }}
                                    formatter={(value) => [`$${value}`, 'Price']}
                                />
                                <Line type="monotone" dataKey="price" stroke="var(--success)" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            <h2 style={{ marginBottom: '1rem' }}>Latest News</h2>
            {newsLoading ? (
                <div>Loading News...</div>
            ) : news.length === 0 ? (
                <div className="text-muted">No news found for this stock.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: '1.5rem' }}>
                    {news.map(item => (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" key={item.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div className="card hover-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                {item.image && (
                                    <div style={{ height: '150px', overflow: 'hidden', borderRadius: '8px 8px 0 0', marginBottom: '1rem' }}>
                                        <img src={item.image} alt={item.headline} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                )}
                                <div style={{ flex: 1 }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold' }}>{item.source}</span>
                                    <h3 style={{ fontSize: '1.1rem', margin: '0.5rem 0' }}>{item.headline}</h3>
                                    <p className="text-muted" style={{ fontSize: '0.9rem' }}>{new Date(item.datetime * 1000).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}

export default StockDetails;
