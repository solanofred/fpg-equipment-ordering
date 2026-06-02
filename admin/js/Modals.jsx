// ─── Shared Modals: ConfirmModal, SuccessModal

function ConfirmModal({ isOpen, title, message, detail, onConfirm, onCancel }) {
    if (!isOpen) return null;
    
    return (
        <div className="confirm-overlay" onClick={onCancel}>
            <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="confirm-icon">
                    ✓
                </div>
                <div className="confirm-title">{title}</div>
                <div className="confirm-message">{message}</div>
                {detail && <div className="confirm-detail">{detail}</div>}
                <div className="confirm-buttons">
                    <button className="confirm-btn confirm-btn-cancel" onClick={onCancel}>
                        Cancel
                    </button>
                    <button className="confirm-btn confirm-btn-confirm" onClick={onConfirm}>
                        Publish
                    </button>
                </div>
            </div>
        </div>
    );
}

// Custom Success Modal Component
function SuccessModal({ isOpen, title, message, detail, onClose }) {
    if (!isOpen) return null;
    
    return (
        <div className="confirm-overlay" onClick={onClose}>
            <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="success-icon">
                    ✓
                </div>
                <div className="confirm-title">{title}</div>
                <div className="confirm-message">{message}</div>
                {detail && <div className="confirm-detail">{detail}</div>}
                <button className="confirm-btn confirm-btn-ok" onClick={onClose}>
                    OK
                </button>
            </div>
        </div>
    );
}
