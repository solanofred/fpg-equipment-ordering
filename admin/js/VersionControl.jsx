// ─── VersionControl

function VersionControl({ session, azureUrl }) {
    const [versions, setVersions] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [status, setStatus] = React.useState(null);

    React.useEffect(() => {
        // Load version history from audit log entries with action portal.version
        fetch('./audit-log-' + new Date().getFullYear() + '.json?' + Date.now())
            .then(r => r.json())
            .then(data => {
                const versionEntries = (data || [])
                    .filter(e => e.action && e.action.startsWith('portal.'))
                    .sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
                setVersions(versionEntries);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    if (session.role !== 'superadmin') {
        return (
            <div style={{textAlign:'center',padding:'3rem',color:'#94A3B8'}}>
                <div style={{fontSize:'2rem',marginBottom:'12px'}}>🔒</div>
                <div style={{fontWeight:600,color:'#475569'}}>Superadmin access required</div>
                <div style={{fontSize:'13px',marginTop:'6px'}}>Version control is restricted to superadmins only.</div>
            </div>
        );
    }

    return (
        <div>
            <div style={{background:'#FEF9C3',border:'1.5px solid #FDE68A',borderRadius:'12px',padding:'14px 18px',marginBottom:'20px',display:'flex',alignItems:'flex-start',gap:'12px'}}>
                <span style={{fontSize:'20px',flexShrink:0}}>⚠️</span>
                <div>
                    <div style={{fontWeight:700,fontSize:'13px',color:'#854D0E',marginBottom:'4px'}}>Superadmin only — Version Control</div>
                    <div style={{fontSize:'12px',color:'#92400E',lineHeight:1.5}}>
                        This section logs every update to <strong>admin.html</strong> and <strong>index.html</strong>. 
                        All changes are recorded in the Audit Log automatically when products are published 
                        or when portal files are updated via the Azure Function.
                    </div>
                </div>
            </div>

            <div style={{background:'white',borderRadius:'12px',border:'0.5px solid #E2E8F0',overflow:'hidden'}}>
                <div style={{padding:'14px 18px',borderBottom:'0.5px solid #E2E8F0',background:'#F5F3FF',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                        <div style={{fontWeight:700,fontSize:'14px',color:'#1E3A5F'}}>🔖 Portal Version History</div>
                        <div style={{fontSize:'11px',color:'#64748B',marginTop:'2px'}}>admin.html · index.html · Recorded automatically</div>
                    </div>
                    <div style={{fontSize:'12px',color:'#4C3BAF',fontWeight:600,background:'#EDE9FE',padding:'4px 12px',borderRadius:'20px'}}>
                        {versions.length} change{versions.length !== 1 ? 's' : ''} logged
                    </div>
                </div>

                {loading ? (
                    <div style={{padding:'2rem',textAlign:'center',color:'#94A3B8'}}>Loading version history...</div>
                ) : versions.length === 0 ? (
                    <div style={{padding:'2rem',textAlign:'center',color:'#94A3B8'}}>
                        <div style={{fontSize:'1.5rem',marginBottom:'8px'}}>📋</div>
                        No portal changes recorded yet this year.<br/>
                        <span style={{fontSize:'12px'}}>Changes are logged automatically when you publish products or update portal files.</span>
                    </div>
                ) : (
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px'}}>
                        <thead>
                            <tr style={{background:'#D97706'}}>
                                <th style={{padding:'10px 14px',textAlign:'left',color:'white',fontWeight:700,fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.06em',width:'16%'}}>Date / Time</th>
                                <th style={{padding:'10px 14px',textAlign:'left',color:'white',fontWeight:700,fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.06em',width:'16%'}}>Admin</th>
                                <th style={{padding:'10px 14px',textAlign:'left',color:'white',fontWeight:700,fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.06em',width:'14%'}}>Action</th>
                                <th style={{padding:'10px 14px',textAlign:'left',color:'white',fontWeight:700,fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.06em',width:'14%'}}>File</th>
                                <th style={{padding:'10px 14px',textAlign:'left',color:'white',fontWeight:700,fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.06em'}}>Detail</th>
                                <th style={{padding:'10px 14px',textAlign:'left',color:'white',fontWeight:700,fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.06em',width:'10%'}}>Commit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {versions.map((v, i) => {
                                const dt = new Date(v.timestamp);
                                const detail = v.detail || {};
                                const actionLabel = {
                                    'portal.products_published': 'Products published',
                                    'portal.admin_updated': 'Admin portal updated',
                                    'portal.ordering_updated': 'Ordering portal updated',
                                }[v.action] || v.action;
                                const fileBadgeColor = v.action === 'portal.products_published' ? '#EEF2FF' : '#F0FDF4';
                                const fileBadgeText = v.action === 'portal.products_published' ? '#4C3BAF' : '#166534';
                                const fileName = detail.file || (v.action === 'portal.products_published' ? 'products.json' : 'portal file');
                                return (
                                    <tr key={i} style={{background: i % 2 === 0 ? 'white' : '#F5F3FF', borderBottom:'0.5px solid #F1F5F9'}}>
                                        <td style={{padding:'10px 14px',color:'#1E3A5F',fontWeight:600}}>
                                            {dt.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                                            <br/><span style={{fontSize:'10.5px',color:'#64748B',fontWeight:400}}>{dt.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                                        </td>
                                        <td style={{padding:'10px 14px',color:'#0F172A'}}>
                                            <div style={{fontWeight:500}}>{(v.adminEmail||'').split('@')[0]}</div>
                                            <div style={{fontSize:'10px',color:'#94A3B8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'140px'}}>{v.adminEmail}</div>
                                        </td>
                                        <td style={{padding:'10px 14px'}}>
                                            <span style={{background:'#EDE9FE',color:'#4C3BAF',padding:'2px 8px',borderRadius:'20px',fontWeight:600,fontSize:'11px'}}>{actionLabel}</span>
                                        </td>
                                        <td style={{padding:'10px 14px'}}>
                                            <span style={{background:fileBadgeColor,color:fileBadgeText,padding:'2px 8px',borderRadius:'20px',fontWeight:600,fontSize:'11px',fontFamily:'monospace'}}>{fileName}</span>
                                        </td>
                                        <td style={{padding:'10px 14px',color:'#475569',fontSize:'11px'}}>
                                            {detail.productsCount ? `${detail.productsCount} products` : ''}
                                            {detail.message || ''}
                                        </td>
                                        <td style={{padding:'10px 14px'}}>
                                            {detail.commitSha ? (
                                                <span style={{fontFamily:'monospace',fontSize:'11px',color:'#4C3BAF',background:'#EDE9FE',padding:'2px 6px',borderRadius:'4px'}}>
                                                    {detail.commitSha.slice(0,7)}
                                                </span>
                                            ) : <span style={{color:'#94A3B8'}}>—</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}


/* ── Column resizer ── */
