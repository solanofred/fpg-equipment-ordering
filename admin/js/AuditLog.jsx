// ─── AuditLog: AuditLogOpener (inline render, no new window)

function AuditLogOpener({ session, azureUrl }) {
    const [status, setStatus] = React.useState('loading');
    const [entries, setEntries] = React.useState([]);
    const [filterQ, setFilterQ] = React.useState('');
    const [filterType, setFilterType] = React.useState('');
    const [filterAdmin, setFilterAdmin] = React.useState('');
    const [filterResult, setFilterResult] = React.useState('');
    const [filterFrom, setFilterFrom] = React.useState('');
    const [filterTo, setFilterTo] = React.useState('');
            const [showDrill, setShowDrill] = React.useState(null);
            const [selectedEntries, setSelectedEntries] = React.useState({});
            const [showAuditExportMenu, setShowAuditExportMenu] = React.useState(false);

    React.useEffect(() => {
        (async () => {
            try {
                const year = new Date().getFullYear();
                const availableYears = [year, year - 1, year - 2].filter(y => y >= 2024);
                const yearsToLoad = [year];

                let allEntries = [];
                for (const y of yearsToLoad) {
                    const res = await fetch(azureUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-admin-email': session.email },
                        body: JSON.stringify({ action: 'get-audit-log', year: y })
                    });
                    const data = await res.json();
                    if (Array.isArray(data.log)) allEntries = allEntries.concat(data.log);
                }
                allEntries.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

                const actionMetaMap = {
                    'auth.login':          { label: 'Login',           bg:'#EEF2FF', color:'#4C3BAF', border:'#C7D2FE', dot:'#818CF8' },
                    'auth.logout':         { label: 'Logout',          bg:'#F1F5F9', color:'#475569', border:'#CBD5E1', dot:'#94A3B8' },
                    'auth.auto_logoff':    { label: 'Auto-logout',     bg:'#F1F5F9', color:'#475569', border:'#CBD5E1', dot:'#94A3B8' },
                    'order.soft_delete':   { label: 'Order deleted',   bg:'#FEE2E2', color:'#DC2626', border:'#FECACA', dot:'#F87171' },
                    'order.permanent_delete': { label:'Perm. deleted', bg:'#FCA5A5', color:'#7F1D1D', border:'#F87171', dot:'#EF4444' },
                    'order.permanent_delete_attempt': { label:'Perm. denied', bg:'#FCA5A5', color:'#7F1D1D', border:'#F87171', dot:'#EF4444' },
                    'order.restore':       { label: 'Restored',        bg:'#DCFCE7', color:'#166534', border:'#86EFAC', dot:'#4ADE80' },
                    'order.status_change': { label: 'Status change',   bg:'#FEF9C3', color:'#854D0E', border:'#FDE68A', dot:'#FCD34D' },
                    'access.admin_added':  { label: 'Admin added',     bg:'#DCFCE7', color:'#166534', border:'#86EFAC', dot:'#4ADE80' },
                    'access.admin_removed':{ label: 'Admin removed',   bg:'#FEE2E2', color:'#DC2626', border:'#FECACA', dot:'#F87171' },
                    'access.role_changed': { label: 'Role changed',    bg:'#FEF9C3', color:'#854D0E', border:'#FDE68A', dot:'#FCD34D' },
                    'category.added':      { label: 'Category added',  bg:'#EEF2FF', color:'#4C3BAF', border:'#C7D2FE', dot:'#818CF8' },
                    'category.updated':    { label: 'Category updated',bg:'#EEF2FF', color:'#4C3BAF', border:'#C7D2FE', dot:'#818CF8' },
                    'category.removed':    { label: 'Category removed',bg:'#FEE2E2', color:'#DC2626', border:'#FECACA', dot:'#F87171' },
                    'portal.products_published': { label: 'Published', bg:'#DCFCE7', color:'#166534', border:'#86EFAC', dot:'#4ADE80' },
                };
                const getMetaFn = (action) => actionMetaMap[action] || { label: action, bg:'#F1F5F9', color:'#475569', border:'#CBD5E1', dot:'#94A3B8' };

                const typeCounts = {};
                allEntries.forEach(e => { typeCounts[e.action] = (typeCounts[e.action]||0) + 1; });

setEntries(allEntries);
                setStatus('done');
            } catch(e) {
                setStatus('error');
            }
        })();
    }, []);

    if (status === 'loading') {
        return (
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'3rem',gap:'12px',color:'#64748B'}}>
                <div style={{width:'20px',height:'20px',border:'2px solid #E2E8F0',borderTop:'2px solid #4C3BAF',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}></div>
                Loading audit log...
            </div>
        );
    }
    if (status === 'error') {
        return (
            <div style={{padding:'2rem',textAlign:'center',color:'#DC2626'}}>
                Failed to load audit log. Check your connection and try again.
            </div>
        );
    }
    const META = {
        'auth.login':          { label: 'Login',            bg:'#EEF2FF', color:'#4C3BAF', border:'#C7D2FE' },
        'auth.logout':         { label: 'Logout',           bg:'#F1F5F9', color:'#475569', border:'#CBD5E1' },
        'auth.auto_logoff':    { label: 'Auto-logout',      bg:'#F1F5F9', color:'#475569', border:'#CBD5E1' },
        'order.soft_delete':   { label: 'Order deleted',    bg:'#FEE2E2', color:'#DC2626', border:'#FECACA' },
        'order.permanent_delete': { label:'Perm. deleted',  bg:'#FCA5A5', color:'#7F1D1D', border:'#F87171' },
        'order.restore':       { label: 'Restored',         bg:'#DCFCE7', color:'#166534', border:'#86EFAC' },
        'order.status_change': { label: 'Status change',    bg:'#FEF9C3', color:'#854D0E', border:'#FDE68A' },
        'access.admin_added':  { label: 'Admin added',      bg:'#DCFCE7', color:'#166534', border:'#86EFAC' },
        'access.admin_removed':{ label: 'Admin removed',    bg:'#FEE2E2', color:'#DC2626', border:'#FECACA' },
        'access.role_changed': { label: 'Role changed',     bg:'#FEF3C7', color:'#92400E', border:'#FDE68A' },
        'portal.products_published': { label:'Published',   bg:'#DCFCE7', color:'#166534', border:'#86EFAC' },
        'category.added':      { label: 'Cat. added',       bg:'#EFF6FF', color:'#1E40AF', border:'#BFDBFE' },
        'category.updated':    { label: 'Cat. updated',     bg:'#EFF6FF', color:'#1E40AF', border:'#BFDBFE' },
        'category.removed':    { label: 'Cat. removed',     bg:'#FEE2E2', color:'#DC2626', border:'#FECACA' },
    };
    const getMeta = (a) => META[a] || { label: a, bg:'#F1F5F9', color:'#475569', border:'#CBD5E1' };
    const admins = [...new Set(entries.map(e=>e.adminEmail).filter(Boolean))].sort();
    const filtered = entries.filter(e => {
        const q = filterQ.toLowerCase();
        const ts = e.timestamp ? e.timestamp.slice(0,10) : '';
        if (filterQ && ![(e.adminEmail||''),(e.action||''),(e.target||''),JSON.stringify(e.detail||'')].join(' ').toLowerCase().includes(q)) return false;
        if (filterType && e.action !== filterType) return false;
        if (filterAdmin && e.adminEmail !== filterAdmin) return false;
        if (filterResult && e.result !== filterResult) return false;
        if (filterFrom && ts < filterFrom) return false;
        if (filterTo && ts > filterTo) return false;
        return true;
    });
    const exportAuditCSV = function(rows, filename) {
        const headers = ['Date','Time','Admin','Action','Reference','Summary','Result'];
        const data = rows.map(function(e) {
            const dt = new Date(e.timestamp);
            const adminName = (e.adminEmail||'').split('@')[0].replace('.',' ');
            return [dt.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}), dt.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}), adminName, e.action||'', e.target||'', '', e.result||''];
        });
        const csv = [headers,...data].map(function(r){return r.map(function(v){var s=String(v==null?'':v);return s.includes(',')||s.includes('"')?'"'+s.replace(/"/g,'""')+'"':s;}).join(',');}).join('\n');
        const blob = new Blob([csv],{type:'text/csv'});const url = URL.createObjectURL(blob);const a = document.createElement('a');a.href=url;a.download=filename||'audit-log.csv';a.click();URL.revokeObjectURL(url);
    };
    const toggleSelectEntry = function(idx) { setSelectedEntries(function(prev){var n=Object.assign({},prev);n[idx]=!n[idx];return n;}); };
    if (status === 'loading') return (
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'3rem',gap:'12px',color:'#64748B'}}>
            <div style={{width:'20px',height:'20px',border:'2px solid #E2E8F0',borderTopColor:'#16A34A',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}></div>
            Loading audit log...
        </div>
    );
    if (status === 'error') return (
        <div style={{padding:'3rem',textAlign:'center',color:'#DC2626'}}>Failed to load audit log. Please try again.</div>
    );
    return (
        <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'14px',padding:'14px 20px',flexShrink:0}}>
                {[
                    {label:'Total Entries',val:entries.length,sub:'All time',grad:'linear-gradient(135deg,#4F46E5 0%,#6366F1 100%)',icon:'ti-file-description'},
                    {label:'Auth Events',val:entries.filter(e=>e.action.startsWith('auth.')).length,sub:'Logins & logouts',grad:'linear-gradient(135deg,#0EA5E9 0%,#38BDF8 100%)',icon:'ti-login'},
                    {label:'Order Events',val:entries.filter(e=>e.action.startsWith('order.')).length,sub:'Deletes & changes',grad:'linear-gradient(135deg,#F59E0B 0%,#FBBF24 100%)',icon:'ti-clipboard-list'},
                    {label:'Access & System',val:entries.filter(e=>!e.action.startsWith('order.')&&!e.action.startsWith('auth.')).length,sub:'Admins & publish',grad:'linear-gradient(135deg,#10B981 0%,#34D399 100%)',icon:'ti-shield-check'},
                ].map((s,i) => (
                    <div key={i} onClick={()=>setShowDrill(i)} style={{cursor:'pointer',background:s.grad,borderRadius:'16px',padding:'20px',position:'relative',overflow:'hidden'}}>
                        <div style={{position:'absolute',top:'-10px',right:'-10px',width:'70px',height:'70px',background:'rgba(255,255,255,0.1)',borderRadius:'50%'}}></div>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
                            <div style={{width:'36px',height:'36px',background:'rgba(255,255,255,0.2)',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                <i className={'ti '+s.icon} style={{fontSize:'18px',color:'white'}}></i>
                            </div>
                        </div>
                        <div style={{fontSize:'36px',fontWeight:800,color:'white',lineHeight:1,letterSpacing:'-1px'}}>{s.val}</div>
                        <div style={{fontSize:'13px',color:'white',marginTop:'8px',fontWeight:600}}>{s.label}</div>
                        <div style={{fontSize:'11px',color:'rgba(255,255,255,0.85)',marginTop:'2px'}}>{s.sub}</div>
                    </div>
                ))}
            </div>
            <div style={{padding:'8px 20px',background:'white',borderBottom:'0.5px solid #E2E8F0',display:'flex',gap:'8px',alignItems:'center',flexShrink:0,flexWrap:'wrap'}}>
                <input value={filterQ} onChange={e=>setFilterQ(e.target.value)} placeholder="Search admin, action, target, detail..." style={{flex:1,minWidth:'180px',padding:'7px 10px',border:'1.5px solid #E2E8F0',borderRadius:'8px',fontSize:'12.5px',fontFamily:'inherit',outline:'none'}} />
                <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{padding:'7px 10px',border:'1.5px solid #E2E8F0',borderRadius:'8px',fontSize:'12px',fontFamily:'inherit',background:'white',cursor:'pointer',outline:'none'}}>
                    <option value="">All action types</option>
                    <option value="access.admin_added">Admin added</option>
                    <option value="access.admin_removed">Admin removed</option>
                    <option value="access.role_changed">Admin role changed</option>
                    <option value="auth.auto_logoff">Auto-logout</option>
                    <option value="category.added">Category added</option>
                    <option value="category.removed">Category removed</option>
                    <option value="category.updated">Category updated</option>
                    <option value="auth.login">Login</option>
                    <option value="auth.logout">Logout</option>
                    <option value="order.soft_delete">Order deleted</option>
                    <option value="order.permanent_delete">Order perm. deleted</option>
                    <option value="order.restore">Order restored</option>
                    <option value="order.status_change">Order status change</option>
                    <option value="portal.products_published">Products published</option>
                </select>
                <select value={filterAdmin} onChange={e=>setFilterAdmin(e.target.value)} style={{padding:'7px 10px',border:'1.5px solid #E2E8F0',borderRadius:'8px',fontSize:'12px',fontFamily:'inherit',background:'white',cursor:'pointer',outline:'none'}}>
                    <option value="">All admins</option>
                    {admins.map(a => <option key={a} value={a}>{(a.split('@')[0].replace('.',' ')).replace(/\w/g,c=>c.toUpperCase())}</option>)}
                </select>
                <select value={filterResult} onChange={e=>setFilterResult(e.target.value)} style={{padding:'7px 10px',border:'1.5px solid #E2E8F0',borderRadius:'8px',fontSize:'12px',fontFamily:'inherit',background:'white',cursor:'pointer',outline:'none'}}>
                    <option value="">All results</option>
                    <option value="success">Success</option>
                    <option value="denied">Denied</option>
                </select>
                <input type="date" value={filterFrom} onChange={e=>setFilterFrom(e.target.value)} style={{padding:'7px 9px',border:'1.5px solid #E2E8F0',borderRadius:'8px',fontSize:'12px',fontFamily:'inherit',background:'white',outline:'none'}} />
                <input type="date" value={filterTo} onChange={e=>setFilterTo(e.target.value)} style={{padding:'7px 9px',border:'1.5px solid #E2E8F0',borderRadius:'8px',fontSize:'12px',fontFamily:'inherit',background:'white',outline:'none'}} />
                <button onClick={()=>{setFilterQ('');setFilterType('');setFilterAdmin('');setFilterResult('');setFilterFrom('');setFilterTo('');}} style={{padding:'7px 12px',border:'1.5px solid #E2E8F0',borderRadius:'8px',fontSize:'11.5px',color:'#64748B',background:'white',cursor:'pointer',fontWeight:600}}>Clear</button>
                    <div style={{position:'relative'}}>
                        <button onClick={function(){setShowAuditExportMenu(function(p){return !p;});}} style={{padding:'7px 12px',border:'1.5px solid #0369A1',borderRadius:'8px',fontSize:'12px',fontWeight:500,cursor:'pointer',background:'white',color:'#0369A1'}}>
                            ⬇ Export <span style={{fontSize:'10px'}}>{showAuditExportMenu?'▲':'▼'}</span>
                        </button>
                        {showAuditExportMenu && (function(){
                            const sel=filtered.filter(function(e,i){return selectedEntries[i];});
                            return (
                            <div style={{position:'absolute',top:'calc(100% + 4px)',right:0,background:'white',border:'1.5px solid #0369A1',borderRadius:'8px',zIndex:50,minWidth:'210px',boxShadow:'0 4px 16px rgba(0,0,0,0.12)',overflow:'hidden'}}>
                                <div style={{padding:'6px 8px',background:'#F0F4F8',borderBottom:'0.5px solid #C7D9F0',fontSize:'10px',fontWeight:600,color:'#475569',textTransform:'uppercase',letterSpacing:'0.06em'}}>Choose what to export</div>
                                <button onClick={function(){exportAuditCSV(filtered.slice(0,25),'audit-first25.csv');setShowAuditExportMenu(false);}} style={{width:'100%',padding:'9px 14px',border:'none',borderBottom:'0.5px solid #E7E5E4',background:'white',textAlign:'left',cursor:'pointer',fontSize:'13px'}}>
                                    <div style={{fontWeight:600}}>First 25 visible</div><div style={{fontSize:'11px',color:'#78716C'}}>{Math.min(25,filtered.length)} entries</div>
                                </button>
                                <button onClick={function(){exportAuditCSV(filtered,'audit-filtered.csv');setShowAuditExportMenu(false);}} style={{width:'100%',padding:'9px 14px',border:'none',borderBottom:'0.5px solid #E7E5E4',background:'white',textAlign:'left',cursor:'pointer',fontSize:'13px'}}>
                                    <div style={{fontWeight:600}}>All filtered results</div><div style={{fontSize:'11px',color:'#78716C'}}>{filtered.length} entries</div>
                                </button>
                                <button onClick={function(){if(!sel.length){alert('Select entries using checkboxes first.');return;}exportAuditCSV(sel,'audit-selected.csv');setShowAuditExportMenu(false);}} style={{width:'100%',padding:'9px 14px',border:'none',background:'white',textAlign:'left',cursor:'pointer',fontSize:'13px'}}>
                                    <div style={{fontWeight:600}}>Selected only</div><div style={{fontSize:'11px',color:'#78716C'}}>{sel.length} selected</div>
                                </button>
                            </div>);
                        })()}
                    </div>
                <span style={{background:'#EEF2FF',color:'#4C3BAF',borderRadius:'20px',padding:'3px 11px',fontSize:'11.5px',fontWeight:700,marginLeft:'auto',whiteSpace:'nowrap'}}>{filtered.length} {filtered.length===1?'entry':'entries'}</span>
            </div>
            <div style={{flex:1,overflowY:'auto',background:'white',minWidth:0}}>
                <table id="tbl-auditlog" style={{width:'100%',borderCollapse:'collapse',fontSize:'12px',tableLayout:'fixed',maxWidth:'1400px'}}>
                    <thead>
                        <tr style={{background:'#D97706'}}>
                            <th style={{padding:'10px 10px',width:'40px',textAlign:'center',color:'white'}}>
                                <input type="checkbox" onChange={function(e){if(e.target.checked){const all={};filtered.forEach(function(en,i){all[i]=true;});setSelectedEntries(all);}else setSelectedEntries({});}} checked={filtered.length>0&&filtered.every(function(en,i){return selectedEntries[i];})} style={{cursor:'pointer',accentColor:'white'}}/>
                            </th>
                            <th style={{padding:'10px 12px',textAlign:'left',color:'white',fontSize:'10.5px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',width:'12%',position:'relative'}}>Date / Time</th>
                            <th style={{padding:'10px 12px',textAlign:'left',color:'white',fontSize:'10.5px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',width:'11%',position:'relative'}}>Admin</th>
                            <th style={{padding:'10px 12px',textAlign:'left',color:'white',fontSize:'10.5px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',width:'12%',position:'relative'}}>Action</th>
                            <th style={{padding:'10px 12px',textAlign:'left',color:'white',fontSize:'10.5px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',width:'13%',position:'relative'}}>Reference</th>
                            <th style={{padding:'10px 12px',textAlign:'left',color:'white',fontSize:'10.5px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',width:'44%',position:'relative'}}>Summary</th>
                            <th style={{padding:'10px 12px',textAlign:'center',color:'white',fontSize:'10.5px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',width:'8%',position:'relative'}}>Result</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((e,i) => {
                            const m = getMeta(e.action);
                            const dt = new Date(e.timestamp);
                            const s = e.detail && e.detail.orderSnapshot;
                            const adminName = (e.adminEmail||'').split('@')[0].replace('.',' ').replace(/\b\w/g,function(c){return c.toUpperCase();});
                            let ref = e.target || '';
                            if (!ref && e.detail) {
                                if (e.detail.orderId) ref = e.detail.orderId;
                                else if (e.detail.newEmail) ref = e.detail.newEmail;
                                else if (e.detail.removedEmail) ref = e.detail.removedEmail;
                                else if (e.detail.slug) ref = e.detail.slug;
                                else if (e.detail.file) ref = e.detail.file;
                            }
                            let summary = '';
                            if (e.action === 'auth.login' && e.detail && e.detail.browser) {
                                const ua = e.detail.browser||'';
                                const browser = ua.includes('Chrome')?'Chrome':ua.includes('Firefox')?'Firefox':ua.includes('Safari')?'Safari':ua.includes('Edge')?'Edge':'Browser';
                                const os = ua.includes('Windows')?'Windows':ua.includes('Mac')?'Mac':ua.includes('iPhone')?'iPhone':ua.includes('Android')?'Android':'Unknown OS';
                                summary = browser + ' on ' + os + ' — signed in';
                            } else if (e.action === 'auth.logout') {
                                summary = 'Signed out';
                            } else if (e.action === 'auth.auto_logoff') {
                                summary = 'Session timed out after inactivity';
                            } else if (e.action === 'order.soft_delete') {
                                summary = (e.detail&&e.detail.reason?'Reason: '+e.detail.reason+' · ':'') + (s?'For: '+(s.recipientName||'')+' · '+(s.locationId||'')+' · $'+((s.total||0).toFixed(2)):'');
                            } else if (e.action === 'order.permanent_delete') {
                                summary = 'Permanently deleted'+(e.detail&&e.detail.reason?' · Reason: '+e.detail.reason:'')+(s?' · For: '+(s.recipientName||'')+' · '+(s.locationId||''):'');
                            } else if (e.action === 'order.restore') {
                                summary = 'Order restored';
                            } else if (e.action === 'order.status_change' && e.detail) {
                                summary = (e.detail.oldStatus||'')+' → '+(e.detail.newStatus||'')+(e.detail.locationId?' · '+e.detail.locationId:'');
                            } else if (e.action === 'access.admin_added' && e.detail) {
                                summary = 'Added '+(e.detail.newName||e.detail.newEmail||'')+' as '+(e.detail.role||'admin');
                            } else if (e.action === 'access.admin_removed' && e.detail) {
                                summary = 'Removed '+(e.detail.removedEmail||'');
                            } else if (e.action === 'access.role_changed' && e.detail) {
                                summary = 'Role changed to '+(e.detail.newRole||'');
                            } else if (e.action === 'portal.products_published' && e.detail) {
                                summary = (e.detail.productsCount||'')+' products published'+(e.detail.commitSha?' · commit '+e.detail.commitSha.substring(0,7):'');
                            } else if (e.action === 'category.added' && e.detail) {
                                summary = 'Added category “'+(e.detail.label||e.detail.slug||'')+'”';
                            } else if (e.action === 'category.updated' && e.detail) {
                                summary = 'Renamed to “'+(e.detail.newLabel||'')+'”';
                            } else if (e.action === 'category.removed' && e.detail) {
                                summary = 'Removed category “'+(e.detail.label||e.detail.slug||'')+'”';
                            } else if (e.detail) {
                                const parts=[];
                                if(e.detail.reason) parts.push('Reason: '+e.detail.reason);
                                if(e.detail.oldStatus) parts.push(e.detail.oldStatus+' → '+e.detail.newStatus);
                                summary = parts.join(' · ')||'';
                            }
                            const resBg = e.result==='success'?'#DCFCE7':e.result==='denied'?'#FEE2E2':'#F5F5F4';
                            const resCol = e.result==='success'?'#166534':e.result==='denied'?'#991B1B':'#78716C';
                            return (
                                <tr key={i} style={{background:i%2===0?'#ffffff':'#F5F3FF'}}>
                                    <td style={{padding:'10px 10px',verticalAlign:'middle',textAlign:'center'}} onClick={function(ev){ev.stopPropagation();}}>
                                        <input type="checkbox" checked={!!selectedEntries[i]} onChange={function(){toggleSelectEntry(i);}} style={{cursor:'pointer',accentColor:'#4C3BAF'}}/>
                                    </td>
                                    <td style={{padding:'10px 12px',verticalAlign:'middle'}}>
                                        <div style={{fontWeight:700,fontSize:'12px',color:'#1E293B'}}>{dt.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
                                        <div style={{fontSize:'11px',color:'#57534E',fontWeight:600}}>{dt.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
                                    </td>
                                    <td style={{padding:'10px 12px',verticalAlign:'middle',overflow:'hidden'}}>
                                        <div style={{fontWeight:700,fontSize:'12px',color:'#1E293B',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={e.adminEmail||''}>{adminName}</div>
                                    </td>
                                    <td style={{padding:'10px 12px',verticalAlign:'middle'}}>
                                        <span style={{display:'inline-block',padding:'2px 9px',borderRadius:'20px',background:m.bg,color:m.color,fontWeight:600,fontSize:'11px',border:'1px solid '+(m.border||m.color),whiteSpace:'nowrap'}}>{m.label}</span>
                                    </td>
                                    <td style={{padding:'10px 12px',verticalAlign:'middle',fontSize:'11.5px',fontFamily:'monospace',color:'#4C3BAF',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={ref}>{ref||'—'}</td>
                                    <td style={{padding:'10px 12px',verticalAlign:'middle',fontSize:'12px',color:'#0F172A',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={summary}>{summary||'—'}</td>
                                    <td style={{padding:'10px 12px',verticalAlign:'middle',textAlign:'center'}}>
                                        <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'10px',fontWeight:700,background:resBg,color:resCol}}>{e.result||''}</span>
                                    </td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr><td colSpan={6} style={{padding:'48px',textAlign:'center',color:'#94A3B8',fontSize:'13px'}}>No entries match the current filters.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            {showDrill !== null && (
                <div onClick={()=>setShowDrill(null)} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(15,23,42,0.55)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:'14px',width:'560px',maxWidth:'95vw',maxHeight:'80vh',overflow:'auto',padding:'24px',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
                            <div>
                                <div style={{fontSize:'16px',fontWeight:700,color:'#0F172A'}}>
                                    {showDrill===0?'Total Entries':showDrill===1?'Auth Events':showDrill===2?'Order Events':'Access & System'}
                                </div>
                                <div style={{fontSize:'12px',color:'#64748B',marginTop:'3px'}}>
                                    {showDrill===0?entries.length+' entries':showDrill===1?entries.filter(e=>e.action.startsWith('auth.')).length+' events':showDrill===2?entries.filter(e=>e.action.startsWith('order.')).length+' events':entries.filter(e=>!e.action.startsWith('order.')&&!e.action.startsWith('auth.')).length+' events'}
                                </div>
                            </div>
                            <button onClick={()=>setShowDrill(null)} style={{background:'none',border:'none',fontSize:'20px',color:'#94A3B8',cursor:'pointer',lineHeight:1}}>✕</button>
                        </div>
                        {(()=>{
                            const subset = showDrill===0?entries:showDrill===1?entries.filter(e=>e.action.startsWith('auth.')):showDrill===2?entries.filter(e=>e.action.startsWith('order.')):entries.filter(e=>!e.action.startsWith('order.')&&!e.action.startsWith('auth.'));
                            const byAction={};
                            subset.forEach(e=>{ byAction[e.action]=(byAction[e.action]||0)+1; });
                            const byAdmin={};
                            subset.forEach(e=>{ const k=e.adminEmail||'Unknown'; byAdmin[k]=(byAdmin[k]||0)+1; });
                            const actionRows=Object.entries(byAction).sort((a,b)=>b[1]-a[1]);
                            const adminRows=Object.entries(byAdmin).sort((a,b)=>b[1]-a[1]);
                            const maxA=actionRows.length?actionRows[0][1]:1;
                            const maxU=adminRows.length?adminRows[0][1]:1;
                            const META={'auth.login':'Login','auth.logout':'Logout','auth.auto_logoff':'Auto-logout','order.soft_delete':'Order deleted','order.permanent_delete':'Perm. deleted','order.restore':'Restored','order.status_change':'Status change','access.admin_added':'Admin added','access.admin_removed':'Admin removed','portal.products_published':'Published','category.added':'Cat. added','category.updated':'Cat. updated','category.removed':'Cat. removed'};
                            return (
                                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'24px'}}>
                                    <div>
                                        <div style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.09em',color:'#94A3B8',marginBottom:'10px'}}>By Action</div>
                                        <div style={{maxHeight:'340px',overflowY:'auto',paddingRight:'6px'}}>
                                        {actionRows.map(([action,count])=>(
                                            <div key={action} style={{marginBottom:'9px'}}>
                                                <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',marginBottom:'3px'}}>
                                                    <span style={{fontWeight:600,color:'#0F172A'}}>{META[action]||action}</span>
                                                    <span style={{color:'#64748B'}}>{count}</span>
                                                </div>
                                                <div style={{height:'5px',background:'#F1F5F9',borderRadius:'3px'}}>
                                                    <div style={{height:'100%',background:'#6366F1',borderRadius:'3px',width:Math.max(4,Math.round(count/maxA*100))+'%'}}></div>
                                                </div>
                                            </div>
                                        ))}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.09em',color:'#94A3B8',marginBottom:'10px'}}>By Admin</div>
                                        <div style={{maxHeight:'340px',overflowY:'auto',paddingRight:'6px'}}>
                                        {adminRows.map(([admin,count])=>(
                                            <div key={admin} style={{marginBottom:'9px'}}>
                                                <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',marginBottom:'3px'}}>
                                                    <span style={{fontWeight:600,color:'#0F172A'}}>{admin.split('@')[0]}</span>
                                                    <span style={{color:'#64748B'}}>{count}</span>
                                                </div>
                                                <div style={{height:'5px',background:'#F1F5F9',borderRadius:'3px'}}>
                                                    <div style={{height:'100%',background:'#10B981',borderRadius:'3px',width:Math.max(4,Math.round(count/maxU*100))+'%'}}></div>
                                                </div>
                                            </div>
                                        ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}

