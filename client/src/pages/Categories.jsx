import { useState, useEffect } from 'react';
import axios from 'axios';
import { CategoryModal, CategoryList } from '../components/CategoryManager';

function Categories() {
    const [categories, setCategories] = useState([]);
    const [systemCategories, setSystemCategories] = useState([]);
    const [userCategories, setUserCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await axios.get('/api/categories');
            const allCategories = res.data.categories || [];
            setCategories(allCategories);
            setSystemCategories(allCategories.filter(c => c.is_system));
            setUserCategories(allCategories.filter(c => !c.is_system));
        } catch (err) {
            console.error('Error fetching categories:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (category) => {
        setEditingCategory(category);
        setShowModal(true);
    };

    const handleDelete = async (categoryId) => {
        if (!confirm('Are you sure you want to delete this category? Transactions using this category will become uncategorized.')) {
            return;
        }
        
        try {
            await axios.delete(`/api/categories/${categoryId}`);
            fetchCategories();
        } catch (err) {
            console.error('Error deleting category:', err);
            alert(err.response?.data?.error || 'Failed to delete category');
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingCategory(null);
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ margin: 0 }}>Categories</h1>
                <button
                    onClick={() => setShowModal(true)}
                    style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer'
                    }}
                >
                    + Create Category
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                        {categories.length}
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>Total Categories</div>
                </div>
                <div className="card glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>
                        {systemCategories.length}
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>System Categories</div>
                </div>
                <div className="card glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>
                        {userCategories.length}
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>Custom Categories</div>
                </div>
            </div>

            {/* User Categories */}
            <div className="card glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h2 style={{ marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>🏷️</span> Your Categories
                </h2>
                {userCategories.length > 0 ? (
                    <CategoryList
                        categories={userCategories}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        showActions={true}
                    />
                ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <p>No custom categories yet.</p>
                        <button
                            onClick={() => setShowModal(true)}
                            style={{
                                padding: '0.75rem 1.5rem',
                                backgroundColor: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                marginTop: '0.5rem'
                            }}
                        >
                            Create Your First Category
                        </button>
                    </div>
                )}
            </div>

            {/* System Categories */}
            <div className="card glass-card" style={{ padding: '1.5rem' }}>
                <h2 style={{ marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>📁</span> System Categories
                    <span style={{
                        fontSize: '0.75rem',
                        padding: '0.25rem 0.5rem',
                        backgroundColor: 'var(--border)',
                        borderRadius: '4px',
                        color: 'var(--text-muted)',
                        fontWeight: 'normal'
                    }}>
                        Cannot be edited
                    </span>
                </h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                    These categories are available to all users and are used for automatic transaction categorization.
                </p>
                <CategoryList
                    categories={systemCategories}
                    showActions={false}
                />
            </div>

            {/* Tips */}
            <div className="card" style={{
                padding: '1.5rem',
                marginTop: '1.5rem',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderLeft: '4px solid var(--primary)'
            }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>💡 Tips for Categories</h3>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-muted)' }}>
                    <li>Create custom categories for specific tracking needs (e.g., "Side Business", "Subscriptions")</li>
                    <li>Use colors to quickly identify categories in your transaction list</li>
                    <li>Transactions from connected bank accounts are automatically categorized</li>
                    <li>You can always change a transaction's category by clicking on it</li>
                </ul>
            </div>

            <CategoryModal
                isOpen={showModal}
                onClose={handleCloseModal}
                onSave={fetchCategories}
                category={editingCategory}
            />
        </div>
    );
}

export default Categories;

