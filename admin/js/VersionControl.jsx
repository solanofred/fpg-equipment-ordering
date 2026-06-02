// ─── VersionControl

function VersionControl({ session, azureUrl }) {
    const [versions, setVersions] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [status, setStatus] = React.useState(null);
    const [selectedVersions, setSelectedVersions] = React.useState({});
    const [showVCExportMenu, setShowVCExportMenu] = React.useState(false);
    const exportVCCSV = function(rows, filename) {
        const headers = ['Date','Time','Admin','Action','File','Detail','Commit'];
        const data = rows.map(function(v) {
            const dt = new Date(v.timestamp);
            const detail = v.detail || {};
            return [
                dt.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),
                dt.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),
                (v.adminEmail||'').split('@')[0],
                v.action||'',
                detail.file||'',
                detail.productsCount ? detail.productsCount+' products' : '',
                detail.commitSha||''
            ];
        });
        const csv = [headers,...data].map(function(r){return r.map(function(v){var s=String(v==null?'':v);return s.includes(',')||s.includes('"')?'"'+s.replace(/"/g,'""')+'"':s;}).join(',');}).join('\n');
        const blob = new Blob([csv],{type:'text/csv'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href=url; a.download=filename||'versions.csv'; a.click();
        URL.revokeObjectURL(url);
    };
    const toggleSelectVersion = function(idx) {
        setSelectedVersions(function(prev){var n=Object.assign({},prev);n[idx]=!n[idx];return n;});
    };

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

                <div style={{position:'relative'}}>
                    <button onClick={function(){setShowVCExportMenu(function(p){return !p;});}} style={{padding:'7px 12px',border:'1.5px solid #0369A1',borderRadius:'8px',fontSize:'12px',fontWeight:500,cursor:'pointer',background:'white',color:'#0369A1'}}>
                        ⬇ Export <span style={{fontSize:'10px'}}>{showVCExportMenu?'▲':'▼'}</span>
                    </button>
                    {showVCExportMenu && (function(){
                        const sel=versions.filter(function(v,i){return selectedVersions[i];});
                        return (
                        <div style={{position:'absolute',top:'calc(100% + 4px)',right:0,background:'white',border:'1.5px solid #0369A1',borderRadius:'8px',zIndex:50,minWidth:'210px',boxShadow:'0 4px 16px rgba(0,0,0,0.12)',overflow:'hidden'}}>
                            <div style={{padding:'6px 8px',background:'#F0F4F8',borderBottom:'0.5px solid #C7D9F0',fontSize:'10px',fontWeight:600,color:'#475569',textTransform:'uppercase',letterSpacing:'0.06em'}}>Choose what to export</div>
                            <button onClick={function(){exportVCCSV(versions.slice(0,25),'versions-first25.csv');setShowVCExportMenu(false);}} style={{width:'100%',padding:'9px 14px',border:'none',borderBottom:'0.5px solid #E7E5E4',background:'white',textAlign:'left',cursor:'pointer',fontSize:'13px'}}>
                                <div style={{fontWeight:600}}>First 25 visible</div><div style={{fontSize:'11px',color:'#78716C'}}>{Math.min(25,versions.length)} entries</div>
                            </button>
                            <button onClick={function(){exportVCCSV(versions,'versions-all.csv');setShowVCExportMenu(false);}} style={{width:'100%',padding:'9px 14px',border:'none',borderBottom:'0.5px solid #E7E5E4',background:'white',textAlign:'left',cursor:'pointer',fontSize:'13px'}}>
                                <div style={{fontWeight:600}}>All versions</div><div style={{fontSize:'11px',color:'#78716C'}}>{versions.length} entries</div>
                            </button>
                            <button onClick={function(){if(!sel.length){alert('Select entries using checkboxes first.');return;}exportVCCSV(sel,'versions-selected.csv');setShowVCExportMenu(false);}} style={{width:'100%',padding:'9px 14px',border:'none',background:'white',textAlign:'left',cursor:'pointer',fontSize:'13px'}}>
                                <div style={{fontWeight:600}}>Selected only</div><div style={{fontSize:'11px',color:'#78716C'}}>{sel.length} selected</div>
                            </button>
                        </div>);
                    })()}
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
                                <th style={{padding:'10px 10px',width:'40px',textAlign:'center',color:'white'}}>
                                    <input type="checkbox" onChange={function(e){if(e.target.checked){const all={};versions.forEach(function(v,i){all[i]=true;});setSelectedVersions(all);}else setSelectedVersions({});}} checked={versions.length>0&&versions.every(function(v,i){return selectedVersions[i];})} style={{cursor:'pointer',accentColor:'white'}}/>
                                </th>
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
                                        <td style={{padding:'10px 10px',textAlign:'center'}} onClick={function(ev){ev.stopPropagation();}}>
                                            <input type="checkbox" checked={!!selectedVersions[i]} onChange={function(){toggleSelectVersion(i);}} style={{cursor:'pointer',accentColor:'#4C3BAF'}}/>
                                        </td>
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
