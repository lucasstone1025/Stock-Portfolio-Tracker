import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
    const { logout } = useAuth();
    const location = useLocation();

    const isActive = (path) => location.pathname === path ? 'active' : '';

    return (
        <nav className="navbar">
            <div className="container nav-content">
                <Link to="/" className="nav-logo">StockWatch</Link>
                <div className="nav-links">
                    <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>Dashboard</Link>
                    <Link to="/watchlist" className={`nav-link ${isActive('/watchlist')}`}>Watchlist</Link>
                    <Link to="/find-stocks" className={`nav-link ${isActive('/find-stocks')}`}>Find Stocks</Link>
                    <button onClick={logout} className="nav-link" style={{ background: 'none' }}>Logout</button>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
