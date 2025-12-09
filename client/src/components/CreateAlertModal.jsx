import { useState } from 'react';
import axios from 'axios';

function CreateAlertModal({ symbol, onClose, currentPrice }) {
    const [targetPrice, setTargetPrice] = useState(currentPrice);
    const [direction, setDirection] = useState('up');
    const [alertMethod, setAlertMethod] = useState('email');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await axios.post('/api/alerts/create', {
                symbol,
                target_price: targetPrice,
                direction,
                alert_method: alertMethod
            });
            onClose(true); // Success
        } catch (err) {
            setError(err.response?.data?.error || "Failed to set alert");
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="card glass-card" style={{ width: '400px', maxWidth: '90%' }}>
                <h3 style={{ marginTop: 0 }}>Set Alert for {symbol}</h3>
                <p className="text-muted">Current Price: ${currentPrice}</p>

                {error && <div className="text-danger" style={{ marginBottom: '1rem' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label className="input-label">Target Price ($)</label>
                        <input
                            type="number" step="0.01"
                            className="input-field"
                            value={targetPrice}
                            onChange={(e) => setTargetPrice(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Notification Method</label>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="alertMethod"
                                    value="email"
                                    checked={alertMethod === 'email'}
                                    onChange={(e) => setAlertMethod(e.target.value)}
                                    style={{ marginRight: '0.5rem' }}
                                />
                                Email
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="alertMethod"
                                    value="sms"
                                    checked={alertMethod === 'sms'}
                                    onChange={(e) => setAlertMethod(e.target.value)}
                                    style={{ marginRight: '0.5rem' }}
                                />
                                Text
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="alertMethod"
                                    value="both"
                                    checked={alertMethod === 'both'}
                                    onChange={(e) => setAlertMethod(e.target.value)}
                                    style={{ marginRight: '0.5rem' }}
                                />
                                Both
                            </label>
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="input-label">Alert Me When Price Is</label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="direction"
                                    value="up"
                                    checked={direction === 'up'}
                                    onChange={(e) => setDirection(e.target.value)}
                                    style={{ marginRight: '0.5rem' }}
                                />
                                Above Target
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                <input
                                    type="radio"
                                    name="direction"
                                    value="down"
                                    checked={direction === 'down'}
                                    onChange={(e) => setDirection(e.target.value)}
                                    style={{ marginRight: '0.5rem' }}
                                />
                                Below Target
                            </label>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                        <button type="button" onClick={() => onClose(false)} className="btn btn-outline">Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Saving...' : 'Set Alert'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CreateAlertModal;
