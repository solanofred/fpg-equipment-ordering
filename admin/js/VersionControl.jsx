// ─── VersionControl: reads commit history directly from GitHub API ────────────

function VersionControl({ session }) {
    const { useState, useEffect } = React;
    const REPO = 'solanofred/fpg-equipment-ordering';
    const API  = 'https://api.github.com/repos/' + REPO;

    const [commits, setCommits]           = useState([]);
    const [loading, setLoading]           = useState(true);
    const [error, setError]               = useState(null);
    const [expandedSha, setExpandedSha]   = useState(null);
    const [fileDetails, setFileDetails]   = useState({});
    const [loadingFiles, setLoadingFiles] = useState({});
    const [page, setPage]                 = useState(1);
    const [hasMore, setHasMore]           = useState(true);
    const [selectedCommits, setSelectedCommits] = useState({});
    const [showExportMenu, setShowExportMenu]   = useState(false);
    const PER_PAGE = 30;

    useEffect(function() {
        setLoading(true);
        fetch(API + '/commits?per_page=' + PER_PAGE + '&page=' + page)
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (!Array.isArray(data)) { setError('GitHub API error — rate limit may apply. Try again in a moment.'); setLoading(false); return; }
                setCommits(function(prev) { return page === 1 ? data : prev.concat(data); });
                setHasMore(data.length === PER_PAGE);
                setLoading(false);
            })
            .catch(function(e) { setError('Failed to load commit history: ' + e.message); setLoading(false); });
    }, [page]);

    function loadFiles(sha) {
        if (fileDetails[sha]) { setExpandedSha(expandedSha === sha ? null : sha); return; }
        setLoadingFiles(function(p) { var n = Object.assign({}, p); n[sha] = true; return n; });
        fetch(API + '/commits/' + sha)
            .then(function(r) { return r.json(); })
            .then(function(data) {
                setFileDetails(function(p) { var n = Object.assign({}, p); n[sha] = data.files || []; return n; });
                setLoadingFiles(function(p) { var n = Object.assign({}, p); n[sha] = false; return n; });
                setExpandedSha(sha);
            })
            .catch(function() {
                setLoadingFiles(function(p) { var n = Object.assign({}, p); n[sha] = false; return n; });
            });
    }

    function toggleSelect(sha) { setSelectedCommits(function(p) { var n = Object.assign({}, p); n[sha] = !n[sha]; return n; }); }
    function toggleSelectAll(e) {
        if (e.target.checked) { var all = {}; commits.forEach(function(c) { all[c.sha] = true; }); setSelectedCommits(all); }
        else setSelectedCommits({});
    }

    function exportCSV(rows, filename) {
        const headers = ['Date', 'Time', 'Commit', 'Author', 'Message', 'Files Changed'];
        const data = rows.map(function(c) {
            const dt = new Date(c.commit.author.date);
            return [
                dt.toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'}),
                dt.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
                c.sha.substring(0, 7),
                c.commit.author.name,
                c.commit.message.split('\n')[0],
                (fileDetails[c.sha] || []).map(function(f) { return f.filename; }).join('; ')
            ];
        });
        const csv = [headers, ...data].map(function(r) {
            return r.map(function(v) {
                var s = String(v == null ? '' : v);
                return s.includes(',') || s.includes('"') ? '"' + s.replace(/"/g, '""') + '"' : s;
            }).join(',');
        }).join('\n');
        const blob = new Blob([csv], {type:'text/csv'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    }

    function getFileColor(status) {
        if (status === 'added')    return {bg:'#DCFCE7', color:'#166534'};
        if (status === 'removed')  return {bg:'#FEE2E2', color:'#DC2626'};
        if (status === 'modified') return {bg:'#FEF3C7', color:'#92400E'};
        return {bg:'#F1F5F9', color:'#475569'};
    }

    function getFileIcon(filename) {
        if (filename.endsWith('.jsx')) return '⚛';
        if (filename.endsWith('.js'))  return '📜';
        if (filename.endsWith('.css')) return '🎨';
        if (filename.endsWith('.html'))return '📄';
        if (filename.endsWith('.json'))return '📦';
        return '📁';
    }

    function isAdminFile(filename) {
        return filename.startsWith('admin/') || filename === 'admin.html' || filename === 'index.html';
    }

    const selected = commits.filter(function(c) { return selectedCommits[c.sha]; });

    return (
        <div style={{padding:'0'}}>
            <div style={{background:'white', borderRadius:'12px', border:'0.5px solid #E2E8F0', overflow:'hidden'}}>

                {/* Header */}
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 18px', borderBottom:'0.5px solid #F1F5F9', background:'#FAFAFA'}}>
                    <div>
                        <span style={{fontSize:'15px', fontWeight:700, color:'#0F172A'}}>Commit History</span>
                        <span style={{fontSize:'12px', color:'#64748B', marginLeft:'8px'}}>
                            {loading ? 'Loading…' : commits.length + ' commits loaded · ' + REPO}
                        </span>
                    </div>
                    <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                        <a href={'https://github.com/' + REPO + '/commits/main'} target="_blank" rel="noreferrer"
                           style={{padding:'6px 12px', border:'1.5px solid #E2E8F0', borderRadius:'8px', fontSize:'12px', fontWeight:500, color:'#475569', background:'white', textDecoration:'none', display:'flex', alignItems:'center', gap:'4px'}}>
                            ↗ GitHub
                        </a>
                        <div style={{position:'relative'}}>
                            <button onClick={function(){setShowExportMenu(function(p){return !p;});}}
                                    style={{padding:'6px 12px', border:'1.5px solid #0369A1', borderRadius:'8px', fontSize:'12px', fontWeight:500, cursor:'pointer', background:'white', color:'#0369A1'}}>
                                ⬇ Export <span style={{fontSize:'10px'}}>{showExportMenu ? '▲' : '▼'}</span>
                            </button>
                            {showExportMenu && (
                                <div style={{position:'absolute', top:'calc(100% + 4px)', right:0, background:'white', border:'1.5px solid #0369A1', borderRadius:'8px', zIndex:50, minWidth:'200px', boxShadow:'0 4px 16px rgba(0,0,0,0.12)', overflow:'hidden'}}>
                                    <div style={{padding:'6px 8px', background:'#F0F4F8', borderBottom:'0.5px solid #C7D9F0', fontSize:'10px', fontWeight:600, color:'#475569', textTransform:'uppercase', letterSpacing:'0.06em'}}>Choose what to export</div>
                                    <button onClick={function(){exportCSV(commits.slice(0,25),'commits-first25.csv');setShowExportMenu(false);}} style={{width:'100%',padding:'9px 14px',border:'none',borderBottom:'0.5px solid #E7E5E4',background:'white',textAlign:'left',cursor:'pointer',fontSize:'13px'}}>
                                        <div style={{fontWeight:600}}>First 25 visible</div><div style={{fontSize:'11px',color:'#78716C'}}>{Math.min(25,commits.length)} commits</div>
                                    </button>
                                    <button onClick={function(){exportCSV(commits,'commits-all.csv');setShowExportMenu(false);}} style={{width:'100%',padding:'9px 14px',border:'none',borderBottom:'0.5px solid #E7E5E4',background:'white',textAlign:'left',cursor:'pointer',fontSize:'13px'}}>
                                        <div style={{fontWeight:600}}>All loaded</div><div style={{fontSize:'11px',color:'#78716C'}}>{commits.length} commits</div>
                                    </button>
                                    <button onClick={function(){if(!selected.length){alert('Select commits using checkboxes first.');return;}exportCSV(selected,'commits-selected.csv');setShowExportMenu(false);}} style={{width:'100%',padding:'9px 14px',border:'none',background:'white',textAlign:'left',cursor:'pointer',fontSize:'13px'}}>
                                        <div style={{fontWeight:600}}>Selected only</div><div style={{fontSize:'11px',color:'#78716C'}}>{selected.length} selected</div>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Selection banner */}
                {selected.length > 0 && (
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 18px',background:'#EFF6FF',borderBottom:'0.5px solid #BFDBFE'}}>
                        <span style={{fontSize:'12px',color:'#1E40AF',fontWeight:500}}>{selected.length} commit{selected.length!==1?'s':''} selected</span>
                        <button onClick={function(){exportCSV(selected,'commits-selected.csv');}} style={{padding:'4px 14px',background:'#D97706',color:'white',border:'none',borderRadius:'6px',fontSize:'11px',fontWeight:600,cursor:'pointer'}}>⬇ Export selected</button>
                    </div>
                )}

                {/* Table */}
                {error ? (
                    <div style={{padding:'3rem', textAlign:'center', color:'#DC2626', fontSize:'13px'}}>{error}</div>
                ) : (
                    <table id="tbl-versions" style={{width:'100%', borderCollapse:'collapse', fontSize:'13px', tableLayout:'fixed'}}>
                        <thead>
                            <tr style={{background:'#D97706'}}>
                                <th style={{padding:'10px 10px', width:'40px', textAlign:'center', color:'white'}}>
                                    <input type="checkbox" onChange={toggleSelectAll}
                                           checked={commits.length > 0 && commits.every(function(c){return selectedCommits[c.sha];})}
                                           style={{cursor:'pointer', accentColor:'white'}}/>
                                </th>
                                <th style={{padding:'10px 14px', textAlign:'left', color:'white', fontWeight:700, fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.07em', width:'14%'}}>Date / Time</th>
                                <th style={{padding:'10px 14px', textAlign:'left', color:'white', fontWeight:700, fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.07em', width:'10%'}}>Commit</th>
                                <th style={{padding:'10px 14px', textAlign:'left', color:'white', fontWeight:700, fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.07em', width:'13%'}}>Author</th>
                                <th style={{padding:'10px 14px', textAlign:'left', color:'white', fontWeight:700, fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.07em'}}>Message</th>
                                <th style={{padding:'10px 14px', textAlign:'left', color:'white', fontWeight:700, fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.07em', width:'10%'}}>Files</th>
                            </tr>
                        </thead>
                        <tbody>
                            {commits.map(function(commit, i) {
                                const dt = new Date(commit.commit.author.date);
                                const sha = commit.sha;
                                const isExpanded = expandedSha === sha;
                                const files = fileDetails[sha] || [];
                                const adminFiles = files.filter(function(f){return isAdminFile(f.filename);});
                                const msg = commit.commit.message.split('\n')[0];
                                const isAutoMsg = msg.startsWith('Audit:') || msg === 'Add files via upload';
                                return (
                                    <React.Fragment key={sha}>
                                        <tr onClick={function(){loadFiles(sha);}}
                                            style={{cursor:'pointer', background:isExpanded?'#EFF6FF':i%2===0?'white':'#F9FAFB', borderBottom:'0.5px solid #F1F5F9'}}>
                                            <td style={{padding:'10px 10px', textAlign:'center'}} onClick={function(e){e.stopPropagation();}}>
                                                <input type="checkbox" checked={!!selectedCommits[sha]} onChange={function(){toggleSelect(sha);}} style={{cursor:'pointer', accentColor:'#4C3BAF'}}/>
                                            </td>
                                            <td style={{padding:'10px 14px', verticalAlign:'middle'}}>
                                                <div style={{fontWeight:700, fontSize:'12px', color:'#1E293B'}}>{dt.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>
                                                <div style={{fontSize:'11px', color:'#57534E'}}>{dt.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
                                            </td>
                                            <td style={{padding:'10px 14px', verticalAlign:'middle'}}>
                                                <span style={{fontFamily:'monospace', fontSize:'12px', color:'#4C3BAF', fontWeight:600, background:'#EDE9FE', padding:'2px 7px', borderRadius:'5px'}}>{sha.substring(0,7)}</span>
                                            </td>
                                            <td style={{padding:'10px 14px', verticalAlign:'middle', fontSize:'12px', fontWeight:600, color:'#1E293B', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                                {commit.commit.author.name}
                                            </td>
                                            <td style={{padding:'10px 14px', verticalAlign:'middle'}}>
                                                <span style={{fontSize:'12px', color: isAutoMsg ? '#94A3B8' : '#0F172A', fontWeight: isAutoMsg ? 400 : 600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'block'}}>{msg}</span>
                                                {adminFiles.length > 0 && (
                                                    <div style={{marginTop:'3px', display:'flex', gap:'4px', flexWrap:'wrap'}}>
                                                        {adminFiles.slice(0,4).map(function(f){
                                                            const col = getFileColor(f.status);
                                                            return <span key={f.filename} style={{fontSize:'10px',fontWeight:600,padding:'1px 6px',borderRadius:'3px',background:col.bg,color:col.color}}>{getFileIcon(f.filename)} {f.filename.split('/').pop()}</span>;
                                                        })}
                                                        {adminFiles.length > 4 && <span style={{fontSize:'10px',color:'#94A3B8'}}>+{adminFiles.length-4} more</span>}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{padding:'10px 14px', verticalAlign:'middle', textAlign:'center'}}>
                                                {loadingFiles[sha] ? (
                                                    <span style={{fontSize:'11px',color:'#94A3B8'}}>…</span>
                                                ) : files.length > 0 ? (
                                                    <span style={{fontSize:'12px',fontWeight:700,color:'#4C3BAF'}}>{files.length} ▾</span>
                                                ) : (
                                                    <span style={{fontSize:'11px',color:'#94A3B8'}}>click</span>
                                                )}
                                            </td>
                                        </tr>
                                        {isExpanded && files.length > 0 && (
                                            <tr style={{background:'#F8FAFF'}}>
                                                <td></td>
                                                <td colSpan={5} style={{padding:'10px 14px 14px'}}>
                                                    <div style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'#94A3B8',marginBottom:'8px'}}>{files.length} file{files.length!==1?'s':''} changed</div>
                                                    <div style={{display:'flex', flexWrap:'wrap', gap:'6px'}}>
                                                        {files.map(function(f){
                                                            const col = getFileColor(f.status);
                                                            return (
                                                                <div key={f.filename} style={{display:'flex',alignItems:'center',gap:'5px',padding:'4px 10px',borderRadius:'6px',background:col.bg,border:'0.5px solid '+col.color+'44'}}>
                                                                    <span style={{fontSize:'12px'}}>{getFileIcon(f.filename)}</span>
                                                                    <span style={{fontSize:'11.5px',fontWeight:600,color:col.color}}>{f.filename}</span>
                                                                    <span style={{fontSize:'10px',color:col.color,opacity:0.7}}>({f.status})</span>
                                                                    {f.additions !== undefined && (
                                                                        <span style={{fontSize:'10px',marginLeft:'4px'}}>
                                                                            <span style={{color:'#166534'}}>+{f.additions}</span>
                                                                            {' '}
                                                                            <span style={{color:'#DC2626'}}>-{f.deletions}</span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                )}

                {/* Load more */}
                {!loading && !error && hasMore && (
                    <div style={{padding:'14px', textAlign:'center', borderTop:'0.5px solid #F1F5F9'}}>
                        <button onClick={function(){setPage(function(p){return p+1;});}}
                                style={{padding:'8px 24px',border:'1.5px solid #0369A1',borderRadius:'8px',fontSize:'13px',fontWeight:500,cursor:'pointer',background:'white',color:'#0369A1'}}>
                            Load more commits
                        </button>
                    </div>
                )}

                {loading && (
                    <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'3rem',gap:'12px',color:'#64748B'}}>
                        <div style={{width:'20px',height:'20px',border:'2px solid #E2E8F0',borderTopColor:'#16A34A',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}></div>
                        Loading commit history…
                    </div>
                )}

            </div>
        </div>
    );
}
