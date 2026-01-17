import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import PlaidLinkButton from '../components/PlaidLink';

function Settings() {
    const [phone, setPhone] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [loading, setLoading] = useState(true);
    const [sendingCode, setSendingCode] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    const [currentPhone, setCurrentPhone] = useState(null);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [disconnecting, setDisconnecting] = useState(null);

    useEffect(() => {
        fetchSettings();
        fetchBankAccounts();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/api/settings');
            setCurrentPhone(res.data.phone);
            setPhone(res.data.phone || '');
            setLoading(false);
        } catch (err) {
            console.error('Error fetching settings:', err);
            setError('Failed to load settings');
            setLoading(false);
        }
    };

    const fetchBankAccounts = async () => {
        try {
            const res = await axios.get('/api/plaid/accounts');
            setBankAccounts(res.data.accounts || []);
        } catch (err) {
            console.error('Error fetching bank accounts:', err);
        }
    };

    const handlePlaidSuccess = (data) => {
        setSuccess('Bank account connected successfully!');
        fetchBankAccounts();
    };

    const handleDisconnect = async (accountId) => {
        if (!confirm('Are you sure you want to disconnect this account? Your transaction history will be preserved.')) {
            return;
        }
        
        setDisconnecting(accountId);
        try {
            await axios.post(`/api/plaid/accounts/${accountId}/disconnect`);
            setSuccess('Bank account disconnected');
            fetchBankAccounts();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to disconnect account');
        } finally {
            setDisconnecting(null);
        }
    };

    const handleSendCode = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSendingCode(true);

        if (!phone || phone.trim() === '') {
            setError('Please enter a phone number');
            setSendingCode(false);
            return;
        }

        try {
            await axios.post('/api/settings/phone/send-code', { phone });
            setSuccess('Verification code sent to your phone number');
            setCodeSent(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send verification code');
        } finally {
            setSendingCode(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setVerifying(true);

        if (!verificationCode || verificationCode.trim() === '') {
            setError('Please enter the verification code');
            setVerifying(false);
            return;
        }

        try {
            const res = await axios.post('/api/settings/phone/verify', { code: verificationCode });
            setSuccess('Phone number verified and updated successfully!');
            setCurrentPhone(res.data.phone);
            setCodeSent(false);
            setVerificationCode('');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to verify code');
        } finally {
            setVerifying(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <div className="text-muted">Loading settings...</div>
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <Link to="/dashboard" className="btn btn-outline" style={{ marginBottom: '1rem', display: 'inline-block' }}>
                    &larr; Back to Dashboard
                </Link>
                <h1 style={{ marginBottom: '0.5rem' }}>Settings</h1>
                <p className="text-muted">Manage your account settings and preferences</p>
            </div>

            <div className="card glass-card" style={{ marginBottom: '2rem' }}>
                <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem' }}>Phone Number</h2>
                <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                    Update your phone number to receive text message alerts. Your phone number will be verified before it's saved.
                </p>

                {currentPhone && (
                    <div style={{ 
                        padding: '0.75rem', 
                        backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                        borderRadius: '0.375rem',
                        marginBottom: '1.5rem',
                        border: '1px solid rgba(59, 130, 246, 0.2)'
                    }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                            Current Phone Number
                        </div>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                            {currentPhone}
                        </div>
                    </div>
                )}

                {error && (
                    <div className="text-danger" style={{ 
                        padding: '0.75rem', 
                        backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                        borderRadius: '0.375rem',
                        marginBottom: '1rem',
                        border: '1px solid rgba(239, 68, 68, 0.2)'
                    }}>
                        {error}
                    </div>
                )}

                {success && (
                    <div style={{ 
                        padding: '0.75rem', 
                        backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                        borderRadius: '0.375rem',
                        marginBottom: '1rem',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        color: 'var(--success)'
                    }}>
                        {success}
                    </div>
                )}

                {!codeSent ? (
                    <form onSubmit={handleSendCode}>
                        <div className="input-group">
                            <label className="input-label">Phone Number</label>
                            <input
                                type="tel"
                                className="input-field"
                                placeholder="+1234567890"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                            />
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                Enter your phone number including country code (e.g., +1 for US)
                            </div>
                        </div>
                        <button 
                            type="submit" 
                            className="btn btn-primary"
                            disabled={sendingCode}
                            style={{ marginTop: '1rem' }}
                        >
                            {sendingCode ? 'Sending Code...' : 'Send Verification Code'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerify}>
                        <div className="input-group">
                            <label className="input-label">Verification Code</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Enter 6-digit code"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                required
                                maxLength={6}
                                style={{ letterSpacing: '0.5rem', fontSize: '1.25rem', textAlign: 'center' }}
                            />
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                Enter the 6-digit code sent to {phone}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button 
                                type="submit" 
                                className="btn btn-primary"
                                disabled={verifying || verificationCode.length !== 6}
                            >
                                {verifying ? 'Verifying...' : 'Verify & Update'}
                            </button>
                            <button 
                                type="button" 
                                className="btn btn-outline"
                                onClick={() => {
                                    setCodeSent(false);
                                    setVerificationCode('');
                                    setError('');
                                    setSuccess('');
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </div>

            <div className="card glass-card" style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.1rem' }}>About Phone Verification</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                    We verify your phone number to ensure you receive important alerts. The verification code will be sent via SMS and expires in 10 minutes. 
                    Your phone number is only used for sending alerts and is not shared with third parties.
                </p>
            </div>

            {/* Bank Accounts Section */}
            <div className="card glass-card" style={{ marginTop: '2rem' }}>
                <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.5rem' }}>Connected Bank Accounts</h2>
                <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                    Connect your bank accounts to automatically import transactions for budget tracking.
                </p>

                {bankAccounts.filter(a => a.is_active).length > 0 ? (
                    <div style={{ marginBottom: '1.5rem' }}>
                        {bankAccounts.filter(a => a.is_active).map((account) => (
                            <div
                                key={account.id}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '1rem',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: '8px',
                                    marginBottom: '0.75rem',
                                    border: '1px solid var(--border)'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '8px',
                                        backgroundColor: 'var(--primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        fontSize: '1.25rem'
                                    }}>
                                        🏦
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '500' }}>{account.institution_name}</div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                            {account.account_name} ···{account.mask}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {account.account_type} • {account.account_subtype}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDisconnect(account.id)}
                                    disabled={disconnecting === account.id}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        backgroundColor: 'transparent',
                                        color: 'var(--danger)',
                                        border: '1px solid var(--danger)',
                                        borderRadius: '6px',
                                        cursor: disconnecting === account.id ? 'not-allowed' : 'pointer',
                                        opacity: disconnecting === account.id ? 0.7 : 1,
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    {disconnecting === account.id ? 'Disconnecting...' : 'Disconnect'}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{
                        padding: '2rem',
                        textAlign: 'center',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: '8px',
                        marginBottom: '1.5rem'
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏦</div>
                        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                            No bank accounts connected yet
                        </p>
                    </div>
                )}

                <PlaidLinkButton
                    onSuccess={handlePlaidSuccess}
                    buttonText="Connect a Bank Account"
                    buttonStyle={{ width: '100%', justifyContent: 'center' }}
                />
            </div>

            {/* Security Note */}
            <div className="card glass-card" style={{ marginTop: '2rem', backgroundColor: 'rgba(16, 185, 129, 0.05)' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.1rem' }}>🔒 Bank Connection Security</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                    We use Plaid, a trusted financial data platform used by major banks and apps, to securely connect your accounts. 
                    Your bank credentials are never stored on our servers. We only receive read-only access to your transaction data.
                </p>
            </div>
        </div>
    );
}

export default Settings;

