import { useState, useEffect } from 'react';
import axios from 'axios';
import { CategorySelect } from '../components/CategoryManager';

const formatCurrency = (value) => {
    const absValue = Math.abs(value);
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(absValue);
};

const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

function TransactionRow({ transaction, categories, onCategoryChange, onDelete }) {
    const [editing, setEditing] = useState(false);
    const [categoryId, setCategoryId] = useState(transaction.category_id);

    const handleCategoryChange = async (newCategoryId) => {
        setCategoryId(newCategoryId);
        try {
            await axios.put(`/api/transactions/${transaction.id}/category`, {
                categoryId: newCategoryId
            });
            onCategoryChange();
            setEditing(false);
        } catch (err) {
            console.error('Error updating category:', err);
        }
    };

    const isExpense = transaction.amount < 0;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '1rem',
            borderBottom: '1px solid var(--border)',
            gap: '1rem'
        }}>
            {/* Category indicator */}
            <div style={{
                width: '8px',
                height: '40px',
                borderRadius: '4px',
                backgroundColor: transaction.category_color || 'var(--border)'
            }} />

            {/* Transaction details */}
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                    {transaction.merchant_name || transaction.name}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem' }}>
                    <span>{formatDate(transaction.date)}</span>
                    {transaction.institution_name && (
                        <span>• {transaction.institution_name} ···{transaction.account_mask}</span>
                    )}
                    {transaction.is_manual && <span>• Manual entry</span>}
                    {transaction.pending && (
                        <span style={{ color: '#f59e0b' }}>• Pending</span>
                    )}
                </div>
            </div>

            {/* Category */}
            <div style={{ minWidth: '150px' }}>
                {editing ? (
                    <CategorySelect
                        categories={categories}
                        value={categoryId}
                        onChange={handleCategoryChange}
                        placeholder="Select category"
                    />
                ) : (
                    <button
                        onClick={() => setEditing(true)}
                        style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: transaction.category_color ? `${transaction.category_color}20` : 'var(--bg-secondary)',
                            color: transaction.category_color || 'var(--text-muted)',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                        }}
                    >
                        {transaction.category_name || 'Uncategorized'}
                    </button>
                )}
            </div>

            {/* Amount */}
            <div style={{
                fontWeight: '600',
                fontSize: '1rem',
                color: isExpense ? 'var(--danger)' : 'var(--success)',
                minWidth: '100px',
                textAlign: 'right'
            }}>
                {isExpense ? '-' : '+'}{formatCurrency(transaction.amount)}
            </div>

            {/* Actions */}
            {transaction.is_manual && (
                <button
                    onClick={() => onDelete(transaction.id)}
                    style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: 'transparent',
                        color: 'var(--danger)',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1rem'
                    }}
                    title="Delete transaction"
                >
                    ×
                </button>
            )}
        </div>
    );
}

function AddTransactionModal({ isOpen, onClose, onSave, categories }) {
    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        categoryId: '',
        notes: '',
        isExpense: true
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const amount = formData.isExpense
                ? -Math.abs(parseFloat(formData.amount))
                : Math.abs(parseFloat(formData.amount));

            await axios.post('/api/transactions/manual', {
                name: formData.name,
                amount,
                date: formData.date,
                categoryId: formData.categoryId || null,
                notes: formData.notes || null
            });
            onSave();
            onClose();
            setFormData({
                name: '',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                categoryId: '',
                notes: '',
                isExpense: true
            });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add transaction');
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
            <div className="card glass-card" style={{ width: '100%', maxWidth: '450px', padding: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>Add Transaction</h3>
                <form onSubmit={handleSubmit}>
                    {/* Transaction Type Toggle */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, isExpense: true })}
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                backgroundColor: formData.isExpense ? 'var(--danger)' : 'var(--bg-secondary)',
                                color: formData.isExpense ? 'white' : 'var(--text-primary)'
                            }}
                        >
                            Expense
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, isExpense: false })}
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                backgroundColor: !formData.isExpense ? 'var(--success)' : 'var(--bg-secondary)',
                                color: !formData.isExpense ? 'white' : 'var(--text-primary)'
                            }}
                        >
                            Income
                        </button>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Description</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Grocery shopping"
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

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Amount</label>
                        <input
                            type="number"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
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

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Date</label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Category</label>
                        <CategorySelect
                            categories={categories}
                            value={formData.categoryId}
                            onChange={(val) => setFormData({ ...formData, categoryId: val })}
                            placeholder="Select category (optional)"
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Notes (optional)</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Add any notes..."
                            rows={2}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                resize: 'vertical'
                            }}
                        />
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
                            {loading ? 'Adding...' : 'Add Transaction'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Transactions() {
    const [transactions, setTransactions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState({ remaining: 3, dailyLimit: 3 });

    // Filters
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        categoryId: '',
        accountId: '',
        search: ''
    });

    useEffect(() => {
        fetchInitialData();
        fetchSyncStatus();
    }, []);

    useEffect(() => {
        fetchTransactions();
    }, [filters]);

    const fetchSyncStatus = async () => {
        try {
            const res = await axios.get('/api/plaid/sync-status');
            setSyncStatus(res.data);
        } catch (err) {
            console.error('Error fetching sync status:', err);
        }
    };

    const fetchInitialData = async () => {
        try {
            const [categoriesRes, accountsRes] = await Promise.all([
                axios.get('/api/categories'),
                axios.get('/api/plaid/accounts')
            ]);
            setCategories(categoriesRes.data.categories || []);
            setAccounts(accountsRes.data.accounts || []);
        } catch (err) {
            console.error('Error fetching initial data:', err);
        }
    };

    const fetchTransactions = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.categoryId) params.append('categoryId', filters.categoryId);
            if (filters.accountId) params.append('accountId', filters.accountId);
            if (filters.search) params.append('search', filters.search);

            const res = await axios.get(`/api/transactions?${params.toString()}`);
            setTransactions(res.data.transactions || []);
        } catch (err) {
            console.error('Error fetching transactions:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        if (syncStatus.remaining <= 0) {
            alert('Daily sync limit reached (3 per day). Try again tomorrow.');
            return;
        }
        setSyncing(true);
        try {
            const res = await axios.post('/api/plaid/sync-all');
            if (res.data.remaining !== undefined) {
                setSyncStatus(prev => ({ ...prev, remaining: res.data.remaining }));
            }
            fetchTransactions();
        } catch (err) {
            console.error('Error syncing:', err);
            alert(err.response?.data?.error || 'Failed to sync transactions');
            fetchSyncStatus(); // Refresh status on error
        } finally {
            setSyncing(false);
        }
    };

    const handleDeleteTransaction = async (id) => {
        if (!confirm('Delete this transaction?')) return;
        try {
            await axios.delete(`/api/transactions/${id}`);
            fetchTransactions();
        } catch (err) {
            console.error('Error deleting transaction:', err);
        }
    };

    // Calculate totals
    const totals = transactions.reduce((acc, t) => {
        const amount = parseFloat(t.amount) || 0;
        if (amount < 0) acc.expenses += Math.abs(amount);
        else acc.income += amount;
        return acc;
    }, { income: 0, expenses: 0 });

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ margin: 0 }}>Transactions</h1>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={handleSync}
                        disabled={syncing || syncStatus.remaining <= 0}
                        title={syncStatus.remaining <= 0 ? 'Daily limit reached' : `${syncStatus.remaining} syncs remaining today`}
                        style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: 'var(--bg-secondary)',
                            color: syncStatus.remaining <= 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            cursor: syncing || syncStatus.remaining <= 0 ? 'not-allowed' : 'pointer',
                            opacity: syncStatus.remaining <= 0 ? 0.5 : 1
                        }}
                    >
                        {syncing ? '🔄 Syncing...' : `🔄 Sync (${syncStatus.remaining})`}
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        + Add Transaction
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="card glass-card" style={{ padding: '1rem' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Income</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--success)' }}>
                        +{formatCurrency(totals.income)}
                    </div>
                </div>
                <div className="card glass-card" style={{ padding: '1rem' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Expenses</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--danger)' }}>
                        -{formatCurrency(totals.expenses)}
                    </div>
                </div>
                <div className="card glass-card" style={{ padding: '1rem' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Net</div>
                    <div style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        color: totals.income - totals.expenses >= 0 ? 'var(--success)' : 'var(--danger)'
                    }}>
                        {formatCurrency(totals.income - totals.expenses)}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card glass-card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>From</label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            style={{
                                padding: '0.5rem',
                                border: '1px solid var(--border)',
                                borderRadius: '6px',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>To</label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            style={{
                                padding: '0.5rem',
                                border: '1px solid var(--border)',
                                borderRadius: '6px',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem', opacity: 0 }}>Reset</label>
                        <button
                            onClick={() => setFilters({ ...filters, startDate: '', endDate: '' })}
                            disabled={!filters.startDate && !filters.endDate}
                            style={{
                                padding: '0.5rem 0.75rem',
                                backgroundColor: 'transparent',
                                color: filters.startDate || filters.endDate ? 'var(--primary)' : 'var(--text-muted)',
                                border: '1px solid var(--border)',
                                borderRadius: '6px',
                                cursor: filters.startDate || filters.endDate ? 'pointer' : 'not-allowed',
                                fontSize: '0.875rem',
                                opacity: filters.startDate || filters.endDate ? 1 : 0.5
                            }}
                        >
                            Reset Dates
                        </button>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Category</label>
                        <CategorySelect
                            categories={categories}
                            value={filters.categoryId}
                            onChange={(val) => setFilters({ ...filters, categoryId: val })}
                            placeholder="All categories"
                        />
                    </div>
                    {accounts.length > 0 && (
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Account</label>
                            <select
                                value={filters.accountId}
                                onChange={(e) => setFilters({ ...filters, accountId: e.target.value })}
                                style={{
                                    padding: '0.5rem',
                                    border: '1px solid var(--border)',
                                    borderRadius: '6px',
                                    backgroundColor: '#1a1a2e',
                                    color: '#e0e0e0'
                                }}
                            >
                                <option value="" style={{ backgroundColor: '#1a1a2e', color: '#e0e0e0' }}>All accounts</option>
                                {accounts.map((acc) => (
                                    <option key={acc.id} value={acc.id} style={{ backgroundColor: '#1a1a2e', color: '#e0e0e0' }}>
                                        {acc.institution_name} ···{acc.mask}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Search</label>
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            placeholder="Search transactions..."
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: '1px solid var(--border)',
                                borderRadius: '6px',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)'
                            }}
                        />
                    </div>
                    <button
                        onClick={() => setFilters({ startDate: '', endDate: '', categoryId: '', accountId: '', search: '' })}
                        style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: 'transparent',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* Transactions List */}
            <div className="card glass-card" style={{ overflow: 'hidden' }}>
                {transactions.length > 0 ? (
                    transactions.map((transaction) => (
                        <TransactionRow
                            key={transaction.id}
                            transaction={transaction}
                            categories={categories}
                            onCategoryChange={fetchTransactions}
                            onDelete={handleDeleteTransaction}
                        />
                    ))
                ) : (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <p>No transactions found.</p>
                        <p style={{ fontSize: '0.875rem' }}>
                            Connect a bank account or add transactions manually to get started.
                        </p>
                    </div>
                )}
            </div>

            <AddTransactionModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSave={fetchTransactions}
                categories={categories}
            />
        </div>
    );
}

export default Transactions;

