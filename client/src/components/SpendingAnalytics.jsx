import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    LineChart, Line, Area, AreaChart
} from 'recharts';

const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
};

const formatMonth = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

function SpendingByCategory({ data }) {
    if (!data || data.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No spending data available
            </div>
        );
    }

    const total = data.reduce((sum, item) => sum + item.total, 0);

    return (
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <div style={{ width: '200px', height: '200px' }}>
                <ResponsiveContainer>
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="total"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color || '#6366f1'} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, maxHeight: '200px', overflowY: 'auto' }}>
                {data.map((item, index) => (
                    <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.5rem 0',
                        borderBottom: '1px solid var(--border)'
                    }}>
                        <div style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: item.color || '#6366f1'
                        }} />
                        <span style={{ flex: 1 }}>{item.name}</span>
                        <span style={{ fontWeight: '500' }}>{formatCurrency(item.total)}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            {((item.total / total) * 100).toFixed(0)}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function SpendingTrends({ data }) {
    if (!data || data.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No trend data available
            </div>
        );
    }

    const chartData = data.map(item => ({
        ...item,
        month: formatMonth(item.month)
    }));

    return (
        <div style={{ width: '100%', height: '250px' }}>
            <ResponsiveContainer>
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" stroke="var(--text-muted)" />
                    <YAxis stroke="var(--text-muted)" tickFormatter={formatCurrency} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Area
                        type="monotone"
                        dataKey="income"
                        stroke="#22c55e"
                        fill="url(#incomeGradient)"
                        name="Income"
                    />
                    <Area
                        type="monotone"
                        dataKey="spending"
                        stroke="#ef4444"
                        fill="url(#spendingGradient)"
                        name="Spending"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

function BudgetVsActual({ categories }) {
    if (!categories || categories.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No budget data available. Create budgets to see comparisons.
            </div>
        );
    }

    const chartData = categories.map(cat => ({
        name: cat.categoryName.length > 12 ? cat.categoryName.substring(0, 12) + '...' : cat.categoryName,
        budget: cat.budgetAmount,
        spent: cat.spent,
        color: cat.categoryColor
    }));

    return (
        <div style={{ width: '100%', height: '250px' }}>
            <ResponsiveContainer>
                <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" stroke="var(--text-muted)" tickFormatter={formatCurrency} />
                    <YAxis type="category" dataKey="name" stroke="var(--text-muted)" width={100} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="budget" fill="#6366f1" name="Budget" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="spent" fill="#f59e0b" name="Spent" radius={[0, 4, 4, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

function SpendingAnalytics({ compact = false }) {
    const [spendingByCategory, setSpendingByCategory] = useState([]);
    const [trends, setTrends] = useState([]);
    const [budgetSummary, setBudgetSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const [categoryRes, trendsRes, summaryRes] = await Promise.all([
                axios.get('/api/spending/by-category'),
                axios.get('/api/spending/trends'),
                axios.get('/api/budgets/summary')
            ]);
            
            setSpendingByCategory(categoryRes.data.spending || []);
            setTrends(trendsRes.data.trends || []);
            setBudgetSummary(summaryRes.data);
        } catch (err) {
            console.error('Error fetching analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div>Loading analytics...</div>;
    }

    if (compact) {
        return (
            <div className="card glass-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Spending Overview</h3>
                <SpendingByCategory data={spendingByCategory.slice(0, 5)} />
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card glass-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Spending by Category</h3>
                <SpendingByCategory data={spendingByCategory} />
            </div>

            <div className="card glass-card" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Income vs Spending Trends</h3>
                <SpendingTrends data={trends} />
            </div>

            {budgetSummary && budgetSummary.categories.length > 0 && (
                <div className="card glass-card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Budget vs Actual</h3>
                    <BudgetVsActual categories={budgetSummary.categories} />
                </div>
            )}
        </div>
    );
}

export { SpendingByCategory, SpendingTrends, BudgetVsActual };
export default SpendingAnalytics;

