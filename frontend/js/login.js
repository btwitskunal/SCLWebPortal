// Check authentication status
async function checkAuth() {
    try {
        const res = await fetch('/auth/profile');
        return res.ok;
    } catch (e) {
        return false;
    }
}

// Handle login button click
document.getElementById('login-btn').addEventListener('click', function() {
    window.location.href = 'http://localhost:3000/auth/signin';
});

// Check auth status on page load
window.addEventListener('DOMContentLoaded', async () => {
    const isAuthenticated = await checkAuth();
    if (isAuthenticated) {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('user-nav').style.display = 'flex';
        document.getElementById('upload-modal').style.display = 'flex';
    } else {
        document.getElementById('login-section').style.display = 'flex';
        document.getElementById('user-nav').style.display = 'none';
        document.getElementById('upload-modal').style.display = 'none';
    }
});

