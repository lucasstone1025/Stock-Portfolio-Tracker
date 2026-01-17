import { useState } from 'react';
import axios from 'axios';

const PRESET_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e',
    '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
    '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
];

const PRESET_ICONS = [
    'tag', 'shopping-cart', 'utensils', 'car', 'home',
    'film', 'heart', 'book', 'plane', 'gift',
    'dollar-sign', 'credit-card', 'briefcase', 'more-horizontal'
];

function CategoryModal({ isOpen, onClose, onSave, category = null }) {
    const [name, setName] = useState(category?.name || '');
    const [color, setColor] = useState(category?.color || '#6366f1');
    const [icon, setIcon] = useState(category?.icon || 'tag');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (category) {
                await axios.put(`/api/categories/${category.id}`, { name, color, icon });
            } else {
                await axios.post('/api/categories', { name, color, icon });
            }
            onSave();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save category');
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
            <div className="card glass-card" style={{
                width: '100%',
                maxWidth: '400px',
                padding: '2rem'
            }}>
                <h3 style={{ marginBottom: '1.5rem' }}>
                    {category ? 'Edit Category' : 'Create Category'}
                </h3>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                            Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Category name"
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
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                            Color
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {PRESET_COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        backgroundColor: c,
                                        border: color === c ? '3px solid var(--text-primary)' : '2px solid transparent',
                                        cursor: 'pointer'
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                            Icon
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {PRESET_ICONS.map((i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setIcon(i)}
                                    style={{
                                        padding: '0.5rem',
                                        borderRadius: '8px',
                                        backgroundColor: icon === i ? color : 'var(--bg-secondary)',
                                        color: icon === i ? 'white' : 'var(--text-primary)',
                                        border: '1px solid var(--border)',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    {i}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '0.75rem 1.5rem',
                                backgroundColor: 'transparent',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '0.75rem 1.5rem',
                                backgroundColor: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function CategoryList({ categories, onEdit, onDelete, showActions = true }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {categories.map((category) => (
                <div
                    key={category.id}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '0.75rem 1rem',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: '8px',
                        borderLeft: `4px solid ${category.color}`
                    }}
                >
                    <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: category.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '0.75rem'
                    }}>
                        {category.icon?.substring(0, 2) || '📁'}
                    </div>
                    <span style={{ flex: 1, fontWeight: '500' }}>{category.name}</span>
                    {category.is_system && (
                        <span style={{
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.5rem',
                            backgroundColor: 'var(--border)',
                            borderRadius: '4px',
                            color: 'var(--text-muted)'
                        }}>
                            System
                        </span>
                    )}
                    {showActions && !category.is_system && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => onEdit(category)}
                                style={{
                                    padding: '0.25rem 0.5rem',
                                    backgroundColor: 'transparent',
                                    color: 'var(--primary)',
                                    border: '1px solid var(--primary)',
                                    borderRadius: '4px',
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
                                    border: '1px solid var(--danger)',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem'
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

function CategorySelect({ categories, value, onChange, placeholder = "Select category" }) {
    return (
        <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
            style={{
                padding: '0.5rem',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                cursor: 'pointer'
            }}
        >
            <option value="">{placeholder}</option>
            {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                    {cat.name}
                </option>
            ))}
        </select>
    );
}

export { CategoryModal, CategoryList, CategorySelect };
export default CategoryList;

