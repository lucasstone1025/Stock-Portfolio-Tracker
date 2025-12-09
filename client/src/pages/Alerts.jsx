import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function Alerts() {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchAlerts();
    }, []);

    const fetchAlerts = async () => {
        try {
            const res = await axios.get('/api/alerts');
            setAlerts(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setError('Failed to load alerts');
            setLoading(false);
        }
    };

    const handleDelete = async (alertId) => {
        if (!window.confirm("Are you sure you want to delete this alert?")) return;
        try {
            await axios.post('/api/alerts/delete', { alert_id: alertId });
            setAlerts(alerts.filter(a => a.id !== alertId));
        } catch (err) {
            console.error(err);
            alert("Failed to delete alert");
        }
    };

    const [checking, setChecking] = useState(false);
    const handleManualCheck = async () => {
        setChecking(true);
        try {
            await axios.post('/api/alerts/check');
            // Optional: Reload alerts to see if any triggered status changed (though triggered alerts remain until deleted or reset)
            alert("Alert check triggered! You will receive notifications if any alerts are met.");
        } catch (err) {
            console.error(err);
            alert("Failed to trigger alert check");
        } finally {
            setChecking(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ margin: 0 }}>Active Alerts</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={handleManualCheck}
                        className="btn btn-outline"
                        style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                        disabled={checking}
                    >
                        {checking ? 'Checking...' : 'Check Now'}
                    </button>
                    <Link to="/watchlist" className="btn btn-primary">Create New Alert via Watchlist</Link>
                </div>
            </div>

            {error && <div className="text-danger">{error}</div>}

            {alerts.length === 0 ? (
                <div className="card glass-card text-center">
                    <p className="text-muted" style={{ marginBottom: '1rem' }}>You have no active alerts.</p>
                    <Link to="/watchlist" className="btn btn-outline">Go to Watchlist</Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: '1.5rem' }}>
                    {alerts.map(alert => (
                        <div key={alert.id} className="card glass-card" style={{ position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{alert.symbol}</h2>
                                    <span className="text-muted">Target: ${alert.target_price}</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 'bold', color: alert.currentprice >= alert.target_price ? 'var(--success)' : 'var(--danger)' }}>
                                        ${alert.currentprice}
                                    </div>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Current</span>
                                </div>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                                    Condition: <strong>{alert.direction === 'up' ? 'Rises Above' : 'Falls Below'}</strong>
                                </div>
                                <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                                    Method: <strong>{alert.alert_method === 'sms' ? 'Text' : alert.alert_method === 'both' ? 'Email & Text' : 'Email'}</strong>
                                </div>
                            </div>

                            <button
                                onClick={() => handleDelete(alert.id)}
                                className="btn btn-outline"
                                style={{ width: '100%', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                            >
                                Delete Alert
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Alerts;
