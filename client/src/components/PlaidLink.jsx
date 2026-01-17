import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Load Plaid Link script dynamically
const loadPlaidScript = () => {
    return new Promise((resolve, reject) => {
        if (window.Plaid) {
            resolve(window.Plaid);
            return;
        }

        const existingScript = document.getElementById('plaid-link-script');
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(window.Plaid));
            return;
        }

        const script = document.createElement('script');
        script.id = 'plaid-link-script';
        script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
        script.async = true;
        script.onload = () => resolve(window.Plaid);
        script.onerror = () => reject(new Error('Failed to load Plaid Link script'));
        document.head.appendChild(script);
    });
};

function PlaidLinkButton({ onSuccess, onExit, buttonText = "Connect Bank Account", buttonStyle = {} }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [plaidReady, setPlaidReady] = useState(false);

    useEffect(() => {
        loadPlaidScript()
            .then(() => setPlaidReady(true))
            .catch((err) => {
                console.error('Failed to load Plaid:', err);
                setError('Failed to load banking connection');
            });
    }, []);

    const handleClick = useCallback(async () => {
        if (!plaidReady) {
            setError('Please wait, loading...');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Get link token from backend
            const response = await axios.post('/api/plaid/create-link-token');
            const linkToken = response.data.link_token;

            // Create Plaid Link handler
            const handler = window.Plaid.create({
                token: linkToken,
                onSuccess: async (public_token, metadata) => {
                    try {
                        setLoading(true);
                        const exchangeResponse = await axios.post('/api/plaid/exchange-public-token', {
                            public_token,
                            metadata
                        });
                        
                        if (onSuccess) {
                            onSuccess(exchangeResponse.data);
                        }
                    } catch (err) {
                        console.error('Error exchanging token:', err);
                        setError(err.response?.data?.error || 'Failed to connect bank account');
                    } finally {
                        setLoading(false);
                    }
                },
                onExit: (err, metadata) => {
                    setLoading(false);
                    if (onExit) {
                        onExit(err, metadata);
                    }
                },
                onEvent: (eventName, metadata) => {
                    console.log('[Plaid Event]', eventName, metadata);
                }
            });

            // Open Plaid Link
            handler.open();
        } catch (err) {
            console.error('Error initializing Plaid Link:', err);
            setError(err.response?.data?.error || 'Failed to initialize bank connection');
            setLoading(false);
        }
    }, [plaidReady, onSuccess, onExit]);

    const defaultButtonStyle = {
        padding: '0.75rem 1.5rem',
        backgroundColor: 'var(--primary)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: loading ? 'not-allowed' : 'pointer',
        fontSize: '1rem',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        opacity: loading ? 0.7 : 1,
        ...buttonStyle
    };

    return (
        <div>
            <button
                onClick={handleClick}
                disabled={loading || !plaidReady}
                style={defaultButtonStyle}
            >
                {loading ? (
                    <>
                        <span className="spinner-small"></span>
                        Connecting...
                    </>
                ) : (
                    <>
                        🏦 {buttonText}
                    </>
                )}
            </button>
            {error && (
                <p style={{ color: 'var(--danger)', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                    {error}
                </p>
            )}
        </div>
    );
}

export default PlaidLinkButton;
