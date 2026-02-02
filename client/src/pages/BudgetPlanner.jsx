import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(value);
};

// Category groupings based on system categories
const CATEGORY_GROUPS = {
    Essentials: ['Food & Dining', 'Groceries', 'Home', 'Bills & Utilities', 'Transportation', 'Gas & Fuel', 'Health & Medical', 'Insurance'],
    Lifestyle: ['Shopping', 'Entertainment', 'Personal Care', 'Travel', 'Education', 'Gifts & Donations'],
    Financial: ['Investments', 'Fees & Charges'],
    Other: ['Transfer', 'Other']
};

// Excluded categories (not for spending allocation)
const EXCLUDED_CATEGORIES = ['Income'];

function BudgetPlanner() {
    const navigate = useNavigate();
    const [totalBudget, setTotalBudget] = useState('');
    const [periodType, setPeriodType] = useState('monthly');
    const [categories, setCategories] = useState([]);
    const [allocations, setAllocations] = useState({});
    const [existingBudgets, setExistingBudgets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, [periodType]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [categoriesRes, budgetsRes] = await Promise.all([
                axios.get('/api/categories'),
                axios.get('/api/budgets')
            ]);

            const allCategories = categoriesRes.data.categories || [];
            // Filter out excluded categories
            const filteredCategories = allCategories.filter(
                cat => !EXCLUDED_CATEGORIES.includes(cat.name)
            );
            setCategories(filteredCategories);

            const budgets = budgetsRes.data.budgets || [];
            setExistingBudgets(budgets);

            // Initialize allocations from existing budgets
            const initialAllocations = {};
            filteredCategories.forEach(cat => {
                const existingBudget = budgets.find(
                    b => b.category_id === cat.id && b.period_type === periodType
                );
                initialAllocations[cat.id] = existingBudget ? existingBudget.amount.toString() : '';
            });
            setAllocations(initialAllocations);

            // Calculate total from existing budgets if no total set
            const existingTotal = budgets
                .filter(b => b.period_type === periodType)
                .reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
            if (existingTotal > 0 && !totalBudget) {
                setTotalBudget(existingTotal.toString());
            }
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load budget data');
        } finally {
            setLoading(false);
        }
    };

    const handleAllocationChange = (categoryId, value) => {
        setAllocations(prev => ({
            ...prev,
            [categoryId]: value
        }));
    };

    const getTotalAllocated = () => {
        return Object.values(allocations).reduce((sum, val) => {
            const num = parseFloat(val) || 0;
            return sum + num;
        }, 0);
    };

    const getRemaining = () => {
        const total = parseFloat(totalBudget) || 0;
        return total - getTotalAllocated();
    };

    const getPercentAllocated = () => {
        const total = parseFloat(totalBudget) || 0;
        if (total === 0) return 0;
        return (getTotalAllocated() / total) * 100;
    };

    const isOverBudget = () => {
        return getRemaining() < 0;
    };

    const getCategoriesByGroup = (groupName) => {
        const groupCategories = CATEGORY_GROUPS[groupName] || [];
        return categories.filter(cat => groupCategories.includes(cat.name));
    };

    const getUserCategories = () => {
        // Get categories that aren't in any predefined group
        const allGroupedNames = Object.values(CATEGORY_GROUPS).flat();
        return categories.filter(cat =>
            !allGroupedNames.includes(cat.name) &&
            !EXCLUDED_CATEGORIES.includes(cat.name)
        );
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);

        try {
            const allocationData = Object.entries(allocations)
                .map(([categoryId, amount]) => ({
                    categoryId: parseInt(categoryId),
                    amount: parseFloat(amount) || 0
                }));

            await axios.post('/api/budgets/bulk', {
                periodType,
                allocations: allocationData
            });

            navigate('/budget');
        } catch (err) {
            console.error('Error saving budget plan:', err);
            setError(err.response?.data?.error || 'Failed to save budget plan');
        } finally {
            setSaving(false);
        }
    };

    const renderCategoryCard = (category) => {
        const allocation = allocations[category.id] || '';

        return (
            <div
                key={category.id}
                className="card glass-card"
                style={{
                    padding: '1rem',
                    borderLeft: `4px solid ${category.color || '#6366f1'}`
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: category.color || '#6366f1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '0.75rem'
                    }}>
                        {category.icon?.substring(0, 2) || '📁'}
                    </div>
                    <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>{category.name}</span>
                </div>
                <div style={{ position: 'relative' }}>
                    <span style={{
                        position: 'absolute',
                        left: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)'
                    }}>$</span>
                    <input
                        type="number"
                        value={allocation}
                        onChange={(e) => handleAllocationChange(category.id, e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        style={{
                            width: '100%',
                            padding: '0.5rem 0.75rem 0.5rem 1.5rem',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontSize: '0.9rem'
                        }}
                    />
                </div>
            </div>
        );
    };

    const renderCategoryGroup = (groupName, groupCategories) => {
        if (groupCategories.length === 0) return null;

        return (
            <div key={groupName} style={{ marginBottom: '2rem' }}>
                <h3 style={{
                    fontSize: '0.875rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--text-muted)',
                    marginBottom: '1rem',
                    paddingBottom: '0.5rem',
                    borderBottom: '1px solid var(--border)'
                }}>
                    {groupName}
                </h3>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '1rem'
                }}>
                    {groupCategories.map(renderCategoryCard)}
                </div>
            </div>
        );
    };

    if (loading) return <div>Loading...</div>;

    const percentAllocated = getPercentAllocated();
    const progressColor = isOverBudget() ? 'var(--danger)' :
                         percentAllocated > 90 ? 'var(--warning)' : 'var(--success)';

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <Link
                    to="/budget"
                    style={{
                        color: 'var(--text-muted)',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    &larr; Back to Budget
                </Link>
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
            </div>

            <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>Budget Planner</h1>

            {/* Total Budget Input */}
            <div className="card glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    {periodType.charAt(0).toUpperCase() + periodType.slice(1)} Budget
                </label>
                <div style={{ position: 'relative', maxWidth: '300px' }}>
                    <span style={{
                        position: 'absolute',
                        left: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)',
                        fontSize: '1.25rem'
                    }}>$</span>
                    <input
                        type="number"
                        value={totalBudget}
                        onChange={(e) => setTotalBudget(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        style={{
                            width: '100%',
                            padding: '1rem 1rem 1rem 2rem',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontSize: '1.25rem',
                            fontWeight: '600'
                        }}
                    />
                </div>
            </div>

            {/* Allocation Summary */}
            <div className="card glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <h2 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Allocation Summary</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Allocated</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                            {formatCurrency(getTotalAllocated())}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Remaining</div>
                        <div style={{
                            fontSize: '1.25rem',
                            fontWeight: '600',
                            color: isOverBudget() ? 'var(--danger)' : 'var(--success)'
                        }}>
                            {formatCurrency(getRemaining())}
                        </div>
                    </div>
                </div>

                {parseFloat(totalBudget) > 0 && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.875rem' }}>
                                {isOverBudget() ? 'Over budget!' : 'Budget allocation'}
                            </span>
                            <span style={{ fontSize: '0.875rem' }}>
                                {Math.min(percentAllocated, 100).toFixed(0)}%
                            </span>
                        </div>
                        <div style={{
                            height: '8px',
                            backgroundColor: 'var(--border)',
                            borderRadius: '4px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${Math.min(percentAllocated, 100)}%`,
                                backgroundColor: progressColor,
                                borderRadius: '4px',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>
                    </>
                )}
            </div>

            {/* Category Allocations */}
            {renderCategoryGroup('Essentials', getCategoriesByGroup('Essentials'))}
            {renderCategoryGroup('Lifestyle', getCategoriesByGroup('Lifestyle'))}
            {renderCategoryGroup('Financial', getCategoriesByGroup('Financial'))}
            {renderCategoryGroup('Other', [...getCategoriesByGroup('Other'), ...getUserCategories()])}

            {/* Error Message */}
            {error && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderLeft: '4px solid var(--danger)',
                    borderRadius: '4px',
                    color: 'var(--danger)'
                }}>
                    {error}
                </div>
            )}

            {/* Action Buttons */}
            <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
                marginTop: '2rem',
                paddingBottom: '2rem'
            }}>
                <Link
                    to="/budget"
                    style={{
                        padding: '0.75rem 2rem',
                        backgroundColor: 'transparent',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        cursor: 'pointer'
                    }}
                >
                    Cancel
                </Link>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        padding: '0.75rem 2rem',
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        opacity: saving ? 0.7 : 1
                    }}
                >
                    {saving ? 'Saving...' : 'Save Budget Plan'}
                </button>
            </div>
        </div>
    );
}

export default BudgetPlanner;
