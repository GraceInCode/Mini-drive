const API_BASE = ''; // Same origin, so empty string

function showMessage(msg, isError = false) {
    const msgEl = document.getElementById('message');
    msgEl.textContent = msg;
    msgEl.className = 'message ' + (isError ? 'error' : 'success');
    setTimeout(() => { msgEl.className = 'message'; msgEl.textContent = ''; }, 5000);
}

function toggleSections(isLoggedIn) {
    const authSection = document.getElementById('auth-section');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('user-info');
    const foldersSection = document.getElementById('folders-section');

    authSection.classList.toggle('hidden', isLoggedIn);
    logoutBtn.classList.toggle('hidden', !isLoggedIn);
    userInfo.classList.toggle('hidden', !isLoggedIn);
    foldersSection.classList.toggle('hidden', !isLoggedIn);
}

async function checkAuth() {
    try {
        console.log('Checking auth status');
        const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
        console.log('GET /auth/me response:', res.status);
        if (res.ok) {
            const user = await res.json();
            document.getElementById('user-email').textContent = `Logged in as: ${user.email}`;
            toggleSections(true);
            loadFolders();
            return true;
        } else {
            toggleSections(false);
            return false;
        }
    } catch (err) {
        showMessage('Error checking auth: ' + err.message, true);
        console.error('checkAuth error:', err);
        return false;
    }
}

async function register(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = { email: formData.get('email'), password: formData.get('password') };
    console.log('sending register data:', data);
    try {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        console.log('Register response:', res.status);
        if (res.ok) {
            showMessage('Registered and logged in!');
            checkAuth();
        } else {
            const err = await res.json();
            showMessage(err.error || 'Register failed', true);
        }
    } catch (err) {
        showMessage('Error: ' + err.message, true);
        console.error('Register error:', err);
    }
}

async function login(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = { email: formData.get('email'), password: formData.get('password') };
    console.log('sending login data:', data);
    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        console.log('Login response:', res.status);
        if (res.ok) {
            showMessage('Logged in!');
            checkAuth();
        } else {
            const err = await res.json();
            showMessage(err.error || 'Login failed', true);
        }
    } catch (err) {
        showMessage('Error: ' + err.message, true);
        console.error('Login error:', err);
    }
}

async function logout() {
    try {
        const res = await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        console.log('Logout response:', res.status);
        if (res.ok) {
            showMessage('Logged out');
            checkAuth();
        } else {
            showMessage('Logout failed', true);
        }
    } catch (err) {
        showMessage('Error: ' + err.message, true);
        console.error('Logout error:', err);
    }
}

async function createFolder(event) {
    event.preventDefault();
    const name = document.getElementById('folder-name').value.trim();
    if (!name) {
        showMessage('Name required', true);
        return;
    }
    const data = { name };
    try {
        const res = await fetch(`${API_BASE}/folders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        if (res.ok) {
            showMessage('Folder created');
            event.target.reset();
            loadFolders();
        } else {
            const err = await res.json();
            showMessage(err.error || 'Create failed', true);
        }
    } catch (err) {
        showMessage('Error: ' + err.message, true);
    }
}

async function loadFolders() {
    try {
        const res = await fetch(`${API_BASE}/folders`, { credentials: 'include' });
        if (res.ok) {
            const folders = await res.json();
            const list = document.getElementById('folders-list');
            list.innerHTML = '';
            folders.forEach(folder => {
                const li = document.createElement('li');
                li.className = 'folder-card';
                li.innerHTML = `
                    <strong>${folder.name}</strong> (ID: ${folder.id})
                    <button class="btn btn-primary" onclick="deleteFolder('${folder.id}')">Delete</button>
                    <button class="btn btn-primary" onclick="shareFolder('${folder.id}')">Share</button>
                    <div id="share-url-${folder.id}" class="share-url"></div>
                    <form class="file-upload-form" onsubmit="uploadFile(event, '${folder.id}')">
                        <input type="file" name="file" required>
                        <button type="submit" class="btn btn-primary">Upload to this folder</button>
                    </form>
                    <ul class="files-list">
                        ${folder.files.map(file => `
                            <li>
                                ${file.name} (${file.size} bytes)
                                <a href="${API_BASE}/files/${file.id}/download" download>Download</a>
                            </li>
                        `).join('')}
                    </ul>
                `;
                list.appendChild(li);
            });
        } else {
            showMessage('Failed to load folders', true);
        }
    } catch (err) {
        showMessage('Error: ' + err.message, true);
    }
}

async function deleteFolder(id) {
    if (!confirm('Delete folder?')) return;
    try {
        const res = await fetch(`${API_BASE}/folders/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (res.ok) {
            showMessage('Folder deleted');
            loadFolders();
        } else {
            const err = await res.json();
            showMessage(err.error || 'Delete failed', true);
        }
    } catch (err) {
        showMessage('Error: ' + err.message, true);
    }
}

async function shareFolder(id) {
    try {
        const res = await fetch(`${API_BASE}/folders/${id}/share`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ duration: '1d' }), // Default 1 day, can add input later
            credentials: 'include'
        });
        if (res.ok) {
            const { url, expiresAt } = await res.json();
            document.getElementById(`share-url-${id}`).innerHTML = `Share URL: <a href="${url}">${url}</a> (expires ${new Date(expiresAt).toLocaleString()})`;
            showMessage('Folder shared');
        } else {
            const err = await res.json();
            showMessage(err.error || 'Share failed', true);
        }
    } catch (err) {
        showMessage('Error: ' + err.message, true);
    }
}

async function uploadFile(event, folderId) {
    event.preventDefault();
    const formData = new FormData(event.target);
    try {
        const res = await fetch(`${API_BASE}/files/folders/${folderId}/upload`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        if (res.ok) {
            showMessage('File uploaded');
            event.target.reset();
            loadFolders();
        } else {
            const err = await res.json();
            showMessage(err.error || 'Upload failed', true);
        }
    } catch (err) {
        showMessage('Error: ' + err.message, true);
    }
}

async function loadSharedFolder(token) {
    try {
        const res = await fetch(`${API_BASE}/share/${token}`);
        if (res.ok) {
            const { folder, files } = await res.json();
            document.getElementById('shared-folder-name').textContent = `Folder: ${folder.name}`;
            const list = document.getElementById('shared-files-list');
            list.innerHTML = '';
            files.forEach(file => {
                const li = document.createElement('li');
                li.innerHTML = `
                    ${file.name} (${file.size} bytes)
                    ${file.url ? `<a href="${file.url}" download>Download</a>` : 'No download available'}
                `;
                list.appendChild(li);
            });
            document.getElementById('shared-view').classList.remove('hidden');
            document.getElementById('auth-section').classList.add('hidden');
            document.getElementById('folders-section').classList.add('hidden');
            document.getElementById('user-info').classList.add('hidden');
        } else {
            showMessage('Failed to load shared folder', true);
        }
    } catch (err) {
        showMessage('Error: ' + err.message, true);
    }
}

// Event listeners
document.getElementById('registerForm').addEventListener('submit', register);
document.getElementById('loginForm').addEventListener('submit', login);
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('createFolderForm').addEventListener('submit', createFolder);

// Check for shared token in URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
if (token) {
    loadSharedFolder(token);
} else {
    checkAuth();
}

// Expose functions for inline onClick
window.deleteFolder = deleteFolder;
window.shareFolder = shareFolder;
window.uploadFile = uploadFile;