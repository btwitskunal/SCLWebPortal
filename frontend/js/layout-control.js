let isAuthenticated = false;

async function checkAuth() {
  try {
    const res = await fetch('/auth/profile');
    isAuthenticated = res.ok;
  } catch (e) {
    isAuthenticated = false;
  }
  return isAuthenticated;
}

function showSection(section) {
  const sections = ['login-section', 'upload-modal', 'analysis-section'];
  sections.forEach(s => {
    const el = document.getElementById(s);
    if (el) {
      el.style.display = s === section ? 'flex' : 'none';
    }
  });
}

function setActiveNav(page) {
  const navUpload = document.getElementById('nav-upload');
  const navAnalysis = document.getElementById('nav-analysis');
  if (navUpload && navAnalysis) {
    navUpload.classList.remove('active');
    navAnalysis.classList.remove('active');
    if (page === 'upload') navUpload.classList.add('active');
    if (page === 'analysis') navAnalysis.classList.add('active');
  }
}

window.showPage = async function(page) {
  const isAuthed = await checkAuth();
  const userNav = document.getElementById('user-nav');
  
  if (!isAuthed) {
    showSection('login-section');
    if (userNav) userNav.style.display = 'none';
    return;
  }

  if (userNav) userNav.style.display = 'flex';
  
  if (page === 'analysis') {
    showSection('analysis-section');
    setActiveNav('analysis');
  } else {
    showSection('upload-modal');
    setActiveNav('upload');
  }
};

// Initialize page on load
window.addEventListener('DOMContentLoaded', async () => {
  const isAuthed = await checkAuth();
  if (!isAuthed) {
    showSection('login-section');
  } else {
    showPage('upload');
  }

  // Set up navigation handlers
  const navUpload = document.getElementById('nav-upload');
  const navAnalysis = document.getElementById('nav-analysis');
  const navLogout = document.getElementById('nav-logout');
  
  if (navUpload) navUpload.onclick = () => showPage('upload');
  if (navAnalysis) navAnalysis.onclick = () => showPage('analysis');
  if (navLogout) navLogout.onclick = async () => {
    await fetch('http://localhost:3000/auth/signout');
    window.location.reload();
  };
});

// Handle modal close
window.closeModal = function() {
  if (!isAuthenticated) {
    showSection('login-section');
    if (document.getElementById('user-nav')) {
      document.getElementById('user-nav').style.display = 'none';
    }
  } else {
    document.getElementById('upload-modal').style.display = 'none';
    if (document.getElementById('user-nav')) {
      document.getElementById('user-nav').style.display = 'flex';
    }
  }
}; 