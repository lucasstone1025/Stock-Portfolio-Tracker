import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function Dashboard() {
    const [data, setData] = useState(null);

    useEffect(() => {
        axios.get('/api/dashboard')
            .then(res => setData(res.data))
            .catch(err => console.error(err));
    }, []);

    if (!data) return <div>Loading...</div>;

    return (
        <div>
            <h1 style={{ marginBottom: '2rem' }}>Welcome back, {data.firstName}!</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2">
                <Link to="/watchlist">
                    <div className="card hover-card" style={{ cursor: 'pointer', borderColor: 'var(--primary)' }}>
                        <h3 style={{ marginTop: 0 }}>My Watchlist</h3>
                        <p className="text-muted">View and manage your tracked stocks.</p>
                    </div>
                </Link>
                <Link to="/search">
                    <div className="card hover-card" style={{ cursor: 'pointer', borderColor: 'var(--success)' }}>
                        <h3 style={{ marginTop: 0 }}>Find Stocks</h3>
                        <p className="text-muted">Search for new investment opportunities.</p>
                    </div>
                </Link>
            </div>
        </div>
    );
}

export default Dashboard;
