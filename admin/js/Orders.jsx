// ─── Orders: OrdersDashboard

function OrdersDashboard({ session, azureUrl, onNavigate }) {
    const [orders, setOrders] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('all');
    const [submitterFilter, setSubmitterFilter] = React.useState('all');
    const [locationFilter, setLocationFilter] = React.useState('all');
    const [dateFrom, setDateFrom] = React.useState('');
    const [dateTo, setDateTo] = React.useState('');
    const [minTotal, setMinTotal] = React.useState('');
    const [maxTotal, setMaxTotal] = React.useState('');
    const [yearFilter, setYearFilter] = React.useState([new Date().getFullYear()]);
    const [sortCol, setSortCol] = React.useState('submittedAt');
    const [sortDir, setSortDir] = React.useState('desc');
    const [pageSize, setPageSize] = React.useState(25);
    const [currentPage, setCurrentPage] = React.useState(1);
    const [showDeleted, setShowDeleted] = React.useState(false);
    const [drilldown, setDrilldown] = React.useState(null);
    const [deleteModal, setDeleteModal] = React.useState(null);
    const [deleteReason, setDeleteReason] = React.useState('');
    const [restoreModal, setRestoreModal] = React.useState(null);
    const [permDeleteModal, setPermDeleteModal] = React.useState(null);
    const [permDeleteReason, setPermDeleteReason] = React.useState('');
    const [showExportMenu, setShowExportMenu] = React.useState(false);
    const [auditTypeFilter, setAuditTypeFilter] = React.useState('all');
    const [auditExpandedRows, setAuditExpandedRows] = React.useState({});
    const [status, setStatus] = React.useState(null);
    const [expandedRows, setExpandedRows] = React.useState({});
    const [selectedOrders, setSelectedOrders] = React.useState({});
    const isSuperAdmin = session && session.role === 'superadmin';
    const currentYear = new Date().getFullYear();
    const availableYears = [currentYear, currentYear - 1, currentYear - 2];

    React.useEffect(() => { loadOrders(); }, [yearFilter]);

    const loadOrders = async function() {
        setLoading(true);
        try {
            const res = await fetch(azureUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-email': session.email },
                body: JSON.stringify({ action: 'get-orders', years: yearFilter })
            });
            const data = await res.json();
            setOrders(data.orders || []);
        } catch(e) { setStatus({ type: 'error', text: 'Failed to load orders' }); }
        setLoading(false);
    };

    const loadAuditLog = function() { if (onNavigate) onNavigate('auditlog'); };

    const handleStatusChange = async function(order, newStatus) {
        try {
            await fetch(azureUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-email': session.email },
                body: JSON.stringify({ action: 'update-order-status', orderId: order.id, newStatus, year: order.year })
            });
            setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o));
            setStatus({ type: 'success', text: `Order status updated to "${newStatus}"` });
        } catch(e) { setStatus({ type: 'error', text: 'Failed to update status' }); }
    };

    const handleSoftDelete = async function() {
        if (!deleteReason.trim()) return;
        try {
            await fetch(azureUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-email': session.email },
                body: JSON.stringify({ action: 'delete-order', orderId: deleteModal.id, year: deleteModal.year, reason: deleteReason.trim() })
            });
            setOrders(prev => prev.map(o => o.id === deleteModal.id ? { ...o, status: 'Deleted', deletedBy: session.email, deleteReason: deleteReason.trim() } : o));
            setStatus({ type: 'success', text: 'Order deleted' });
        } catch(e) { setStatus({ type: 'error', text: 'Failed to delete order' }); }
        setDeleteModal(null); setDeleteReason('');
    };

    const handleRestore = async function() {
        try {
            await fetch(azureUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-email': session.email },
                body: JSON.stringify({ action: 'restore-order', orderId: restoreModal.id, year: restoreModal.year })
            });
            setOrders(prev => prev.map(o => o.id === restoreModal.id ? { ...o, status: 'New', deletedBy: undefined, deletedAt: undefined, deleteReason: undefined } : o));
            setStatus({ type: 'success', text: 'Order restored' });
        } catch(e) { setStatus({ type: 'error', text: 'Failed to restore order' }); }
        setRestoreModal(null);
    };

    const handlePermDelete = async function() {
        if (!permDeleteReason.trim()) return;
        try {
            await fetch(azureUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-email': session.email },
                body: JSON.stringify({ action: 'permanent-delete-order', orderId: permDeleteModal.id, year: permDeleteModal.year, reason: permDeleteReason.trim() })
            });
            setOrders(prev => prev.filter(o => o.id !== permDeleteModal.id));
            setStatus({ type: 'success', text: 'Order permanently deleted' });
        } catch(e) { setStatus({ type: 'error', text: 'Failed to permanently delete order' }); }
        setPermDeleteModal(null); setPermDeleteReason('');
    };

    const toggleRow = function(orderId) {
        setExpandedRows(prev => ({ ...prev, [orderId]: !prev[orderId] }));
    };

    const toggleSelect = function(e, orderId) {
        e.stopPropagation();
        setSelectedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
    };

    const toggleSelectAll = function(e) {
        if (e.target.checked) {
            const all = {};
            filtered.forEach(o => { all[o.id] = true; });
            setSelectedOrders(all);
        } else {
            setSelectedOrders({});
        }
    };

    const exportToCSV = function(ordersToExport, filename) {
        const headers = ['Order ID','Date','Time','Submitter Name','Submitter Email','Recipient Name','Recipient Email','Location ID','Ship To','Items','Total','Status','Date Needed','Notes'];
        const rows = ordersToExport.map(o => {
            const items = (o.items||[]).map(i => `${i.title} x${i.quantity||1} ($${(i.price||0).toFixed(2)})`).join('; ');
            const dt = new Date(o.submittedAt);
            return [
                o.id,
                dt.toLocaleDateString(),
                dt.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),
                o.submitterName||'',
                o.submitterEmail||'',
                o.recipientName||'',
                o.recipientEmail||'',
                o.locationId||'',
                `"${(o.shipTo||'').replace(/"/g,'""')}"`,
                `"${items.replace(/"/g,'""')}"`,
                (o.total||0).toFixed(2),
                o.status||'',
                o.dateNeeded||'',
                `"${(o.notes||'').replace(/"/g,'""')}"`
            ];
        });
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `orders-export-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExportAll = function() { exportToCSV(filtered, `orders-${yearFilter.join('-')}-all.csv`); };
    const handleExportSelected = function() {
        const sel = filtered.filter(o => selectedOrders[o.id]);
        exportToCSV(sel, `orders-selected-${Date.now()}.csv`);
    };
    const handleExportSingle = function(e, order) {
        e.stopPropagation();
        exportToCSV([order], `order-${order.id}.csv`);
    };

    // Filter logic
    const handleSort = function(col) {
        if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortCol(col); setSortDir('asc'); }
        setCurrentPage(1);
    };

    // Build unique submitters and locations for dropdowns
    const uniqueSubmitters = [...new Map(orders.map(o => [o.submitterEmail, o.submitterName])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
    const uniqueLocations = [...new Set(orders.map(o => o.locationId).filter(Boolean))].sort();

    const filtered = orders.filter(o => {
        if (!showDeleted && o.status === 'Deleted') return false;
        if (statusFilter !== 'all' && o.status !== statusFilter) return false;
        if (submitterFilter !== 'all' && o.submitterEmail !== submitterFilter) return false;
        if (locationFilter !== 'all' && o.locationId !== locationFilter) return false;
        if (dateFrom) { const d = new Date(o.submittedAt); if (d < new Date(dateFrom)) return false; }
        if (dateTo) { const d = new Date(o.submittedAt); if (d > new Date(dateTo + 'T23:59:59')) return false; }
        if (minTotal && (o.total || 0) < parseFloat(minTotal)) return false;
        if (maxTotal && (o.total || 0) > parseFloat(maxTotal)) return false;
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            return (o.submitterName||'').toLowerCase().includes(q) ||
                   (o.submitterEmail||'').toLowerCase().includes(q) ||
                   (o.recipientName||'').toLowerCase().includes(q) ||
                   (o.locationId||'').toLowerCase().includes(q) ||
                   (o.shipTo||'').toLowerCase().includes(q) ||
                   (o.id||'').toLowerCase().includes(q);
        }
        return true;
    }).sort((a, b) => {
        let av = a[sortCol], bv = b[sortCol];
        if (sortCol === 'total') { av = a.total||0; bv = b.total||0; return sortDir==='asc' ? av-bv : bv-av; }
        if (sortCol === 'submittedAt') { av = new Date(a.submittedAt); bv = new Date(b.submittedAt); return sortDir==='asc' ? av-bv : bv-av; }
        av = (av||'').toString().toLowerCase(); bv = (bv||'').toString().toLowerCase();
        return sortDir==='asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

    const totalPages = pageSize === 'all' ? 1 : Math.ceil(filtered.length / pageSize);
    const paginated = pageSize === 'all' ? filtered : filtered.slice((currentPage-1)*pageSize, currentPage*pageSize);

    const handleFilterChange = (setter) => (e) => { setter(e.target.value); setCurrentPage(1); };

    const stats = {
        total: orders.filter(o => o.status !== 'Deleted').length,
        newOrders: orders.filter(o => o.status === 'New').length,
        inProgress: orders.filter(o => o.status === 'In Progress').length,
        totalValue: orders.filter(o => o.status !== 'Deleted').reduce((s, o) => s + (o.total || 0), 0),
        deleted: orders.filter(o => o.status === 'Deleted').length
    };

    const badgeStyle = (status) => {
        if (status === 'New') return { background:'#E6F1FB', color:'#0C447C', padding:'2px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:500 };
        if (status === 'In Progress') return { background:'#FEF3C7', color:'#92400E', padding:'2px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:500 };
        if (status === 'Fulfilled') return { background:'#D1FAE5', color:'#065F46', padding:'2px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:500 };
        if (status === 'Deleted') return { background:'#FEE2E2', color:'#991B1B', padding:'2px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:500 };
        return { padding:'2px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:500 };
    };

    const actionLabel = (action) => {
        const map = {
            'auth.login': '🔐 Login', 'auth.auto_logoff': '⏱ Auto-logout', 'auth.logout': '🚪 Logout',
            'order.status_change': '🔄 Status changed', 'order.soft_delete': '🗑 Order deleted',
            'order.restore': '↩️ Order restored', 'order.permanent_delete': '❌ Permanently deleted',
            'order.permanent_delete_attempt': '🚫 Perm. delete denied',
            'access.admin_added': '➕ Admin added', 'access.admin_removed': '➖ Admin removed',
        };
        return map[action] || action;
    };

    return (
        <div style={{padding:'1.5rem'}}>
            {status && (
                <div style={{padding:'10px 16px',borderRadius:'8px',marginBottom:'1rem',fontSize:'13px',fontWeight:500,
                    background: status.type==='success'?'#D1FAE5':'#FEE2E2',
                    color: status.type==='success'?'#065F46':'#991B1B'}}>
                    {status.type==='success'?'✅':'❌'} {status.text}
                    <button onClick={()=>setStatus(null)} style={{float:'right',background:'none',border:'none',cursor:'pointer',fontSize:'14px'}}>✕</button>
                </div>
            )}
            <div style={{height:'3px',background:'linear-gradient(90deg,#DB802E,#EFA855,#DB802E)',borderRadius:'2px',marginBottom:'16px'}}></div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'14px',marginBottom:'20px'}}>
                <div onClick={()=>setDrilldown('total')} style={{cursor:'pointer',background:'linear-gradient(135deg,#4F46E5 0%,#6366F1 100%)',borderRadius:'16px',padding:'20px',position:'relative',overflow:'hidden'}}>
                    <div style={{position:'absolute',top:'-10px',right:'-10px',width:'70px',height:'70px',background:'rgba(255,255,255,0.1)',borderRadius:'50%'}}></div>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
                        <div style={{width:'36px',height:'36px',background:'rgba(255,255,255,0.2)',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <i className="ti ti-shopping-cart" style={{fontSize:'18px',color:'white'}}></i>
                        </div>
                    </div>
                    <div style={{fontSize:'36px',fontWeight:800,color:'white',lineHeight:1,letterSpacing:'-1px',fontFamily:"'Inter',-apple-system,sans-serif"}}>{stats.total}</div>
                    <div style={{fontSize:'13px',color:'white',marginTop:'8px',fontWeight:600}}>Total Orders</div>
                    <div style={{fontSize:'11px',color:'rgba(255,255,255,0.85)',marginTop:'2px'}}>All time</div>
                </div>
                <div onClick={()=>setDrilldown('new')} style={{cursor:'pointer',background:'linear-gradient(135deg,#0EA5E9 0%,#38BDF8 100%)',borderRadius:'16px',padding:'20px',position:'relative',overflow:'hidden'}}>
                    <div style={{position:'absolute',top:'-10px',right:'-10px',width:'70px',height:'70px',background:'rgba(255,255,255,0.1)',borderRadius:'50%'}}></div>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
                        <div style={{width:'36px',height:'36px',background:'rgba(255,255,255,0.2)',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <i className="ti ti-clock" style={{fontSize:'18px',color:'white'}}></i>
                        </div>
                    </div>
                    <div style={{fontSize:'36px',fontWeight:800,color:'white',lineHeight:1,letterSpacing:'-1px',fontFamily:"'Inter',-apple-system,sans-serif"}}>{stats.newOrders}</div>
                    <div style={{fontSize:'13px',color:'white',marginTop:'8px',fontWeight:600}}>New · Awaiting</div>
                    <div style={{fontSize:'11px',color:'rgba(255,255,255,0.85)',marginTop:'2px'}}>Pending review</div>
                </div>
                <div onClick={()=>setDrilldown('inprogress')} style={{cursor:'pointer',background:'linear-gradient(135deg,#F59E0B 0%,#FBBF24 100%)',borderRadius:'16px',padding:'20px',position:'relative',overflow:'hidden'}}>
                    <div style={{position:'absolute',top:'-10px',right:'-10px',width:'70px',height:'70px',background:'rgba(255,255,255,0.1)',borderRadius:'50%'}}></div>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
                        <div style={{width:'36px',height:'36px',background:'rgba(255,255,255,0.2)',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <i className="ti ti-loader" style={{fontSize:'18px',color:'white'}}></i>
                        </div>
                    </div>
                    <div style={{fontSize:'36px',fontWeight:800,color:'white',lineHeight:1,letterSpacing:'-1px',fontFamily:"'Inter',-apple-system,sans-serif"}}>{stats.inProgress}</div>
                    <div style={{fontSize:'13px',color:'white',marginTop:'8px',fontWeight:600}}>In Progress</div>
                    <div style={{fontSize:'11px',color:'rgba(255,255,255,0.85)',marginTop:'2px'}}>Being sourced</div>
                </div>
                <div onClick={()=>setDrilldown('value')} style={{cursor:'pointer',background:'linear-gradient(135deg,#10B981 0%,#34D399 100%)',borderRadius:'16px',padding:'20px',position:'relative',overflow:'hidden'}}>
                    <div style={{position:'absolute',top:'-10px',right:'-10px',width:'70px',height:'70px',background:'rgba(255,255,255,0.1)',borderRadius:'50%'}}></div>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
                        <div style={{width:'36px',height:'36px',background:'rgba(255,255,255,0.2)',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <i className="ti ti-currency-dollar" style={{fontSize:'18px',color:'white'}}></i>
                        </div>
                    </div>
                    <div style={{fontSize:'36px',fontWeight:800,color:'white',lineHeight:1,letterSpacing:'-1px',fontFamily:"'Inter',-apple-system,sans-serif"}}>{(v => v>=1000000 ? '$'+(v/1000000).toFixed(2).replace(/\.?0+$/,'')+'M' : v>=1000 ? '$'+Math.round(v/1000)+'K' : '$'+v.toLocaleString())(stats.totalValue)}</div>
                    <div style={{fontSize:'13px',color:'white',marginTop:'8px',fontWeight:600}}>Total Value</div>
                    <div style={{fontSize:'11px',color:'rgba(255,255,255,0.85)',marginTop:'2px'}}>Year {currentYear}</div>
                </div>
                <div onClick={stats.deleted>0?()=>setShowDeleted(true):undefined} style={{background:stats.deleted>0?'linear-gradient(135deg,#EF4444 0%,#F87171 100%)':'linear-gradient(135deg,#94A3B8 0%,#CBD5E1 100%)',borderRadius:'16px',padding:'20px',position:'relative',overflow:'hidden',cursor:stats.deleted>0?'pointer':'default'}}>
                    <div style={{position:'absolute',top:'-10px',right:'-10px',width:'70px',height:'70px',background:'rgba(255,255,255,0.1)',borderRadius:'50%'}}></div>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
                        <div style={{width:'36px',height:'36px',background:'rgba(255,255,255,0.2)',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <i className="ti ti-trash" style={{fontSize:'18px',color:'white'}}></i>
                        </div>
                    </div>
                    <div style={{fontSize:'36px',fontWeight:800,color:'white',lineHeight:1,letterSpacing:'-1px',fontFamily:"'Inter',-apple-system,sans-serif"}}>{stats.deleted}</div>
                    <div style={{fontSize:'13px',color:'white',marginTop:'8px',fontWeight:600}}>Soft Deleted</div>
                    <div style={{fontSize:'11px',color:'rgba(255,255,255,0.85)',marginTop:'2px'}}>{stats.deleted>0?'Click to view':'None'}</div>
                </div>
            </div>
            <div style={{display:'flex',gap:'8px',marginBottom:'8px',flexWrap:'wrap',alignItems:'center'}}>
                <div style={{flex:1,minWidth:'260px',position:'relative'}}>
                    <span style={{position:'absolute',left:'10px',top:'50%',transform:'translateY(-50%)',color:'#4C3BAF',fontSize:'15px'}}>🔍</span>
                    <input type="text" placeholder="Search name, email, location, recipient, address..." value={searchQuery}
                        onChange={handleFilterChange(setSearchQuery)}
                        style={{width:'100%',padding:'9px 12px 9px 34px',border:'1.5px solid #0369A1',borderRadius:'8px',fontSize:'13px',background:'white',color:'#1E3A5F'}} />
                </div>
                <select value={statusFilter} onChange={handleFilterChange(setStatusFilter)}
                    style={{padding:'9px 12px',border:'1.5px solid #0369A1',borderRadius:'8px',fontSize:'13px',minWidth:'140px',background:'white',color:'#1E3A5F',fontWeight:500}}>
                    <option value="all">All statuses</option>
                    <option value="New">New</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Fulfilled">Fulfilled</option>
                    {showDeleted && <option value="Deleted">Deleted</option>}
                </select>
                <select value={submitterFilter} onChange={handleFilterChange(setSubmitterFilter)}
                    style={{padding:'9px 12px',border:'1.5px solid #0369A1',borderRadius:'8px',fontSize:'13px',minWidth:'155px',background:'white',color:'#1E3A5F',fontWeight:500}}>
                    <option value="all">All submitters</option>
                    {uniqueSubmitters.map(([email, name]) => (
                        <option key={email} value={email}>{name}</option>
                    ))}
                </select>
                <select value={locationFilter} onChange={handleFilterChange(setLocationFilter)}
                    style={{padding:'9px 12px',border:'1.5px solid #0369A1',borderRadius:'8px',fontSize:'13px',minWidth:'145px',background:'white',color:'#1E3A5F',fontWeight:500}}>
                    <option value="all">All locations</option>
                    {uniqueLocations.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                    ))}
                </select>
            </div>
            <div style={{display:'flex',gap:'7px',marginBottom:'16px',flexWrap:'wrap',alignItems:'center',background:'#F0F4F8',padding:'10px 12px',borderRadius:'8px',border:'0.5px solid #C7D9F0'}}>
                <span style={{fontSize:'12px',color:'#4C3BAF',fontWeight:700}}>Date:</span>
                <input type="date" value={dateFrom} onChange={handleFilterChange(setDateFrom)}
                    style={{padding:'6px 9px',border:'1.5px solid #0369A1',borderRadius:'7px',fontSize:'12px',background:'white',color:'#1E3A5F'}} />
                <span style={{fontSize:'12px',color:'#78716C',fontWeight:500}}>to</span>
                <input type="date" value={dateTo} onChange={handleFilterChange(setDateTo)}
                    style={{padding:'6px 9px',border:'1.5px solid #0369A1',borderRadius:'7px',fontSize:'12px',background:'white',color:'#1E3A5F'}} />
                <div style={{width:'1px',height:'20px',background:'#C7D9F0',margin:'0 4px'}}></div>
                <span style={{fontSize:'12px',color:'#4C3BAF',fontWeight:700}}>$ Total:</span>
                <input type="number" placeholder="Min" value={minTotal} onChange={handleFilterChange(setMinTotal)}
                    style={{width:'75px',padding:'6px 9px',border:'1.5px solid #0369A1',borderRadius:'7px',fontSize:'12px',background:'white',color:'#1E3A5F'}} />
                <span style={{fontSize:'12px',color:'#78716C',fontWeight:500}}>to</span>
                <input type="number" placeholder="Max" value={maxTotal} onChange={handleFilterChange(setMaxTotal)}
                    style={{width:'75px',padding:'6px 9px',border:'1.5px solid #0369A1',borderRadius:'7px',fontSize:'12px',background:'white',color:'#1E3A5F'}} />
                <div style={{width:'1px',height:'20px',background:'#C7D9F0',margin:'0 4px'}}></div>
                {availableYears.map(y => (
                    <button key={y} onClick={()=>{setYearFilter(prev=>prev.includes(y)?prev.filter(x=>x!==y):[...prev,y]);setCurrentPage(1);}}
                        style={{padding:'5px 14px',border:'1.5px solid #0369A1',borderRadius:'20px',fontSize:'12px',fontWeight:700,cursor:'pointer',
                            background:yearFilter.includes(y)?'#4C3BAF':'white',
                            color:yearFilter.includes(y)?'white':'#4C3BAF'}}>
                        {y}
                    </button>
                ))}
                <span style={{fontSize:'12px',color:'#4C3BAF',fontWeight:500,marginLeft:'4px'}}>
                    Showing <strong style={{color:'#1E3A5F'}}>{filtered.length}</strong> of <strong style={{color:'#1E3A5F'}}>{orders.filter(o=>showDeleted||o.status!=="Deleted").length}</strong> orders
                </span>
                <div style={{marginLeft:'auto',display:'flex',gap:'6px'}}>
                    <button onClick={()=>setShowDeleted(p=>!p)}
                        style={{padding:'6px 12px',border:'1.5px solid',borderRadius:'8px',fontSize:'12px',fontWeight:500,cursor:'pointer',
                            borderColor:showDeleted?'#DC2626':'#4C3BAF',
                            background:showDeleted?'#FEE2E2':'white',
                            color:showDeleted?'#DC2626':'#4C3BAF'}}>
                        {showDeleted?'Hide deleted':'Show deleted'}
                    </button>
                    <div style={{position:'relative'}}>
                        <button onClick={()=>setShowExportMenu(p=>!p)}
                            style={{padding:'6px 12px',border:'1.5px solid #0369A1',borderRadius:'8px',fontSize:'12px',fontWeight:500,cursor:'pointer',background:showExportMenu?'#4C3BAF':'white',color:showExportMenu?'white':'#4C3BAF',display:'flex',alignItems:'center',gap:'5px'}}>
                            ⬇ Export <span style={{fontSize:'10px'}}>{showExportMenu?'▲':'▼'}</span>
                        </button>
                        {showExportMenu && (
                            <div style={{position:'absolute',top:'calc(100% + 4px)',right:0,background:'white',border:'1.5px solid #0369A1',borderRadius:'8px',boxShadow:'0 4px 16px rgba(0,0,0,0.12)',zIndex:200,minWidth:'210px',overflow:'hidden'}}>
                                <div style={{padding:'6px 8px',background:'#F0F4F8',borderBottom:'0.5px solid #C7D9F0',fontSize:'10px',fontWeight:700,color:'#4C3BAF',textTransform:'uppercase',letterSpacing:'0.07em'}}>
                                    Choose what to export
                                </div>
                                <button onClick={()=>{exportToCSV(paginated,`orders-page-${currentPage}.csv`);setShowExportMenu(false);}}
                                    style={{width:'100%',padding:'9px 14px',border:'none',borderBottom:'0.5px solid #E7E5E4',background:'white',textAlign:'left',cursor:'pointer',fontSize:'12px',color:'#1E3A5F',fontFamily:'inherit'}}>
                                    <div style={{fontWeight:600}}>This page only</div>
                                    <div style={{fontSize:'11px',color:'#78716C',marginTop:'1px'}}>{paginated.length} orders currently visible</div>
                                </button>
                                <button onClick={()=>{exportToCSV(filtered,`orders-${yearFilter.join('-')}-filtered.csv`);setShowExportMenu(false);}}
                                    style={{width:'100%',padding:'9px 14px',border:'none',borderBottom:'0.5px solid #E7E5E4',background:'white',textAlign:'left',cursor:'pointer',fontSize:'12px',color:'#1E3A5F',fontFamily:'inherit'}}>
                                    <div style={{fontWeight:600}}>All filtered results</div>
                                    <div style={{fontSize:'11px',color:'#78716C',marginTop:'1px'}}>{filtered.length} orders matching current filters</div>
                                </button>
                                <button onClick={()=>{
                                    const sel = filtered.filter(o=>selectedOrders[o.id]);
                                    if(!sel.length){alert('No orders selected. Use the checkboxes to select orders first.');return;}
                                    exportToCSV(sel,`orders-selected-${Date.now()}.csv`);
                                    setShowExportMenu(false);
                                }}
                                    style={{width:'100%',padding:'9px 14px',border:'none',background:'white',textAlign:'left',cursor:'pointer',fontSize:'12px',color: Object.values(selectedOrders).some(Boolean)?'#1E3A5F':'#A8A29E',fontFamily:'inherit'}}>
                                    <div style={{fontWeight:600}}>Selected orders only</div>
                                    <div style={{fontSize:'11px',color:'#78716C',marginTop:'1px'}}>{Object.values(selectedOrders).filter(Boolean).length} orders selected</div>
                                </button>
                            </div>
                        )}
                    </div>
                    <button onClick={()=>loadAuditLog()}
                        style={{padding:'6px 12px',border:'none',borderRadius:'8px',fontSize:'12px',fontWeight:600,cursor:'pointer',background:'#4C3BAF',color:'white'}}>
                        Audit log
                    </button>
                </div>
            </div>
            {loading ? (
                <div style={{textAlign:'center',padding:'3rem',color:'#A8A29E'}}>Loading orders...</div>
            ) : filtered.length === 0 ? (
                <div style={{textAlign:'center',padding:'3rem',color:'#A8A29E',background:'white',borderRadius:'10px',border:'0.5px solid #E7E5E4'}}>
                    {orders.length === 0 ? 'No orders yet.' : 'No orders match your filters.'}
                </div>
            ) : (
                <div style={{background:'white',borderRadius:'10px',border:'0.5px solid #E7E5E4',overflow:'hidden'}}>
                    {Object.values(selectedOrders).some(Boolean) && (
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',background:'#EEF4FF',borderBottom:'0.5px solid #B5D4F4'}}>
                            <span style={{fontSize:'12px',color:'#0C447C',fontWeight:500}}>
                                {Object.values(selectedOrders).filter(Boolean).length} order{Object.values(selectedOrders).filter(Boolean).length > 1 ? 's' : ''} selected
                            </span>
                            <button onClick={handleExportSelected}
                                style={{padding:'4px 14px',background:'#D97706',color:'white',border:'none',borderRadius:'6px',fontSize:'11px',cursor:'pointer',fontFamily:'inherit',fontWeight:500}}>
                                ⬇ Export selected
                            </button>
                        </div>
                    )}
                    <table id="tbl-orders" className="resizable-table" style={{tableLayout:'fixed',width:'100%',borderCollapse:'collapse',fontSize:'12px',tableLayout:'fixed'}}>
                        <thead>
                            <tr style={{background:'#FAFAF9'}}>
                                <th style={{padding:'9px 10px',width:'3%',borderBottom:'0.5px solid #E7E5E4'}}>
                                    <input type="checkbox" onChange={toggleSelectAll}
                                        checked={filtered.length > 0 && filtered.every(o => selectedOrders[o.id])}
                                        style={{cursor:'pointer',accentColor:'#1E3A5F'}} />
                                </th>
                                <th style={{padding:'9px 10px',width:'3%',borderBottom:'0.5px solid #E7E5E4'}}></th>
                                {[
                                    {label:'Date/Time', col:'submittedAt', w:'10%'},
                                    {label:'Submitted by', col:'submitterName', w:'13%'},
                                    {label:'Recipient', col:'recipientName', w:'10%'},
                                    {label:'Location', col:'locationId', w:'7%'},
                                    {label:'Ship To', col:'shipTo', w:'15%'},
                                    {label:'Total', col:'total', w:'8%'},
                                    {label:'Status', col:'status', w:'9%'},
                                    {label:'Actions', col:null, w:'12%'},
                                ].map((h,i) => (
                                    <th key={i} onClick={h.col ? ()=>handleSort(h.col) : undefined}
                                        style={{padding:'9px 10px',textAlign:'left',fontSize:'11px',fontWeight:700,color:'#1E3A5F',textTransform:'uppercase',
                                            letterSpacing:'0.05em',borderBottom:'3px solid #6366F1',width:h.w,
                                            cursor:h.col?'pointer':'default',userSelect:'none',background:'#D97706',color:'white'}}>
                                        {h.label}
                                        {h.col && <span style={{marginLeft:'4px',fontSize:'10px',opacity:sortCol===h.col?1:0.35,color:sortCol===h.col?'#4C3BAF':'#78716C'}}>
                                            {sortCol===h.col ? (sortDir==='asc'?'▲':'▼') : '⇅'}
                                        </span>}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                        {paginated.map((order, rowIndex) => (
                                <React.Fragment key={order.id}>
                                    <tr onClick={()=>toggleRow(order.id)}
                                        style={{cursor:'pointer',opacity:order.status==='Deleted'?0.6:1,
                                            background:expandedRows[order.id]?'#DBEAFE':rowIndex%2===0?'white':'#DBEAFE'}}>
                                        <td style={{padding:'10px',borderBottom:'0.5px solid #E7E5E4'}} onClick={e=>e.stopPropagation()}>
                                            <input type="checkbox" checked={!!selectedOrders[order.id]}
                                                onChange={e=>toggleSelect(e, order.id)}
                                                style={{cursor:'pointer',accentColor:'#1E3A5F'}} />
                                        </td>
                                        <td style={{padding:'10px',borderBottom:'0.5px solid #E7E5E4',color:'#A8A29E',fontSize:'14px',textAlign:'center'}}>
                                            {expandedRows[order.id] ? '▾' : '▸'}
                                        </td>
                                        <td style={{padding:'10px',borderBottom:'0.5px solid #E7E5E4'}}>
                                            <div style={{fontWeight:700,fontSize:'12px',color:'#1E3A5F'}}>{new Date(order.submittedAt).toLocaleDateString()}</div>
                                            <div style={{fontWeight:700,fontSize:'11px',color:'#57534E'}}>{new Date(order.submittedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
                                        </td>
                                        <td style={{padding:'10px',borderBottom:'0.5px solid #F5F5F4'}}>
                                            <div style={{fontWeight:500,fontSize:'12px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{order.submitterName}</div>
                                            <div style={{fontSize:'10px',color:'#78716C',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{order.submitterEmail}</div>
                                        </td>
                                        <td style={{padding:'10px',borderBottom:'0.5px solid #F5F5F4',fontSize:'12px',fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{order.recipientName}</td>
                                        <td style={{padding:'10px',borderBottom:'0.5px solid #F5F5F4'}}>
                                            <div style={{fontWeight:600,fontSize:'12px',color:'#4C3BAF'}}>{order.locationId}</div>
                                        </td>
                                        <td style={{padding:'10px',borderBottom:'0.5px solid #F5F5F4',fontSize:'11.5px',fontWeight:700,color:'#1E3A5F',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{order.shipTo}</td>
                                        <td style={{padding:'10px',borderBottom:'0.5px solid #F5F5F4',fontWeight:500,fontSize:'12px',color:'#1E3A5F'}}>${(order.total||0).toFixed(2)}</td>
                                        <td style={{padding:'10px',borderBottom:'0.5px solid #F5F5F4'}} onClick={e=>e.stopPropagation()}>
                                            {order.status === 'Deleted' ? (
                                                <span style={badgeStyle('Deleted')}>Deleted</span>
                                            ) : (
                                                <select value={order.status} onChange={e=>handleStatusChange(order, e.target.value)}
                                                    style={{fontSize:'11px',padding:'3px 6px',border:'0.5px solid #D6D3D1',borderRadius:'6px',background:'white',cursor:'pointer'}}>
                                                    <option>New</option>
                                                    <option>In Progress</option>
                                                    <option>Fulfilled</option>
                                                </select>
                                            )}
                                        </td>
                                        <td style={{padding:'10px',borderBottom:'0.5px solid #F5F5F4'}} onClick={e=>e.stopPropagation()}>
                                            <div style={{display:'flex',gap:'4px',flexWrap:'wrap'}}>
                                                {order.status !== 'Deleted' && (
                                                    <button onClick={()=>{ setDeleteModal(order); setDeleteReason(''); }}
                                                        style={{padding:'3px 8px',border:'0.5px solid #FCA5A5',borderRadius:'5px',fontSize:'11px',background:'white',color:'#DC2626',cursor:'pointer'}}>
                                                        Delete
                                                    </button>
                                                )}
                                                {order.status === 'Deleted' && (
                                                    <button onClick={()=>setRestoreModal(order)}
                                                        style={{padding:'3px 8px',border:'0.5px solid #6EE7B7',borderRadius:'5px',fontSize:'11px',background:'white',color:'#065F46',cursor:'pointer'}}>
                                                        Restore
                                                    </button>
                                                )}
                                                {order.status === 'Deleted' && isSuperAdmin && (
                                                    <button onClick={()=>{ setPermDeleteModal(order); setPermDeleteReason(''); }}
                                                        style={{padding:'3px 8px',border:'0.5px solid #DC2626',borderRadius:'5px',fontSize:'11px',background:'#FEE2E2',color:'#DC2626',cursor:'pointer',fontWeight:500}}>
                                                        Perm. Delete
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedRows[order.id] && (
                                        <tr>
                                            <td colSpan={10} style={{padding:0,borderBottom:'3px solid #6366F1',background:'#F0F4F8'}}>
                                                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0',borderTop:'2px solid #4C3BAF'}}>
                                                    <div style={{background:'#EEF4FF',borderRight:'1px solid #C7D9F0',padding:'14px 16px'}}>
                                                        <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'10px',paddingBottom:'8px',borderBottom:'1.5px solid #4C3BAF'}}>
                                                            <div style={{width:'3px',height:'14px',background:'#4C3BAF',borderRadius:'2px'}}></div>
                                                            <span style={{fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'#4C3BAF'}}>Items Ordered</span>
                                                        </div>
                                                        {(order.items||[]).length > 0 ? (
                                                            <div style={{background:'white',borderRadius:'6px',overflow:'hidden',border:'1px solid #C7D9F0'}}>
                                                                {(order.items||[]).map((item,i) => (
                                                                    <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'7px 10px',borderBottom:i<(order.items||[]).length-1?'0.5px solid #E6F1FB':'none',fontSize:'12px'}}>
                                                                        <span style={{color:'#1E3A5F',fontWeight:500}}>{item.title} <span style={{color:'#78716C',fontWeight:400}}>×{item.quantity||1}</span></span>
                                                                        <span style={{color:'#4C3BAF',fontWeight:600}}>${((item.price||0)*(item.quantity||1)).toFixed(2)}</span>
                                                                    </div>
                                                                ))}
                                                                <div style={{display:'flex',justifyContent:'space-between',padding:'8px 10px',background:'#4C3BAF',fontSize:'12px',fontWeight:700}}>
                                                                    <span style={{color:'white'}}>Total</span>
                                                                    <span style={{color:'white'}}>${(order.total||0).toFixed(2)}</span>
                                                                </div>
                                                            </div>
                                                        ) : <span style={{fontSize:'12px',color:'#A8A29E'}}>No item detail available</span>}
                                                    </div>
                                                    <div style={{background:'#F0FBF6',borderRight:'1px solid #A3D9C0',padding:'14px 16px'}}>
                                                        <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'10px',paddingBottom:'8px',borderBottom:'1.5px solid #4C3BAF'}}>
                                                            <div style={{width:'3px',height:'14px',background:'#4C3BAF',borderRadius:'2px'}}></div>
                                                            <span style={{fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'#4C3BAF'}}>Recipient Details</span>
                                                        </div>
                                                        <div style={{fontSize:'12px'}}>
                                                            <div style={{fontWeight:700,fontSize:'13px',color:'#1E3A5F',marginBottom:'2px'}}>{order.recipientName}</div>
                                                            {order.recipientEmail && order.recipientEmail !== 'Not provided' && (
                                                                <div style={{color:'#57534E',marginBottom:'8px',fontSize:'11.5px'}}>{order.recipientEmail}</div>
                                                            )}
                                                            <div style={{display:'inline-block',padding:'2px 8px',borderRadius:'10px',fontSize:'11px',fontWeight:500,marginBottom:'12px',
                                                                background:order.isNewEmployee==='yes'?'#D1FAE5':'#F1F5F9',
                                                                color:order.isNewEmployee==='yes'?'#065F46':'#475569'}}>
                                                                {order.isNewEmployee==='yes' ? '★ New employee' : 'Existing employee'}
                                                            </div>
                                                            <div style={{marginBottom:'8px'}}>
                                                                <div style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'#4C3BAF',marginBottom:'2px'}}>Date Needed</div>
                                                                <div style={{color:'#1E3A5F',fontWeight:500}}>{order.dateNeeded || 'Not specified'}</div>
                                                            </div>
                                                            <div>
                                                                <div style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'#4C3BAF',marginBottom:'2px'}}>Ship To</div>
                                                                <div style={{color:'#1E3A5F',fontWeight:500}}>{order.shipTo}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{background:'#FFFBF0',padding:'14px 16px'}}>
                                                        <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'10px',paddingBottom:'8px',borderBottom:'1.5px solid #B45309'}}>
                                                            <div style={{width:'3px',height:'14px',background:'#B45309',borderRadius:'2px'}}></div>
                                                            <span style={{fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'#B45309'}}>Order Info</span>
                                                        </div>
                                                        <div style={{fontSize:'12px'}}>
                                                            <div style={{marginBottom:'10px'}}>
                                                                <div style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'#B45309',marginBottom:'4px'}}>Order ID</div>
                                                                <div style={{fontFamily:'monospace',fontSize:'11px',color:'#57534E',background:'white',padding:'5px 8px',borderRadius:'4px',border:'1px solid #FDE68A',wordBreak:'break-all'}}>{order.id}</div>
                                                            </div>
                                                            <div style={{marginBottom:'10px'}}>
                                                                <div style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'#B45309',marginBottom:'4px'}}>Special Instructions</div>
                                                                <div style={{color:'#1E3A5F',fontWeight:order.notes&&order.notes!=='None'?500:400,
                                                                    padding:'6px 8px',background:'white',borderRadius:'4px',border:'1px solid #FDE68A',fontSize:'12px'}}>
                                                                    {order.notes && order.notes !== 'None' ? order.notes : <span style={{color:'#A8A29E',fontStyle:'italic'}}>None</span>}
                                                                </div>
                                                            </div>
                                                            {order.status === 'Fulfilled' && (
                                                                <div style={{marginBottom:'10px'}}>
                                                                    <div style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'#B45309',marginBottom:'4px'}}>Fulfilled By</div>
                                                                    <div style={{color:'#1E3A5F',fontWeight:500}}>{order.statusUpdatedBy || 'Unknown'}</div>
                                                                </div>
                                                            )}
                                                            <button onClick={e=>handleExportSingle(e, order)}
                                                                style={{padding:'6px 14px',border:'1px solid #D97706',borderRadius:'6px',fontSize:'11px',background:'white',cursor:'pointer',fontFamily:'inherit',color:'#B45309',fontWeight:600}}>
                                                                ⬇ Export this order
                                                            </button>
                                                        </div>
                                                    </div>

                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {filtered.length > 0 && (
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 4px',marginTop:'8px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'12px',color:'#57534E'}}>
                        Show
                        <select value={pageSize} onChange={e=>{setPageSize(e.target.value==='all'?'all':parseInt(e.target.value));setCurrentPage(1);}}
                            style={{padding:'4px 8px',border:'0.5px solid #D6D3D1',borderRadius:'6px',fontSize:'12px',fontFamily:'inherit'}}>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value="all">All</option>
                        </select>
                        per page
                        {pageSize === 'all' && filtered.length > 200 && (
                            <span style={{color:'#6366F1',fontSize:'11px',fontWeight:500}}>⚠ Large result — consider exporting to CSV</span>
                        )}
                    </div>
                    <div style={{fontSize:'12px',color:'#78716C'}}>
                        {pageSize === 'all' ? `All ${filtered.length} orders` : `Page ${currentPage} of ${totalPages} · ${filtered.length} orders`}
                    </div>
                    {pageSize !== 'all' && totalPages > 1 && (
                        <div style={{display:'flex',gap:'4px'}}>
                            <button onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1}
                                style={{padding:'4px 10px',border:'0.5px solid #D6D3D1',borderRadius:'6px',fontSize:'12px',cursor:'pointer',background:'white',color:'#57534E',fontFamily:'inherit',opacity:currentPage===1?0.4:1}}>‹</button>
                            {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
                                let p;
                                if (totalPages<=5) p=i+1;
                                else if (currentPage<=3) p=i+1;
                                else if (currentPage>=totalPages-2) p=totalPages-4+i;
                                else p=currentPage-2+i;
                                return (
                                    <button key={p} onClick={()=>setCurrentPage(p)}
                                        style={{padding:'4px 10px',border:'0.5px solid',borderRadius:'6px',fontSize:'12px',cursor:'pointer',fontFamily:'inherit',fontWeight:currentPage===p?500:400,
                                            borderColor:currentPage===p?'#1E3A5F':'#D6D3D1',
                                            background:currentPage===p?'#1E3A5F':'white',
                                            color:currentPage===p?'white':'#57534E'}}>{p}</button>
                                );
                            })}
                            <button onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={currentPage===totalPages}
                                style={{padding:'4px 10px',border:'0.5px solid #D6D3D1',borderRadius:'6px',fontSize:'12px',cursor:'pointer',background:'white',color:'#57534E',fontFamily:'inherit',opacity:currentPage===totalPages?0.4:1}}>›</button>
                        </div>
                    )}
                </div>
            )}
            {deleteModal && (
                <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.45)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <div style={{background:'white',borderRadius:'12px',padding:'1.5rem',width:'420px',maxWidth:'90vw',boxShadow:'0 8px 32px rgba(0,0,0,0.18)'}}>
                        <h3 style={{fontSize:'1.1rem',fontWeight:600,marginBottom:'0.75rem',color:'#DC2626'}}>Delete Order</h3>
                        <p style={{fontSize:'13px',color:'#57534E',marginBottom:'1rem'}}>
                            Order <strong>{deleteModal.id}</strong> for <strong>{deleteModal.recipientName}</strong> will be soft-deleted and hidden from the dashboard. You can restore it later.
                        </p>
                        <label style={{fontSize:'13px',fontWeight:500,display:'block',marginBottom:'6px'}}>Reason for deletion <span style={{color:'#DC2626'}}>*</span></label>
                        <input type="text" placeholder="e.g. Duplicate entry, Test order, Submitted in error..."
                            value={deleteReason} onChange={e=>setDeleteReason(e.target.value)}
                            style={{width:'100%',padding:'8px 10px',border:'1px solid #D6D3D1',borderRadius:'8px',fontSize:'13px',marginBottom:'1rem'}} />
                        <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
                            <button onClick={()=>setDeleteModal(null)} style={{padding:'7px 16px',border:'0.5px solid #D6D3D1',borderRadius:'8px',background:'white',cursor:'pointer',fontSize:'13px'}}>Cancel</button>
                            <button onClick={handleSoftDelete} disabled={!deleteReason.trim()}
                                style={{padding:'7px 16px',border:'none',borderRadius:'8px',background: deleteReason.trim()?'#DC2626':'#FCA5A5',color:'white',cursor:'pointer',fontSize:'13px',fontWeight:500}}>
                                Delete Order
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {restoreModal && (
                <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.45)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <div style={{background:'white',borderRadius:'12px',padding:'1.5rem',width:'380px',maxWidth:'90vw',boxShadow:'0 8px 32px rgba(0,0,0,0.18)'}}>
                        <h3 style={{fontSize:'1.1rem',fontWeight:600,marginBottom:'0.75rem',color:'#065F46'}}>Restore Order</h3>
                        <p style={{fontSize:'13px',color:'#57534E',marginBottom:'1rem'}}>
                            Restore order <strong>{restoreModal.id}</strong> for <strong>{restoreModal.recipientName}</strong>? Status will be set back to "New".
                        </p>
                        <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
                            <button onClick={()=>setRestoreModal(null)} style={{padding:'7px 16px',border:'0.5px solid #D6D3D1',borderRadius:'8px',background:'white',cursor:'pointer',fontSize:'13px'}}>Cancel</button>
                            <button onClick={handleRestore} style={{padding:'7px 16px',border:'none',borderRadius:'8px',background:'#059669',color:'white',cursor:'pointer',fontSize:'13px',fontWeight:500}}>Restore</button>
                        </div>
                    </div>
                </div>
            )}
            {permDeleteModal && isSuperAdmin && (
                <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <div style={{background:'white',borderRadius:'12px',padding:'1.5rem',width:'440px',maxWidth:'90vw',boxShadow:'0 8px 32px rgba(0,0,0,0.25)',border:'2px solid #DC2626'}}>
                        <h3 style={{fontSize:'1.1rem',fontWeight:600,marginBottom:'0.75rem',color:'#DC2626'}}>⚠️ Permanently Delete Order</h3>
                        <p style={{fontSize:'13px',color:'#57534E',marginBottom:'0.5rem'}}>
                            This will <strong>permanently and irreversibly</strong> remove order <strong>{permDeleteModal.id}</strong> from the system. This action cannot be undone.
                        </p>
                        <p style={{fontSize:'12px',color:'#78716C',marginBottom:'1rem'}}>A full snapshot will be preserved in the audit log.</p>
                        <label style={{fontSize:'13px',fontWeight:500,display:'block',marginBottom:'6px'}}>Reason <span style={{color:'#DC2626'}}>*</span></label>
                        <input type="text" placeholder="e.g. Test data cleanup before production launch..."
                            value={permDeleteReason} onChange={e=>setPermDeleteReason(e.target.value)}
                            style={{width:'100%',padding:'8px 10px',border:'1px solid #DC2626',borderRadius:'8px',fontSize:'13px',marginBottom:'1rem'}} />
                        <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
                            <button onClick={()=>setPermDeleteModal(null)} style={{padding:'7px 16px',border:'0.5px solid #D6D3D1',borderRadius:'8px',background:'white',cursor:'pointer',fontSize:'13px'}}>Cancel</button>
                            <button onClick={handlePermDelete} disabled={!permDeleteReason.trim()}
                                style={{padding:'7px 16px',border:'none',borderRadius:'8px',background:permDeleteReason.trim()?'#DC2626':'#FCA5A5',color:'white',cursor:'pointer',fontSize:'13px',fontWeight:600}}>
                                Permanently Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── AUDIT LOG OPENER ────────────────────────────────────────────
// Self-contained component that fires the audit log fetch on mount
// and opens the result in a new tab, then switches back to orders.
