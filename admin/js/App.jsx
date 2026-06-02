// ─── App shell and LoginScreen

const { useState } = React;
function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(AuthService.isAuthenticated());
    
    const handleLogin = async (email) => {
        const result = await AuthService.login(email);
        if (result) { setIsAuthenticated(true); return true; }
        return false;
    };
    
    const handleLogout = () => {
        AuthService.logout();
        setIsAuthenticated(false);
    };
    
    if (!isAuthenticated) {
        return <LoginScreen onLogin={handleLogin} />;
    }
    
    return <AdminDashboard onLogout={handleLogout} />;
}

function LoginScreen({ onLogin }) {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [adminNames, setAdminNames] = useState(['Matthew Ritchotte', 'Joe Choss', 'Chezarae Carter', 'Fred Solano']);

    React.useEffect(() => {
        fetch('./admins.json').then(r => r.json()).then(data => {
            setAdminNames(data.map(a => a.name));
        }).catch(() => {});
    }, []);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!email) { setError('Please enter your email address.'); return; }
        setLoading(true);
        const ok = await onLogin(email);
        setLoading(false);
        if (!ok) setError('Access denied. You are not authorized to access the admin panel.');
    };
    
    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="lock-icon">🔒</div>
                    <h1>Admin Access</h1>
                    <p>FPG Equipment Ordering Portal</p>
                </div>
                
                {error && <div className="error-message">{error}</div>}
                
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="your.email@foundationpartners.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Verifying...' : 'Access Admin Panel'}
                    </button>
                </form>
                
                <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--bg-light)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--fpg-gray)' }}>
                    <strong>Authorized Admins:</strong><br />
                    {adminNames.map((name, i) => <span key={i}>• {name}<br /></span>)}
                </div>
            </div>
        </div>
    );
}
