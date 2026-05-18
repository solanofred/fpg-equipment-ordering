const fetch = require('node-fetch');

// Fallback hardcoded admins (used only if admins.json can't be loaded)
const FALLBACK_ADMINS = [
    'matthew.ritchotte@foundationpartners.com',
    'joe.choss@foundationpartners.com',
    'chezarae.carter@foundationpartners.com',
    'fred.solano@foundationpartners.com'
];

const ADMIN_PORTAL_URL = 'https://solanofred.github.io/fpg-equipment-ordering/admin.html';

// GitHub config helper
function getGitHubConfig() {
    return {
        token: process.env.GITHUB_TOKEN,
        repo: process.env.GITHUB_REPO || 'solanofred/fpg-equipment-ordering',
        branch: process.env.GITHUB_BRANCH || 'main'
    };
}

// Fetch a file from GitHub and return { content, sha }
async function getGitHubFile(filePath) {
    const { token, repo, branch } = getGitHubConfig();
    const url = `https://api.github.com/repos/${repo}/contents/${filePath}?ref=${branch}`;
    const response = await fetch(url, {
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'FPG-Equipment-Portal'
        }
    });
    if (response.ok) {
        const data = await response.json();
        const content = Buffer.from(data.content, 'base64').toString('utf8');
        return { content: JSON.parse(content), sha: data.sha };
    } else if (response.status === 404) {
        return { content: null, sha: null };
    } else {
        throw new Error(`Failed to fetch ${filePath}: ${response.statusText}`);
    }
}

// Write a file to GitHub
async function putGitHubFile(filePath, content, sha, commitMessage) {
    const { token, repo, branch } = getGitHubConfig();
    const url = `https://api.github.com/repos/${repo}/contents/${filePath}`;
    const payload = {
        message: commitMessage,
        content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
        branch
    };
    if (sha) payload.sha = sha;
    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'FPG-Equipment-Portal'
        },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const err = await response.text();
        throw new Error(`GitHub write failed: ${err}`);
    }
    return await response.json();
}

// Load authorized admin emails from admins.json (falls back to hardcoded list)
async function loadAuthorizedEmails() {
    try {
        const { content } = await getGitHubFile('admins.json');
        if (content && Array.isArray(content)) {
            return content.map(a => a.email.toLowerCase().trim());
        }
    } catch (e) {}
    return FALLBACK_ADMINS;
}

module.exports = async function (context, req) {
    context.log('FPG Equipment Function triggered');

    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://solanofred.github.io',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-admin-email'
    };

    if (req.method === 'OPTIONS') {
        context.res = { status: 200, headers };
        return;
    }

    try {
        // Verify admin
        const adminEmail = req.headers['x-admin-email'];
        if (!adminEmail) {
            context.res = { status: 401, headers, body: JSON.stringify({ error: 'Unauthorized', message: 'Admin email required' }) };
            return;
        }

        const normalizedEmail = adminEmail.toLowerCase().trim();
        const authorizedEmails = await loadAuthorizedEmails();

        if (!authorizedEmails.includes(normalizedEmail)) {
            context.log.warn(`Unauthorized access attempt from: ${normalizedEmail}`);
            context.res = { status: 403, headers, body: JSON.stringify({ error: 'Forbidden', message: 'You are not authorized' }) };
            return;
        }

        context.log(`Authorized admin: ${normalizedEmail}`);

        // Route by action
        const action = req.body?.action || 'publish-products';

        // 1. PUBLISH PRODUCTS (existing workflow - unchanged)
        if (action === 'publish-products') {
            const { products } = req.body;
            if (!products || !Array.isArray(products)) {
                context.res = { status: 400, headers, body: JSON.stringify({ error: 'Bad Request', message: 'Products array required' }) };
                return;
            }

            context.log(`Publishing ${products.length} products`);
            const { sha } = await getGitHubFile('products.json');
            const result = await putGitHubFile('products.json', products, sha, `Update products via admin panel by ${normalizedEmail}`);

            context.res = {
                status: 200, headers,
                body: JSON.stringify({
                    success: true,
                    message: 'Products published successfully',
                    admin: normalizedEmail,
                    productsCount: products.length,
                    commitSha: result.commit.sha,
                    commitUrl: result.commit.html_url
                })
            };
            return;
        }

        // 2. GET ADMINS
        if (action === 'get-admins') {
            const { content: admins } = await getGitHubFile('admins.json');
            context.res = {
                status: 200, headers,
                body: JSON.stringify({ success: true, admins: admins || [] })
            };
            return;
        }

        // 3. ADD ADMIN
        if (action === 'add-admin') {
            const { newAdminEmail, newAdminName } = req.body;
            if (!newAdminEmail || !newAdminName) {
                context.res = { status: 400, headers, body: JSON.stringify({ error: 'Bad Request', message: 'newAdminEmail and newAdminName required' }) };
                return;
            }

            const newEmail = newAdminEmail.toLowerCase().trim();
            const { content: admins, sha } = await getGitHubFile('admins.json');
            const currentAdmins = admins || [];

            // Prevent duplicates
            if (currentAdmins.find(a => a.email.toLowerCase() === newEmail)) {
                context.res = { status: 409, headers, body: JSON.stringify({ error: 'Conflict', message: 'This email is already an admin' }) };
                return;
            }

            const updatedAdmins = [...currentAdmins, {
                email: newEmail,
                name: newAdminName.trim(),
                addedBy: normalizedEmail,
                addedAt: new Date().toISOString()
            }];

            const result = await putGitHubFile('admins.json', updatedAdmins, sha, `Add admin ${newEmail} by ${normalizedEmail}`);

            context.res = {
                status: 200, headers,
                body: JSON.stringify({
                    success: true,
                    message: `${newAdminName} added as admin`,
                    admins: updatedAdmins,
                    commitSha: result.commit.sha
                })
            };
            return;
        }

        // 4. REMOVE ADMIN
        if (action === 'remove-admin') {
            const { removeEmail } = req.body;
            if (!removeEmail) {
                context.res = { status: 400, headers, body: JSON.stringify({ error: 'Bad Request', message: 'removeEmail required' }) };
                return;
            }

            const emailToRemove = removeEmail.toLowerCase().trim();

            // Prevent self-removal
            if (emailToRemove === normalizedEmail) {
                context.res = { status: 400, headers, body: JSON.stringify({ error: 'Bad Request', message: 'You cannot remove yourself' }) };
                return;
            }

            const { content: admins, sha } = await getGitHubFile('admins.json');
            const currentAdmins = admins || [];
            const updatedAdmins = currentAdmins.filter(a => a.email.toLowerCase() !== emailToRemove);

            if (updatedAdmins.length === currentAdmins.length) {
                context.res = { status: 404, headers, body: JSON.stringify({ error: 'Not Found', message: 'Admin not found' }) };
                return;
            }

            const result = await putGitHubFile('admins.json', updatedAdmins, sha, `Remove admin ${emailToRemove} by ${normalizedEmail}`);

            context.res = {
                status: 200, headers,
                body: JSON.stringify({
                    success: true,
                    message: `${emailToRemove} removed`,
                    admins: updatedAdmins,
                    commitSha: result.commit.sha
                })
            };
            return;
        }

        // Unknown action
        context.res = { status: 400, headers, body: JSON.stringify({ error: 'Bad Request', message: `Unknown action: ${action}` }) };

    } catch (error) {
        context.log.error('Function error:', error);
        context.res = {
            status: 500, headers,
            body: JSON.stringify({ error: 'Internal Server Error', message: error.message || 'Unexpected error' })
        };
    }
};
