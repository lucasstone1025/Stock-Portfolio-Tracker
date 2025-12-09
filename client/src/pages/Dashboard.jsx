import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function Dashboard() {
    const [data, setData] = useState({ firstName: '', watchlistCount: 0, alertsCount: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('/api/dashboard')
            .then(res => {
                setData(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div>Loading...</div>;

    const DashboardRow = ({ title, description, stats, link, color }) => (
        <Link to={link} style={{ textDecoration: 'none' }}>
            <div className="card glass-card hover-card" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                borderLeft: `5px solid ${color}`,
                padding: '2rem'
            }}>
                <div>
                    <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem' }}>{title}</h2>
                    <p className="text-muted" style={{ margin: 0, fontSize: '1.1rem' }}>{description}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: color }}>{stats}</div>
                    <div style={{ color: 'var(--text-muted)' }}>Active Items</div>
                </div>
            </div>
        </Link>
    );

    const ActionRow = ({ title, description, link, color, icon }) => (
        <Link to={link} style={{ textDecoration: 'none' }}>
            <div className="card glass-card hover-card" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                borderLeft: `5px solid ${color}`,
                padding: '2rem'
            }}>
                <div>
                    <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem' }}>{title}</h2>
                    <p className="text-muted" style={{ margin: 0, fontSize: '1.1rem' }}>{description}</p>
                </div>
                <div style={{ fontSize: '2rem', color: color }}>
                    {icon}
                </div>
            </div>
        </Link>
    );

    return (
        <div>
            <h1 style={{ marginBottom: '2rem', fontSize: '2.5rem' }}>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {data.firstName}</h1>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <DashboardRow
                    title="My Watchlist"
                    description="Track your favorite stocks and monitor their performance."
                    stats={data.watchlistCount}
                    link="/watchlist"
                    color="var(--primary)"
                />

                <DashboardRow
                    title="Active Alerts"
                    description="Manage your price targets and notification preferences."
                    stats={data.alertsCount}
                    link="/alerts"
                    color="#f59e0b" // Amber/Orange
                />

                <ActionRow
                    title="Search Stocks"
                    description="Lookup a specific ticker symbol to verify its current status."
                    link="/search"
                    color="var(--success)"
                    icon="🔍"
                />

                <ActionRow
                    title="Discover Stocks"
                    description="Use our screener to find new investment opportunities."
                    link="/find-stocks"
                    color="#8b5cf6" // Purple
                    icon="🚀"
                />
            </div>
        </div>
    );
}

export default Dashboard;
