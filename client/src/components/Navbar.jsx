import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
    const { logout } = useAuth();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);

    const isActive = (path) => location.pathname === path ? 'active' : '';
    const toggleMenu = () => setIsOpen(!isOpen);
    const closeMenu = () => setIsOpen(false);

    return (
        <nav className="navbar">
            <div className="container nav-content">
                <Link to="/" className="nav-logo" onClick={closeMenu}>TrendTracker</Link>

                <button className="nav-toggle" onClick={toggleMenu} aria-label="Toggle navigation">
                    <span className={`hamburger ${isOpen ? 'open' : ''}`}></span>
                </button>

                <div className={`nav-links ${isOpen ? 'open' : ''}`}>
                    <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`} onClick={closeMenu}>Dashboard</Link>
                    <Link to="/watchlist" className={`nav-link ${isActive('/watchlist')}`} onClick={closeMenu}>Watchlist</Link>
                    <Link to="/budget" className={`nav-link ${isActive('/budget')}`} onClick={closeMenu}>Budget</Link>
                    <Link to="/transactions" className={`nav-link ${isActive('/transactions')}`} onClick={closeMenu}>Transactions</Link>
                    <Link to="/find-stocks" className={`nav-link ${isActive('/find-stocks')}`} onClick={closeMenu}>Discover</Link>
                    <Link to="/alerts" className={`nav-link ${isActive('/alerts')}`} onClick={closeMenu}>Alerts</Link>
                    <Link to="/settings" className={`nav-link ${isActive('/settings')}`} onClick={closeMenu}>Settings</Link>
                    <button onClick={() => { closeMenu(); logout(); }} className="nav-link" style={{ background: 'none' }}>Logout</button>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
