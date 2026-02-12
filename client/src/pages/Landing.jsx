import { Link } from 'react-router-dom';

function Landing() {
    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
            color: '#e0e0e0',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
        }}>
            {/* Navigation */}
            <nav style={{
                padding: '1.5rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                maxWidth: '1200px',
                margin: '0 auto'
            }}>
                <div style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <img 
                        src="/trendtracker_icon_1024.png" 
                        alt="TrendTracker" 
                        style={{ width: '32px', height: '32px', borderRadius: '8px' }}
                    />
                    TrendTracker
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <Link to="/login" style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        fontWeight: 500,
                        textDecoration: 'none',
                        background: 'transparent',
                        color: '#e0e0e0',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                        Log In
                    </Link>
                    <Link to="/register" style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        fontWeight: 500,
                        textDecoration: 'none',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: 'white',
                        border: 'none'
                    }}>
                        Get Started
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section style={{
                padding: '6rem 2rem',
                textAlign: 'center',
                maxWidth: '1200px',
                margin: '0 auto'
            }}>
                <h1 style={{
                    fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
                    fontWeight: 700,
                    marginBottom: '1.5rem',
                    background: 'linear-gradient(135deg, #fff 0%, #34d399 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                }}>
                    Track Your Wealth,<br />Master Your Budget
                </h1>
                <p style={{
                    fontSize: '1.25rem',
                    color: '#9ca3af',
                    maxWidth: '600px',
                    margin: '0 auto 2.5rem',
                    lineHeight: 1.6
                }}>
                    The all-in-one platform for monitoring your stock portfolio, managing budgets, and getting real-time price alerts delivered to your phone.
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link to="/register" style={{
                        padding: '1rem 2rem',
                        fontSize: '1.1rem',
                        borderRadius: '8px',
                        fontWeight: 500,
                        textDecoration: 'none',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: 'white',
                        border: 'none'
                    }}>
                        Start Free Today
                    </Link>
                    <a href="#features" style={{
                        padding: '1rem 2rem',
                        fontSize: '1.1rem',
                        borderRadius: '8px',
                        fontWeight: 500,
                        textDecoration: 'none',
                        background: 'transparent',
                        color: '#e0e0e0',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                        See Features
                    </a>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" style={{
                padding: '6rem 2rem',
                maxWidth: '1200px',
                margin: '0 auto'
            }}>
                <h2 style={{
                    textAlign: 'center',
                    fontSize: '2.5rem',
                    marginBottom: '1rem'
                }}>
                    Everything You Need
                </h2>
                <p style={{
                    textAlign: 'center',
                    color: '#9ca3af',
                    marginBottom: '4rem',
                    fontSize: '1.1rem'
                }}>
                    Powerful tools to take control of your financial future
                </p>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '2rem'
                }}>
                    {[
                        { icon: '📈', title: 'Stock Watchlist', desc: 'Track your favorite stocks in real-time. Monitor prices, view charts, and stay updated on market movements.' },
                        { icon: '🔔', title: 'Price Alerts', desc: 'Set custom price targets and get instant SMS or email notifications when stocks hit your desired levels.' },
                        { icon: '💰', title: 'Budget Tracking', desc: 'Connect your bank accounts securely and automatically categorize transactions to understand your spending.' },
                        { icon: '🏦', title: 'Bank Integration', desc: 'Securely link your accounts through Plaid. Your credentials are never stored on our servers.' },
                        { icon: '📊', title: 'Spending Analytics', desc: 'Visualize where your money goes with intuitive charts and category breakdowns.' },
                        { icon: '🎯', title: 'Budget Goals', desc: 'Set monthly spending limits by category and track your progress throughout the month.' }
                    ].map((feature, i) => (
                        <div key={i} style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '16px',
                            padding: '2rem',
                            transition: 'all 0.3s ease'
                        }}>
                            <div style={{
                                width: '56px',
                                height: '56px',
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2))',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.75rem',
                                marginBottom: '1.5rem'
                            }}>
                                {feature.icon}
                            </div>
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: '#fff' }}>
                                {feature.title}
                            </h3>
                            <p style={{ color: '#9ca3af', fontSize: '0.95rem', lineHeight: 1.6 }}>
                                {feature.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* How It Works */}
            <section style={{
                padding: '6rem 2rem',
                background: 'rgba(0, 0, 0, 0.2)'
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <h2 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '1rem' }}>
                        Get Started in Minutes
                    </h2>
                    <p style={{ textAlign: 'center', color: '#9ca3af', marginBottom: '3rem', fontSize: '1.1rem' }}>
                        Simple setup, powerful results
                    </p>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '3rem',
                        flexWrap: 'wrap'
                    }}>
                        {[
                            { num: 1, title: 'Create Account', desc: 'Sign up free with your email or Google account' },
                            { num: 2, title: 'Add Your Stocks', desc: 'Search and add stocks to your personalized watchlist' },
                            { num: 3, title: 'Connect Bank', desc: 'Securely link accounts to track spending automatically' },
                            { num: 4, title: 'Set Alerts', desc: 'Configure price alerts and budget notifications' }
                        ].map((step, i) => (
                            <div key={i} style={{ textAlign: 'center', maxWidth: '250px' }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: '1.25rem',
                                    margin: '0 auto 1rem'
                                }}>
                                    {step.num}
                                </div>
                                <h3 style={{ marginBottom: '0.5rem' }}>{step.title}</h3>
                                <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Security Section */}
            <section style={{ padding: '6rem 2rem', textAlign: 'center' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Bank-Level Security</h2>
                    <p style={{ color: '#9ca3af', marginBottom: '2rem', fontSize: '1.1rem' }}>
                        Your data is protected with industry-leading security standards
                    </p>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '3rem',
                        flexWrap: 'wrap'
                    }}>
                        {[
                            { icon: '🔒', text: '256-bit Encryption' },
                            { icon: '🏦', text: 'Powered by Plaid' },
                            { icon: '🛡️', text: 'Read-Only Access' },
                            { icon: '🔐', text: 'No Credential Storage' }
                        ].map((badge, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#9ca3af' }}>
                                <span style={{ fontSize: '1.5rem' }}>{badge.icon}</span>
                                <span>{badge.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section style={{ padding: '6rem 2rem' }}>
                <div style={{
                    maxWidth: '800px',
                    margin: '0 auto',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: '24px',
                    padding: '4rem',
                    textAlign: 'center'
                }}>
                    <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Ready to Take Control?</h2>
                    <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>
                        Join TrendTracker today and start making smarter financial decisions.
                    </p>
                    <Link to="/register" style={{
                        padding: '1rem 2rem',
                        fontSize: '1.1rem',
                        borderRadius: '8px',
                        fontWeight: 500,
                        textDecoration: 'none',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: 'white',
                        border: 'none',
                        display: 'inline-block'
                    }}>
                        Create Free Account
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer style={{
                padding: '3rem 2rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                textAlign: 'center',
                color: '#6b7280'
            }}>
                <p>2026 TrendTracker. Created by Lucas Stone & Blaine Baldwin @ FSU</p>
                <p style={{ marginTop: '0.5rem' }}>
                    <a href="mailto:lucasstone1025@gmail.com" style={{ color: '#9ca3af', textDecoration: 'none' }}>
                        Contact Support
                    </a>
                </p>
            </footer>
        </div>
    );
}

export default Landing;
