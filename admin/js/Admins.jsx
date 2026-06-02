// ─── Admins: AccessManagement

function AccessManagement({ session, azureUrl, adminPortalUrl }) {
    const [admins, setAdmins] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [newName, setNewName] = React.useState('');
    const [newEmail, setNewEmail] = React.useState('');
    const [adding, setAdding] = React.useState(false);
    const [status, setStatus] = React.useState(null);

    const callApi = async (action, extra = {}) => {
        const res = await fetch(azureUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-email': session.email },
            body: JSON.stringify({ action, ...extra })
        });
        const text = await res.text();
        if (!text || text.trim() === '') throw new Error('Azure Function returned empty response.');
        const data = JSON.parse(text);
        if (!res.ok) throw new Error(data.message || 'Request failed');
        return data;
    };

    const loadAdmins = async () => {
        try {
            setLoading(true);
            let adminList = [];
            try {
                const data = await callApi('get-admins');
                adminList = data.admins || [];
            } catch(e) {
                const res = await fetch('./admins.json');
                if (res.ok) adminList = await res.json();
                else throw new Error('Could not load admins');
            }
            setAdmins(adminList);
        } catch(e) {
            setStatus({ type: 'error', message: 'Could not load admins: ' + e.message });
        } finally { setLoading(false); }
    };

    React.useEffect(() => { loadAdmins(); }, []);

    const handleAdd = async () => {
        if (!newName.trim() || !newEmail.trim()) { setStatus({ type: 'error', message: 'Please enter both name and email.' }); return; }
        if (!newEmail.includes('@')) { setStatus({ type: 'error', message: 'Please enter a valid email.' }); return; }
        setAdding(true); setStatus(null);
        try {
            const data = await callApi('add-admin', { newAdminEmail: newEmail, newAdminName: newName });
            setAdmins(data.admins);
            setStatus({ type: 'success', message: newName + ' has been added!' });
            const subject = encodeURIComponent('Equipment Admin Access Approved by Fred Solano');
            const body = encodeURIComponent('Hi ' + newName + ',\n\nYou have been granted access to the FPG Equipment Ordering Admin Portal.\n\nAccess it here:\n' + adminPortalUrl + '\n\nLog in using: ' + newEmail.toLowerCase().trim() + '\n\nBest regards,\nFPG IT Team');
            const a = document.createElement('a'); a.href = 'mailto:' + newEmail + '?subject=' + subject + '&body=' + body;
            a.style.display = 'none'; document.body.appendChild(a); a.click(); setTimeout(() => document.body.removeChild(a), 100);
            setNewName(''); setNewEmail('');
        } catch(e) { setStatus({ type: 'error', message: e.message }); }
        finally { setAdding(false); }
    };

    const handleRemove = async (email, name) => {
        if (!confirm('Remove ' + name + ' from admin access?')) return;
        setStatus(null);
        try {
            const data = await callApi('remove-admin', { removeEmail: email });
            setAdmins(data.admins);
            setStatus({ type: 'success', message: name + ' has been removed.' });
        } catch(e) { setStatus({ type: 'error', message: e.message }); }
    };

    const handleToggleRole = async (email, name, currentRole) => {
        const newRole = currentRole === 'superadmin' ? 'admin' : 'superadmin';
        const action = newRole === 'superadmin' ? 'Grant superadmin to' : 'Demote to admin';
        if (!confirm(action + ' ' + name + '?')) return;
        setStatus(null);
        try {
            const data = await callApi('update-admin-role', { targetEmail: email, newRole });
            setAdmins(data.admins);
            setStatus({ type: 'success', message: name + ' is now ' + newRole + '.' });
        } catch(e) { setStatus({ type: 'error', message: e.message }); }
    };

    const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
    const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

    return (
        <div style={{maxWidth:'760px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
                <div>
                    <span style={{fontSize:'16px',fontWeight:700,color:'#0F172A'}}>Current Admins</span>
                    <span style={{fontSize:'13px',fontWeight:400,color:'#64748B',marginLeft:'8px'}}>{loading ? 'Loading...' : admins.length + ' authorized user' + (admins.length !== 1 ? 's' : '')}</span>
                </div>
            </div>
            <div style={{background:'white',borderRadius:'12px',border:'0.5px solid #E2E8F0',marginBottom:'24px',overflow:'hidden'}}>
                {status && (
                    <div style={{margin:'0 0 12px',padding:'10px 14px',borderRadius:'8px',fontSize:'13px',background:status.type==='success'?'#DCFCE7':'#FEE2E2',color:status.type==='success'?'#166534':'#991B1B',border:status.type==='success'?'1px solid #86EFAC':'1px solid #FECACA'}}>
                        {status.type === 'success' ? '✅' : '❌'} {status.message}
                    </div>
                )}
                <div>
                    {loading ? <div style={{padding:'2rem',textAlign:'center',color:'#666'}}>Loading admins...</div> :
                    admins.map((admin, i) => {
                        const isYou = admin.email.toLowerCase() === session.email.toLowerCase();
                        const adminIsSuperAdmin = admin.role === 'superadmin';
                        return (
                            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 16px',borderBottom:'0.5px solid #F1F5F9'}}>
                                <div style={{display:'flex',alignItems:'center',gap:'0.875rem'}}>
                                    <div style={{width:'40px',height:'40px',background:'linear-gradient(135deg,#4C3BAF,#1E3A5F)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:700,fontSize:'0.9rem',flexShrink:0}}>{getInitials(admin.name)}</div>
                                    <div>
                                        <div style={{fontWeight:600,fontSize:'0.95rem',display:'flex',alignItems:'center',gap:'6px'}}>
                                            {admin.name}
                                            {isYou && <span style={{background:'#DBEAFE',color:'#1E40AF',padding:'0.2rem 0.6rem',borderRadius:'20px',fontSize:'0.75rem',fontWeight:600}}>You</span>}
                                            <span style={{
                                                background: adminIsSuperAdmin ? '#FEF3C7' : '#F1F5F9',
                                                color: adminIsSuperAdmin ? '#92400E' : '#475569',
                                                padding:'0.15rem 0.5rem',borderRadius:'20px',fontSize:'0.7rem',fontWeight:600
                                            }}>{adminIsSuperAdmin ? '⭐ Superadmin' : 'Admin'}</span>
                                        </div>
                                        <div style={{fontSize:'0.8rem',color:'#666'}}>{admin.email}</div>
                                        {admin.addedAt && admin.addedBy !== 'system' && <div style={{fontSize:'0.75rem',color:'#999',marginTop:'0.1rem'}}>Added by {admin.addedBy} · {formatDate(admin.addedAt)}</div>}
                                    </div>
                                </div>
                                <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                                    {!isYou && session.role === 'superadmin' && (
                                        <button onClick={()=>handleToggleRole(admin.email, admin.name, admin.role)}
                                            style={{background:'none',border:'1.5px solid #6366F1',color:'#6366F1',padding:'0.375rem 0.875rem',borderRadius:'8px',fontSize:'0.8rem',fontWeight:600,cursor:'pointer'}}>
                                            {adminIsSuperAdmin ? 'Demote to Admin' : 'Make Superadmin'}
                                        </button>
                                    )}
                                    {!isYou && <button onClick={()=>handleRemove(admin.email,admin.name)} style={{background:'none',border:'2px solid #dc2626',color:'#dc2626',padding:'0.375rem 0.875rem',borderRadius:'8px',fontSize:'0.8rem',fontWeight:600,cursor:'pointer'}}>Remove</button>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div style={{background:'white',borderRadius:'12px',border:'0.5px solid #E2E8F0',overflow:'hidden'}}>
                <div style={{padding:'14px 16px',borderBottom:'0.5px solid #F1F5F9'}}>
                    <div style={{fontSize:'15px',fontWeight:700,color:'#0F172A'}}>Add New Admin</div>
                    <div style={{fontSize:'12px',color:'#94A3B8',marginTop:'2px'}}>They will receive an email invitation with the portal link</div>
                </div>
                <div style={{padding:'16px',display:'flex',flexDirection:'column',gap:'12px'}}>
                    <div style={{display:'flex',gap:'0.75rem'}}>
                        <input type="text" className="form-input" placeholder="Full Name" value={newName} onChange={(e)=>setNewName(e.target.value)} style={{flex:1}} />
                        <input type="email" className="form-input" placeholder="email@foundationpartners.com" value={newEmail} onChange={(e)=>setNewEmail(e.target.value)} style={{flex:1}} />
                    </div>
                    {newName && newEmail && (
                        <div style={{background:'#F0FDF4',border:'2px solid #86EFAC',borderRadius:'10px',padding:'1rem',fontSize:'0.85rem',color:'#166534'}}>
                            <strong style={{display:'block',marginBottom:'0.4rem'}}>📧 Invite email preview:</strong>
                            To: {newEmail}<br/>
                            Subject: <em>Equipment Admin Access Approved by Fred Solano</em><br/>
                            Body: Hi {newName}, you have been granted access to the FPG Equipment Admin Portal...
                        </div>
                    )}
                    <button onClick={handleAdd} disabled={adding} style={{background:'#4C3BAF',color:'white',border:'none',padding:'0.875rem',borderRadius:'10px',fontWeight:700,cursor:'pointer',fontSize:'0.95rem'}}>
                        {adding ? '⏳ Adding...' : '✅ Add Admin & Send Invite'}
                    </button>
                </div>
            </div>
        </div>
    );
}
