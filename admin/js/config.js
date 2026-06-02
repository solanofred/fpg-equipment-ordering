// ─── Configuration ───────────────────────────────────────────────────────────
// All environment constants in one place.
// To change any setting, edit ONLY this file.

const AZURE_FUNCTION_URL = 'https://fpg-equipment-function-b1.azurewebsites.net/api/publish-products';
const ADMIN_PORTAL_URL   = 'https://equipmentorder.foundationpartners.com/admin.html';

const SESSION_KEY = 'fpg_admin_session';

// Fallback admin list if admins.json cannot be fetched
const FALLBACK_ADMINS = [
    'matthew.ritchotte@foundationpartners.com',
    'joe.choss@foundationpartners.com',
    'chezarae.carter@foundationpartners.com',
    'fred.solano@foundationpartners.com'
];
