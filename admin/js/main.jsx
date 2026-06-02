// ─── Entry point: resizers + ReactDOM.createRoot

function initResizableCols(tableId) {
    var table = document.getElementById(tableId);
    if (!table) return;
    var ths = table.querySelectorAll('thead th');
    ths.forEach(function(th) {
        if (th.querySelector('.col-resizer')) return;
        var rz = document.createElement('div');
        rz.className = 'col-resizer';
        th.appendChild(rz);
        var x0, w0;
        rz.addEventListener('mousedown', function(e) {
            x0 = e.pageX; w0 = th.offsetWidth;
            rz.classList.add('dragging');
            document.addEventListener('mousemove', move);
            document.addEventListener('mouseup', up);
            e.preventDefault();
        });
        function move(e) { th.style.width = Math.max(40, w0 + e.pageX - x0) + 'px'; }
        function up() { rz.classList.remove('dragging'); document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); }
    });
}
function tryInitResizers() {
    ['tbl-products','tbl-categories','tbl-orders','tbl-admins','tbl-versions'].forEach(function(id) {
        initResizableCols(id);
    });
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(tryInitResizers, 800);
setInterval(tryInitResizers, 2000); });
} else {
    setTimeout(tryInitResizers, 800);
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
