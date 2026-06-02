// ─── Products: ReviewChangesModal, ProductModal

function ReviewChangesModal({ drafts, products, onClose }) {
    const draftsList = Object.values(drafts);
    
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
                <div className="modal-header">
                    <h2>Review Unsaved Changes ({draftsList.length})</h2>
                    <button className="btn-close" onClick={onClose}>×</button>
                </div>
                
                <div className="modal-content">
                    <p style={{ marginBottom: '1.5rem', color: 'var(--fpg-gray)' }}>
                        These changes are saved locally and will be included when you click "Publish All"
                    </p>
                    
                    {draftsList.map(draft => {
                        const original = products.find(p => p.id === draft.id);
                        const isDeleted = draft._deleted;
                        const isNew = !original;
                        
                        return (
                            <div key={draft.id} style={{ 
                                background: 'var(--bg-light)', 
                                padding: '1rem', 
                                borderRadius: '8px', 
                                marginBottom: '1rem',
                                border: isDeleted ? '2px solid var(--danger)' : '2px solid #F59E0B'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                    <div>
                                        <strong style={{ fontSize: '1.1rem' }}>
                                            {isDeleted ? '🗑️ ' : isNew ? '✨ ' : '✏️ '}
                                            {draft.title || (original && original.title)}
                                        </strong>
                                        <span style={{ 
                                            marginLeft: '0.75rem', 
                                            padding: '0.25rem 0.5rem', 
                                            background: isDeleted ? 'var(--danger)' : isNew ? 'var(--success)' : '#F59E0B',
                                            color: 'white',
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            fontWeight: '600'
                                        }}>
                                            {isDeleted ? 'DELETED' : isNew ? 'NEW' : 'EDITED'}
                                        </span>
                                    </div>
                                    <small style={{ color: 'var(--fpg-gray)' }}>
                                        {new Date(draft._draftTimestamp).toLocaleString()}
                                    </small>
                                </div>
                                
                                {!isDeleted && (
                                    <div style={{ fontSize: '0.9rem', color: 'var(--fpg-gray-dark)' }}>
                                        <div>Category: {draft.category}</div>
                                        <div>Price: ${(draft.price != null ? draft.price.toLocaleString() : '')}</div>
                                        <div>Items: {(draft.items ? draft.items.length : 0)}</div>
                                        {draft.recommended && <div style={{ color: 'var(--accent)' }}>⭐ Recommended</div>}
                                        {!draft.available && <div style={{ color: 'var(--danger)' }}>Inactive</div>}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                
                <div className="modal-footer">
                    <button type="button" className="btn-secondary" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

function ProductModal({ product, onSave, onClose, categories, onCategoryAdded, onCategoryRemoved, session, azureUrl }) {
    const [showNewCategory, setShowNewCategory] = React.useState(false);
    const [newCategoryInput, setNewCategoryInput] = React.useState('');
    const [savingCategory, setSavingCategory] = React.useState(false);
    const [categoryMessage, setCategoryMessage] = React.useState(null);

    const handleSaveNewCategory = async () => {
        const slug = newCategoryInput.trim().toLowerCase().split(' ').join('_').replace(/[^a-z0-9_]/g, '');
        if (!slug) return;
        setSavingCategory(true);
        setCategoryMessage(null);
        try {
            await onCategoryAdded(slug, newCategoryInput.trim());
            setFormData({ ...formData, category: slug });
            setShowNewCategory(false);
            setNewCategoryInput('');
            setCategoryMessage({ type: 'success', text: 'Category added!' });
        } catch(e) {
            setCategoryMessage({ type: 'error', text: 'Could not save: ' + e.message });
        } finally { setSavingCategory(false); }
    };

    const handleRemoveCategory = async () => {
        if (!formData.category) return;
        setSavingCategory(true);
        setCategoryMessage(null);
        try {
            const res = await fetch(azureUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-email': session.email },
                body: JSON.stringify({ action: 'remove-category', slug: formData.category })
            });
            const text = await res.text();
            const data = JSON.parse(text);
            if (!res.ok) {
                setCategoryMessage({ type: 'error', text: data.message });
            } else {
                onCategoryRemoved(formData.category);
                setCategoryMessage({ type: 'success', text: 'Category removed!' });
            }
        } catch(e) {
            setCategoryMessage({ type: 'error', text: 'Error: ' + e.message });
        } finally { setSavingCategory(false); }
    };
    const [formData, setFormData] = useState({ ...product, imageUrl: product.imageUrl || '' });
    const [customMarkup, setCustomMarkup] = useState('');
    
    // Calculate items subtotal
    const itemsSubtotal = formData.items.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
    const totalPrice = parseFloat(formData.price) || 0;
    const isUnderpriced = totalPrice < itemsSubtotal;
    const hasMarkup = totalPrice > itemsSubtotal;
    
    const applyMarkup = (percentage) => {
        const markup = itemsSubtotal * (percentage / 100);
        const newTotal = itemsSubtotal + markup;
        setFormData({ ...formData, price: Math.round(newTotal * 100) / 100 });
    };
    
    const applyCustomMarkup = () => {
        const percentage = parseFloat(customMarkup);
        if (!isNaN(percentage) && percentage >= 0) {
            applyMarkup(percentage);
            setCustomMarkup('');
        }
    };
    
    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };
    
    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { name: '', price: 0 }]
        });
    };
    
    const removeItem = (index) => {
        setFormData({
            ...formData,
            items: formData.items.filter((_, i) => i !== index)
        });
    };
    
    const updateItem = (index, field, value) => {
        const items = [...formData.items];
        items[index][field] = field === 'price' ? parseFloat(value) || 0 : value;
        setFormData({ ...formData, items });
    };
    
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{product.id ? 'Edit Product' : 'Add New Product'}</h2>
                    <button className="btn-close" onClick={onClose}>×</button>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div className="modal-content">
                        <div className="form-group">
                            <label className="form-label">Product Title *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label">Primary Category *</label>
                            <select
                                className="form-input"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                required
                            >
                                {(categories || []).slice().sort((a, b) => a.label.localeCompare(b.label)).map(cat => (
                                    <option key={cat.slug} value={cat.slug}>{cat.label}</option>
                                ))}
                            </select>
                            <div style={{fontSize:'0.8rem',color:'var(--fpg-gray)',marginTop:'0.3rem'}}>Manage categories in the Categories tab</div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Also Appears In</label>
                            <div style={{display:'flex',flexWrap:'wrap',gap:'0.5rem',padding:'0.75rem',border:'1px solid #d1d5db',borderRadius:'8px',background:'#f9fafb'}}>
                                {(categories || []).slice().sort((a, b) => a.label.localeCompare(b.label))
                                    .filter(cat => cat.slug !== formData.category)
                                    .map(cat => {
                                        const checked = Array.isArray(formData.categories) && formData.categories.includes(cat.slug);
                                        return (
                                            <label key={cat.slug} style={{display:'flex',alignItems:'center',gap:'0.4rem',cursor:'pointer',padding:'0.35rem 0.75rem',borderRadius:'20px',background:checked?'#E6F1FB':'white',border:checked?'1.5px solid #4C3BAF':'1.5px solid #d1d5db',fontSize:'0.875rem',fontWeight:checked?600:400,color:checked?'#0C447C':'#374151',transition:'all 0.15s'}}>
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    style={{display:'none'}}
                                                    onChange={(e) => {
                                                        const current = Array.isArray(formData.categories) ? formData.categories : [];
                                                        const updated = e.target.checked
                                                            ? [...current, cat.slug]
                                                            : current.filter(s => s !== cat.slug);
                                                        setFormData({ ...formData, categories: updated });
                                                    }}
                                                />
                                                {checked ? '✓ ' : ''}{cat.label}
                                            </label>
                                        );
                                    })
                                }
                            </div>
                            <div style={{fontSize:'0.8rem',color:'var(--fpg-gray)',marginTop:'0.3rem'}}>Select additional categories this product should appear in</div>
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label">Image URL (optional)</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="https://example.com/image.jpg"
                                value={formData.imageUrl || ''}
                                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                            />
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label">
                                <input
                                    type="checkbox"
                                    checked={formData.recommended}
                                    onChange={(e) => setFormData({ ...formData, recommended: e.target.checked })}
                                    style={{ marginRight: '0.5rem' }}
                                />
                                Mark as Recommended
                            </label>
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label">Items Included</label>
                            <div className="items-list">
                                {formData.items.map((item, index) => (
                                    <div key={index} className="item-row">
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Item name"
                                            value={item.name}
                                            onChange={(e) => updateItem(index, 'name', e.target.value)}
                                            required
                                        />
                                        <input
                                            type="number"
                                            className="form-input"
                                            placeholder="Price"
                                            value={item.price}
                                            onChange={(e) => updateItem(index, 'price', e.target.value)}
                                            min="0"
                                            step="0.01"
                                            required
                                            style={{ width: '150px' }}
                                        />
                                        <button
                                            type="button"
                                            className="btn-remove-item"
                                            onClick={() => removeItem(index)}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    className="btn-add-item"
                                    onClick={addItem}
                                >
                                    + Add Item
                                </button>
                                
                                {formData.items.length > 0 && (
                                    <div className="price-calculator">
                                        <div className="price-calc-row">
                                            <span style={{ color: 'var(--fpg-gray)' }}>Items Subtotal:</span>
                                            <span style={{ fontWeight: '600' }}>${itemsSubtotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                        </div>
                                        
                                        <div className="markup-section">
                                            <label className="markup-label">Apply Markup:</label>
                                            <div className="markup-buttons">
                                                <button
                                                    type="button"
                                                    className="btn-markup"
                                                    onClick={() => applyMarkup(10)}
                                                >
                                                    +10%
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-markup"
                                                    onClick={() => applyMarkup(15)}
                                                >
                                                    +15%
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-markup"
                                                    onClick={() => applyMarkup(20)}
                                                >
                                                    +20%
                                                </button>
                                            </div>
                                            <div className="custom-markup">
                                                <span style={{ fontSize: '0.9rem', color: 'var(--fpg-gray)' }}>Custom:</span>
                                                <input
                                                    type="number"
                                                    className="custom-markup-input"
                                                    placeholder="0"
                                                    value={customMarkup}
                                                    onChange={(e) => setCustomMarkup(e.target.value)}
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            applyCustomMarkup();
                                                        }
                                                    }}
                                                    min="0"
                                                    step="0.1"
                                                />
                                                <span style={{ fontSize: '0.9rem' }}>%</span>
                                                <button
                                                    type="button"
                                                    className="btn-apply-custom"
                                                    onClick={applyCustomMarkup}
                                                >
                                                    Apply
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="price-calc-total">
                                            <span>Total Package Price:</span>
                                            <span style={{ color: 'var(--primary)' }}>${totalPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                        </div>
                                        
                                        {isUnderpriced && (
                                            <div className="price-warning">
                                                <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                                                <div>
                                                    <strong>Warning: Total price is LESS than items subtotal!</strong>
                                                    <br />
                                                    You're underpricing by ${(itemsSubtotal - totalPrice).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {hasMarkup && !isUnderpriced && (
                                            <div className="price-good">
                                                <span style={{ fontSize: '1.25rem' }}>✓</span>
                                                <div>
                                                    Markup: ${(totalPrice - itemsSubtotal).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} 
                                                    ({Math.round(((totalPrice - itemsSubtotal) / itemsSubtotal) * 100)}%)
                                                </div>
                                            </div>
                                        )}
                                        
                                        {totalPrice === itemsSubtotal && totalPrice > 0 && (
                                            <div className="price-good">
                                                <span style={{ fontSize: '1.25rem' }}>✓</span>
                                                <div>Total matches items exactly (no markup)</div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label">Total Price * (can be manually overridden)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                min="0"
                                step="0.01"
                                required
                                style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--primary)' }}
                            />
                            <small style={{ color: 'var(--fpg-gray)', fontSize: '0.85rem', display: 'block', marginTop: '0.5rem' }}>
                                💡 Use markup buttons above or type manually to adjust for state-specific pricing
                            </small>
                        </div>
                    </div>
                    
                    <div className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-save">
                            Save Product
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
