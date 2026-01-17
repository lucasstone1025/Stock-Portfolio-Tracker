import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
};

function Dashboard() {
    const [data, setData] = useState({ firstName: '', watchlistCount: 0, alertsCount: 0 });
    const [budgetSummary, setBudgetSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            axios.get('/api/dashboard'),
            axios.get('/api/budgets/summary').catch(() => ({ data: null }))
        ])
            .then(([dashRes, budgetRes]) => {
                setData(dashRes.data);
                setBudgetSummary(budgetRes.data);
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

                {/* Budget Summary Card */}
                <Link to="/budget" style={{ textDecoration: 'none' }}>
                    <div className="card glass-card hover-card" style={{
                        marginBottom: '1.5rem',
                        borderLeft: '5px solid #10b981',
                        padding: '2rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem' }}>Budget & Spending</h2>
                                <p className="text-muted" style={{ margin: 0, fontSize: '1.1rem' }}>
                                    Track your spending and manage your budget
                                </p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                {budgetSummary ? (
                                    <>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: budgetSummary.netSavings >= 0 ? '#10b981' : '#ef4444' }}>
                                            {formatCurrency(budgetSummary.netSavings)}
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Net This Month</div>
                                        {budgetSummary.totalBudget > 0 && (
                                            <div style={{ marginTop: '0.5rem' }}>
                                                <div style={{
                                                    width: '120px',
                                                    height: '6px',
                                                    backgroundColor: 'var(--border)',
                                                    borderRadius: '3px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{
                                                        height: '100%',
                                                        width: `${Math.min(budgetSummary.percentUsed, 100)}%`,
                                                        backgroundColor: budgetSummary.percentUsed > 100 ? '#ef4444' : budgetSummary.percentUsed > 80 ? '#f59e0b' : '#10b981',
                                                        borderRadius: '3px'
                                                    }} />
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                                    {budgetSummary.percentUsed.toFixed(0)}% of budget used
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div style={{ fontSize: '2rem' }}>💰</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Get Started</div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </Link>

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

                <ActionRow
                    title="FAQ & Help"
                    description="Learn about technical indicators and how to interpret analytics."
                    link="/faq"
                    color="#06b6d4" // Cyan
                    icon="❓"
                />
            </div>
        </div>
    );
}

export default Dashboard;
