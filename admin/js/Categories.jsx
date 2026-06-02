// ─── Categories: CategoryManagement

function CategoryManagement({ session, azureUrl, categories, products, onCategoryAdded, onCategoryUpdated, onCategoryRemoved }) {
    const [newCatName, setNewCatName] = React.useState('');
    const [newCatImageUrl, setNewCatImageUrl] = React.useState('');
    const [saving, setSaving] = React.useState(false);
    const [status, setStatus] = React.useState(null);
    const [editingSlug, setEditingSlug] = React.useState(null);
    const [editLabel, setEditLabel] = React.useState('');
    const [editImageUrl, setEditImageUrl] = React.useState('');
    const [showAddModal, setShowAddModal] = React.useState(false);
    const [selectedCats, setSelectedCats] = React.useState({});
    const [showCatExportMenu, setShowCatExportMenu] = React.useState(false);
    const getProductCount = function(slug) {
        if (slug === 'all') return (products || []).length;
        if (slug === 'recommended') return (products || []).filter(function(p) { return p.recommended; }).length;
        const exportCatsCSV = function(rows, filename) {
        const headers = ['Category Name','Slug','Products','Status','Image URL'];
        const data = rows.map(function(c) {
            var count = typeof getProductCount === 'function' ? getProductCount(c.slug) : 0;
            return [c.label||'', c.slug||'', count, count>0?'In use':'Empty', c.imageUrl||''];
        });
        const csv = [headers,...data].map(function(r){return r.map(function(v){var s=String(v==null?'':v);return s.includes(',')||s.includes('"')?'"'+s.replace(/"/g,'""')+'"':s;}).join(',');}).join('\n');
        const blob = new Blob([csv],{type:'text/csv'});const url = URL.createObjectURL(blob);const a = document.createElement('a');a.href=url;a.download=filename||'categories.csv';a.click();URL.revokeObjectURL(url);
    };
    const toggleSelectCat = function(slug) { setSelectedCats(function(prev){var n=Object.assign({},prev);n[slug]=!n[slug];return n;}); };
    return (products || []).filter(function(p) { return p.category === slug; }).length;
    };

    const handleAdd = async function() {
        if (!newCatName.trim()) return;
        const slug = newCatName.trim().toLowerCase().split(' ').join('_').replace(/[^a-z0-9_]/g, '');
        const label = newCatName.trim();
        const imageUrl = newCatImageUrl.trim();
        setSaving(true);
        setStatus(null);
        // Update UI instantly
        onCategoryAdded(slug, label);
        setNewCatName('');
        setNewCatImageUrl('');
        setStatus({ type: 'success', text: label + ' added successfully!' });
        setSaving(false);
        // Sync to GitHub in background
        try {
            const res = await fetch(azureUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-email': session.email },
                body: JSON.stringify({ action: 'add-category', slug: slug, label: label, imageUrl: imageUrl })
            });
            const text = await res.text();
            if (!text) throw new Error('Empty response');
            const data = JSON.parse(text);
            if (!res.ok) {
                onCategoryRemoved(slug); // revert
                setStatus({ type: 'error', text: data.message || 'Failed to save' });
            }
        } catch(e) {
            onCategoryRemoved(slug); // revert
            setStatus({ type: 'error', text: e.message });
        }
    };

    const handleRemove = async function(slug, label) {
        if (!confirm('Remove category "' + label + '"? This cannot be undone.')) return;
        setSaving(true);
        setStatus(null);
        // Update UI instantly
        onCategoryRemoved(slug);
        setStatus({ type: 'success', text: label + ' removed.' });
        setSaving(false);
        // Sync to GitHub in background
        try {
            const res = await fetch(azureUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-email': session.email },
                body: JSON.stringify({ action: 'remove-category', slug: slug })
            });
            const text = await res.text();
            if (!text) throw new Error('Empty response');
            const data = JSON.parse(text);
            if (!res.ok) {
                onCategoryUpdated(slug, label); // revert UI only
                setStatus({ type: 'error', text: data.message || 'Failed to remove' });
            }
        } catch(e) {
            onCategoryUpdated(slug, label); // revert UI only
            setStatus({ type: 'error', text: e.message });
        }
    };

    const handleStartEdit = function(cat) {
        setEditingSlug(cat.slug);
        setEditLabel(cat.label);
        setEditImageUrl(cat.imageUrl || '');
        setStatus(null);
    };

    const handleCancelEdit = function() {
        setEditingSlug(null);
        setEditLabel('');
        setEditImageUrl('');
    };

    const handleSaveEdit = async function(slug) {
        if (!editLabel.trim()) return;
        setSaving(true);
        setStatus(null);
        const newLabel = editLabel.trim();
        const newImageUrl = editImageUrl.trim();
        const oldLabel = (categories||[]).find(c => c.slug === slug)?.label || slug;
        const labelChanged = newLabel !== oldLabel;
        const imageChanged = newImageUrl !== ((categories||[]).find(c => c.slug === slug)?.imageUrl || '');
        let successText = '';
        if (labelChanged && imageChanged) successText = 'Category updated — name and image saved.';
        else if (labelChanged) successText = 'Category renamed to "' + newLabel + '".';
        else if (imageChanged) successText = 'Image updated for "' + newLabel + '".';
        else successText = '"' + newLabel + '" saved.';
        // Update UI instantly — use onCategoryUpdated (UI only, no API call)
        onCategoryUpdated(slug, newLabel);
        setStatus({ type: 'success', text: successText });
        setEditingSlug(null);
        setEditLabel('');
        setEditImageUrl('');
        setSaving(false);
        // Sync to GitHub in background
        try {
            const res = await fetch(azureUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-email': session.email },
                body: JSON.stringify({ action: 'rename-category', slug: slug, newLabel: newLabel, imageUrl: newImageUrl })
            });
            const text = await res.text();
            if (!text) throw new Error('Empty response');
            const data = JSON.parse(text);
            if (!res.ok) {
                onCategoryUpdated(slug, oldLabel); // revert UI only
                setStatus({ type: 'error', text: data.message || 'Failed to rename' });
            }
        } catch(e) {
            onCategoryUpdated(slug, oldLabel); // revert UI only
            setStatus({ type: 'error', text: e.message });
        }
    };

    return (
        <div>
            {showAddModal && (
                <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.45)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={function(e){if(e.target===e.currentTarget){setShowAddModal(false);setNewCatName("");}}}>
                    <div style={{background:'white',borderRadius:'12px',padding:'1.5rem',width:'420px',maxWidth:'90vw',boxShadow:'0 8px 32px rgba(0,0,0,0.18)'}}>
                        <h3 style={{fontSize:'1.1rem',fontWeight:600,margin:'0 0 1rem'}}>New category</h3>
                        <input
                            type="text"
                            placeholder="e.g. Headsets"
                            value={newCatName}
                            onChange={function(e){setNewCatName(e.target.value);}}
                            onKeyDown={function(e){if(e.key==='Enter') handleAdd();if(e.key==='Escape'){setShowAddModal(false);setNewCatName('');setNewCatImageUrl('');}}}
                            autoFocus
                            style={{width:'100%',padding:'0.75rem 1rem',border:'1px solid #d1d5db',borderRadius:'8px',fontSize:'0.95rem',outline:'none',boxSizing:'border-box',marginBottom:'0.75rem'}}
                        />
                        <input
                            type="text"
                            placeholder="Image URL (optional) — https://..."
                            value={newCatImageUrl}
                            onChange={function(e){setNewCatImageUrl(e.target.value);}}
                            style={{width:'100%',padding:'0.75rem 1rem',border:'1px solid #d1d5db',borderRadius:'8px',fontSize:'0.95rem',outline:'none',boxSizing:'border-box',marginBottom:'1rem'}}
                        />
                        {newCatImageUrl.trim() && (
                            <div style={{marginBottom:'1rem',display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.5rem',background:'#f9fafb',borderRadius:'8px'}}>
                                <img src={newCatImageUrl.trim()} alt="preview" style={{width:'48px',height:'48px',objectFit:'cover',borderRadius:'8px',border:'1px solid #e5e7eb'}} onError={function(e){e.target.style.display='none';}} />
                                <span style={{fontSize:'0.8rem',color:'#6b7280'}}>Image preview</span>
                            </div>
                        )}
                        {status && showAddModal && (
                            <div style={{marginBottom:'1rem',padding:'0.75rem 1rem',borderRadius:'8px',fontSize:'0.875rem',background:status.type==='success'?'#D1FAE5':'#FEE2E2',color:status.type==='success'?'#065F46':'#991B1B'}}>
                                {status.type === 'success' ? '✅' : '❌'} {status.text}
                            </div>
                        )}
                        <div style={{display:'flex',gap:'0.75rem',justifyContent:'flex-end'}}>
                            <button onClick={function(){setShowAddModal(false);setNewCatName('');setNewCatImageUrl('');setStatus(null);}} style={{padding:'0.6rem 1.25rem',borderRadius:'8px',border:'1px solid #d1d5db',background:'white',fontSize:'0.95rem',cursor:'pointer'}}>Cancel</button>
                            <button onClick={function(){handleAdd();setTimeout(function(){setShowAddModal(false);},300);}} disabled={saving || !newCatName.trim()} className="btn btn-primary" style={{whiteSpace:'nowrap'}}>
                                {saving ? 'Saving...' : 'Add category'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div>
                {status && !showAddModal && (
                    <div style={{padding:'10px 14px',borderRadius:'8px',fontSize:'13px',marginBottom:'14px',background:status.type==='success'?'#DCFCE7':'#FEE2E2',color:status.type==='success'?'#166534':'#991B1B',border:status.type==='success'?'1px solid #86EFAC':'1px solid #FECACA'}}>
                        {status.type === 'success' ? '✅' : '❌'} {status.text}
                    </div>
                )}

                <div style={{background:'white',borderRadius:'12px',border:'0.5px solid #E2E8F0',overflow:'hidden',maxWidth:'1200px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 16px',borderBottom:'0.5px solid #F1F5F9'}}>
                        <div>
                            <span style={{fontSize:'15px',fontWeight:700,color:'#0F172A'}}>Categories</span>
                            <span style={{fontSize:'13px',fontWeight:400,color:'#64748B',marginLeft:'8px'}}>{(categories||[]).length} total · {(categories||[]).filter(function(c){return getProductCount(c.slug)===0;}).length} empty</span>
                        </div>
                        <button onClick={function(){setShowAddModal(true);setStatus(null);}} style={{padding:'7px 16px',background:'linear-gradient(135deg,#15803D,#16A34A)',color:'white',border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>
                            + New category
                        </button>
                        <div style={{position:'relative'}}>
                            <button onClick={function(){setShowCatExportMenu(function(p){return !p;});}} style={{padding:'7px 12px',border:'1.5px solid #0369A1',borderRadius:'8px',fontSize:'12px',fontWeight:500,cursor:'pointer',background:'white',color:'#0369A1'}}>
                                ⬇ Export <span style={{fontSize:'10px'}}>{showCatExportMenu?'▲':'▼'}</span>
                            </button>
                            {showCatExportMenu && (function(){
                                const sorted=(categories||[]).slice().sort(function(a,b){return a.label.localeCompare(b.label);});
                                const sel=sorted.filter(function(c){return selectedCats[c.slug];});
                                return (
                                <div style={{position:'absolute',top:'calc(100% + 4px)',right:0,background:'white',border:'1.5px solid #0369A1',borderRadius:'8px',zIndex:50,minWidth:'210px',boxShadow:'0 4px 16px rgba(0,0,0,0.12)',overflow:'hidden'}}>
                                    <div style={{padding:'6px 8px',background:'#F0F4F8',borderBottom:'0.5px solid #C7D9F0',fontSize:'10px',fontWeight:600,color:'#475569',textTransform:'uppercase',letterSpacing:'0.06em'}}>Choose what to export</div>
                                    <button onClick={function(){exportCatsCSV(sorted.slice(0,25),'categories-first25.csv');setShowCatExportMenu(false);}} style={{width:'100%',padding:'9px 14px',border:'none',borderBottom:'0.5px solid #E7E5E4',background:'white',textAlign:'left',cursor:'pointer',fontSize:'13px'}}>
                                        <div style={{fontWeight:600}}>First 25 visible</div><div style={{fontSize:'11px',color:'#78716C'}}>{Math.min(25,sorted.length)} categories</div>
                                    </button>
                                    <button onClick={function(){exportCatsCSV(sorted,'categories-all.csv');setShowCatExportMenu(false);}} style={{width:'100%',padding:'9px 14px',border:'none',borderBottom:'0.5px solid #E7E5E4',background:'white',textAlign:'left',cursor:'pointer',fontSize:'13px'}}>
                                        <div style={{fontWeight:600}}>All categories</div><div style={{fontSize:'11px',color:'#78716C'}}>{sorted.length} categories</div>
                                    </button>
                                    <button onClick={function(){if(!sel.length){alert('Select categories using checkboxes first.');return;}exportCatsCSV(sel,'categories-selected.csv');setShowCatExportMenu(false);}} style={{width:'100%',padding:'9px 14px',border:'none',background:'white',textAlign:'left',cursor:'pointer',fontSize:'13px'}}>
                                        <div style={{fontWeight:600}}>Selected only</div><div style={{fontSize:'11px',color:'#78716C'}}>{sel.length} selected</div>
                                    </button>
                                </div>);
                            })()}
                        </div>
                    </div>
                    {Object.values(selectedCats).some(Boolean) && (
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 14px',background:'#EFF6FF',borderBottom:'0.5px solid #BFDBFE'}}>
                            <span style={{fontSize:'12px',color:'#1E40AF',fontWeight:500}}>{Object.values(selectedCats).filter(Boolean).length} categor{Object.values(selectedCats).filter(Boolean).length!==1?'ies':'y'} selected</span>
                            <button onClick={function(){const s=(categories||[]).slice().sort(function(a,b){return a.label.localeCompare(b.label);});exportCatsCSV(s.filter(function(c){return selectedCats[c.slug];}),'categories-selected.csv');}} style={{padding:'4px 14px',background:'#D97706',color:'white',border:'none',borderRadius:'6px',fontSize:'11px',fontWeight:600,cursor:'pointer'}}>⬇ Export selected</button>
                        </div>
                    )}
                    <table id="tbl-categories" className="resizable-table" style={{tableLayout:'fixed',width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
                        <thead>
                            <tr style={{background:'#D97706'}}>
                                <th style={{padding:'11px 10px',width:'40px',textAlign:'center',color:'white'}}>
                                    {(function(){const s=(categories||[]).slice().sort(function(a,b){return a.label.localeCompare(b.label);});return<input type="checkbox" onChange={function(e){if(e.target.checked){const all={};s.forEach(function(c){all[c.slug]=true;});setSelectedCats(all);}else setSelectedCats({});}} checked={s.length>0&&s.every(function(c){return selectedCats[c.slug];})} style={{cursor:'pointer',accentColor:'white'}}/>;})()}
                                </th>
                                <th style={{padding:'11px 16px',textAlign:'left',color:'white',fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',width:'42%'}}>Category</th>
                                <th style={{padding:'11px 16px',textAlign:'left',color:'white',fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',width:'14%'}}>Products</th>
                                <th style={{padding:'11px 16px',textAlign:'left',color:'white',fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',width:'14%'}}>Status</th>
                                <th style={{padding:'11px 16px',textAlign:'right',color:'white',fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em'}}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(categories || []).slice().sort((a,b) => a.label.localeCompare(b.label)).map(function(cat, i) {
                                const count = getProductCount(cat.slug);
                                const isEmpty = count === 0;
                                const isEditing = editingSlug === cat.slug;
                                return (
                                    <tr key={i} style={{background:i%2===0?'white':'#F9FAFB',borderBottom:'1px solid #F1F5F9'}}>
                                        <td style={{padding:'11px 10px',textAlign:'center'}} onClick={function(e){e.stopPropagation();}}>
                                            <input type="checkbox" checked={!!selectedCats[cat.slug]} onChange={function(){toggleSelectCat(cat.slug);}} style={{cursor:'pointer',accentColor:'#4C3BAF'}}/>
                                        </td>
                                        <td style={{padding:'11px 16px'}}>
                                            {isEditing ? (
                                                <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                                                    <input type="text" value={editLabel} onChange={function(e){setEditLabel(e.target.value);}} onKeyDown={function(e){if(e.key==='Enter') handleSaveEdit(cat.slug); if(e.key==='Escape') handleCancelEdit();}} autoFocus placeholder="Category name" style={{padding:'7px 10px',border:'2px solid #4C3BAF',borderRadius:'7px',fontSize:'13px',outline:'none',width:'280px'}} />
                                                    <input type="text" value={editImageUrl} onChange={function(e){setEditImageUrl(e.target.value);}} placeholder="Image URL (optional)" style={{padding:'7px 10px',border:'1.5px solid #E2E8F0',borderRadius:'7px',fontSize:'12px',outline:'none',width:'280px'}} />
                                                </div>
                                            ) : (
                                                <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                                                    <div style={{width:'44px',height:'44px',borderRadius:'8px',overflow:'hidden',flexShrink:0,background:'#F5F3FF',display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid #EDE9FE'}}>
                                                        {cat.imageUrl
                                                            ? <img src={cat.imageUrl} alt={cat.label} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={function(e){e.target.style.display='none';e.target.parentNode.style.display='flex';e.target.parentNode.innerHTML='<i className="ti ti-tag" style="font-size:20px;color:#6366F1"></i>';}} />
                                                            : <i className="ti ti-tag" style={{fontSize:'20px',color:'#6366F1'}}></i>}
                                                    </div>
                                                    <div style={{fontWeight:600,color:'#0F172A',fontSize:'13px'}}>{cat.label}</div>
                                                </div>
                                            )}
                                        </td>
                                        <td style={{padding:'11px 16px',color:'#475569',fontSize:'12.5px'}}>{count} product{count!==1?'s':''}</td>
                                        <td style={{padding:'11px 16px'}}>
                                            {!isEmpty && <span style={{background:'#EDE9FE',color:'#4C3BAF',padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:700}}>In use</span>}
                                        </td>
                                        <td style={{padding:'11px 16px',textAlign:'right'}}>
                                            {isEditing ? (
                                                <div style={{display:'flex',gap:'6px',justifyContent:'flex-end'}}>
                                                    <button onClick={function(){handleSaveEdit(cat.slug);}} disabled={saving||!editLabel.trim()} style={{padding:'5px 14px',background:'#4C3BAF',border:'none',color:'white',borderRadius:'7px',fontSize:'11.5px',fontWeight:700,cursor:'pointer'}}>{saving?'Saving...':'Save'}</button>
                                                    <button onClick={handleCancelEdit} disabled={saving} style={{padding:'5px 14px',border:'1.5px solid #E2E8F0',borderRadius:'7px',fontSize:'11.5px',background:'white',color:'#64748B',cursor:'pointer'}}>Cancel</button>
                                                </div>
                                            ) : (
                                                <div style={{display:'flex',gap:'6px',justifyContent:'flex-end'}}>
                                                    <button onClick={function(){handleStartEdit(cat);}} disabled={saving} style={{padding:'5px 14px',border:'1.5px solid #E2E8F0',borderRadius:'7px',fontSize:'11.5px',fontWeight:600,background:'white',color:'#1E3A5F',cursor:'pointer'}}>Edit</button>
                                                    <button onClick={function(){handleRemove(cat.slug,cat.label);}} disabled={saving} style={{padding:'5px 14px',border:'1.5px solid #FCA5A5',borderRadius:'7px',fontSize:'11.5px',fontWeight:600,background:'white',color:'#DC2626',cursor:'pointer'}}>Remove</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                                </div>
        </div>
    );
}

// ─── ORDERS DASHBOARD ────────────────────────────────────────────
