import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import SpendingAnalytics from '../components/SpendingAnalytics';
import { CategorySelect } from '../components/CategoryManager';

const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(value);
};

function BudgetSummaryCard({ summary }) {
    if (!summary) return null;

    const progressColor = summary.percentUsed > 100 ? 'var(--danger)' :
                         summary.percentUsed > 80 ? 'var(--warning)' : 'var(--success)';

    return (
        <div className="card glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                    <h2 style={{ margin: 0 }}>Monthly Overview</h2>
                    <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                        {summary.startDate} - {summary.endDate}
                    </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Net Savings</div>
                    <div style={{
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: summary.netSavings >= 0 ? 'var(--success)' : 'var(--danger)'
                    }}>
                        {formatCurrency(summary.netSavings)}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Income</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--success)' }}>
                        {formatCurrency(summary.income)}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Spent</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--danger)' }}>
                        {formatCurrency(summary.totalSpent)}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Budget Remaining</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                        {formatCurrency(summary.totalRemaining)}
                    </div>
                </div>
            </div>

            {summary.totalBudget > 0 && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span>Budget Used</span>
                        <span>{summary.percentUsed.toFixed(0)}%</span>
                    </div>
                    <div style={{
                        height: '8px',
                        backgroundColor: 'var(--border)',
                        borderRadius: '4px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${Math.min(summary.percentUsed, 100)}%`,
                            backgroundColor: progressColor,
                            borderRadius: '4px',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                </div>
            )}
        </div>
    );
}

function BudgetCategoryCard({ category, onEdit, onDelete }) {
    const progressColor = category.percentUsed > 100 ? 'var(--danger)' :
                         category.percentUsed > 80 ? '#f59e0b' : 'var(--success)';

    return (
        <div className="card glass-card" style={{
            padding: '1rem',
            borderLeft: `4px solid ${category.categoryColor}`
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: category.categoryColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '0.75rem'
                    }}>
                        {category.categoryIcon?.substring(0, 2) || '📁'}
                    </div>
                    <span style={{ fontWeight: '500' }}>{category.categoryName}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => onEdit(category)}
                        style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: 'transparent',
                            color: 'var(--text-muted)',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                        }}
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => onDelete(category.id)}
                        style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: 'transparent',
                            color: 'var(--danger)',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                        }}
                    >
                        ×
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {formatCurrency(category.spent)} of {formatCurrency(category.budgetAmount)}
                </span>
                <span style={{
                    color: category.isOverBudget ? 'var(--danger)' : 'var(--text-muted)',
                    fontSize: '0.875rem',
                    fontWeight: category.isOverBudget ? '600' : '400'
                }}>
                    {category.isOverBudget ? 'Over by ' + formatCurrency(Math.abs(category.remaining)) : formatCurrency(category.remaining) + ' left'}
                </span>
            </div>

            <div style={{
                height: '6px',
                backgroundColor: 'var(--border)',
                borderRadius: '3px',
                overflow: 'hidden'
            }}>
                <div style={{
                    height: '100%',
                    width: `${Math.min(category.percentUsed, 100)}%`,
                    backgroundColor: progressColor,
                    borderRadius: '3px',
                    transition: 'width 0.3s ease'
                }} />
            </div>
        </div>
    );
}

function CreateBudgetModal({ isOpen, onClose, onSave, categories }) {
    const [categoryId, setCategoryId] = useState('');
    const [amount, setAmount] = useState('');
    const [periodType, setPeriodType] = useState('monthly');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await axios.post('/api/budgets', {
                categoryId: parseInt(categoryId),
                amount: parseFloat(amount),
                periodType
            });
            onSave();
            onClose();
            setCategoryId('');
            setAmount('');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create budget');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div className="card glass-card" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Create Budget</h3>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Category</label>
                        <CategorySelect
                            categories={categories}
                            value={categoryId}
                            onChange={setCategoryId}
                            placeholder="Select category"
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Amount</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            step="0.01"
                            min="0.01"
                            required
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Period</label>
                        <select
                            value={periodType}
                            onChange={(e) => setPeriodType(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                backgroundColor: '#1a1a2e',
                                color: '#e0e0e0'
                            }}
                        >
                            <option value="weekly" style={{ backgroundColor: '#1a1a2e', color: '#e0e0e0' }}>Weekly</option>
                            <option value="monthly" style={{ backgroundColor: '#1a1a2e', color: '#e0e0e0' }}>Monthly</option>
                            <option value="yearly" style={{ backgroundColor: '#1a1a2e', color: '#e0e0e0' }}>Yearly</option>
                        </select>
                    </div>

                    {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>}

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={onClose} style={{
                            padding: '0.75rem 1.5rem',
                            backgroundColor: 'transparent',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}>
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} style={{
                            padding: '0.75rem 1.5rem',
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}>
                            {loading ? 'Creating...' : 'Create Budget'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Budget() {
    const [summary, setSummary] = useState(null);
    const [categories, setCategories] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [periodType, setPeriodType] = useState('monthly');

    useEffect(() => {
        fetchData();
    }, [periodType]);

    const fetchData = async () => {
        try {
            const [summaryRes, categoriesRes, alertsRes] = await Promise.all([
                axios.get(`/api/budgets/summary?period=${periodType}`),
                axios.get('/api/categories'),
                axios.get('/api/budget/alerts')
            ]);
            setSummary(summaryRes.data);
            setCategories(categoriesRes.data.categories || []);
            setAlerts(alertsRes.data.alerts || []);
        } catch (err) {
            console.error('Error fetching budget data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteBudget = async (budgetId) => {
        if (!confirm('Are you sure you want to delete this budget?')) return;
        try {
            await axios.delete(`/api/budgets/${budgetId}`);
            fetchData();
        } catch (err) {
            console.error('Error deleting budget:', err);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ margin: 0 }}>Budget</h1>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <select
                        value={periodType}
                        onChange={(e) => setPeriodType(e.target.value)}
                        style={{
                            padding: '0.5rem 1rem',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            backgroundColor: '#1a1a2e',
                            color: '#e0e0e0'
                        }}
                    >
                        <option value="weekly" style={{ backgroundColor: '#1a1a2e', color: '#e0e0e0' }}>Weekly</option>
                        <option value="monthly" style={{ backgroundColor: '#1a1a2e', color: '#e0e0e0' }}>Monthly</option>
                        <option value="yearly" style={{ backgroundColor: '#1a1a2e', color: '#e0e0e0' }}>Yearly</option>
                    </select>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        + Add Budget
                    </button>
                </div>
            </div>

            {/* Alerts */}
            {alerts.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                    {alerts.map((alert, index) => (
                        <div key={index} className="card" style={{
                            padding: '1rem',
                            marginBottom: '0.5rem',
                            backgroundColor: alert.type === 'over_budget' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            borderLeft: `4px solid ${alert.type === 'over_budget' ? 'var(--danger)' : '#f59e0b'}`
                        }}>
                            <strong>{alert.categoryName}</strong>: {alert.type === 'over_budget'
                                ? `Over budget by ${formatCurrency(alert.spent - alert.budgetAmount)}`
                                : `${alert.percentUsed.toFixed(0)}% of budget used`}
                        </div>
                    ))}
                </div>
            )}

            <BudgetSummaryCard summary={summary} />

            {/* Budget Categories */}
            <h2 style={{ marginBottom: '1rem' }}>Category Budgets</h2>
            {summary?.categories?.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                    {summary.categories.map((cat) => (
                        <BudgetCategoryCard
                            key={cat.id}
                            category={cat}
                            onEdit={() => {/* TODO: Edit modal */}}
                            onDelete={handleDeleteBudget}
                        />
                    ))}
                </div>
            ) : (
                <div className="card glass-card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '2rem' }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        No budgets set up yet. Create your first budget to start tracking your spending.
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        style={{
                            padding: '0.75rem 1.5rem',
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        Create Your First Budget
                    </button>
                </div>
            )}

            {/* Quick Links */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <Link to="/transactions" style={{ textDecoration: 'none' }}>
                    <div className="card glass-card hover-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💳</div>
                        <h3 style={{ margin: 0 }}>Transactions</h3>
                        <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>View all transactions</p>
                    </div>
                </Link>
                <Link to="/categories" style={{ textDecoration: 'none' }}>
                    <div className="card glass-card hover-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏷️</div>
                        <h3 style={{ margin: 0 }}>Categories</h3>
                        <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0 0' }}>Manage categories</p>
                    </div>
                </Link>
            </div>

            {/* Analytics */}
            <h2 style={{ marginBottom: '1rem' }}>Spending Analytics</h2>
            <SpendingAnalytics />

            <CreateBudgetModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSave={fetchData}
                categories={categories}
            />
        </div>
    );
}

export default Budget;

