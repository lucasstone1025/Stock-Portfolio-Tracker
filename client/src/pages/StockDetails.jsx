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

    if (loading) return <div>Loading...</div>;
    if (!stock) return <div>Stock not found</div>;

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <Link to="/watchlist" className="btn btn-outline" style={{ marginBottom: '1rem' }}>&larr; Back to Watchlist</Link>
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
                        <button
                            className="btn btn-primary"
                            style={{ marginTop: '1rem' }}
                            onClick={() => setShowAlertModal(true)}
                        >
                            Set Alert
                        </button>
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

            <div className="card glass-card">
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
        </div>
    );
}

export default StockDetails;
