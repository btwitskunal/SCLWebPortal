function showPage(page) {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('upload-section').style.display = 'none';
  document.getElementById('analysis-section').style.display = 'none';
  if (page === 'login') {
    document.getElementById('login-section').style.display = 'block';
  } else if (page === 'upload') {
    document.getElementById('upload-section').style.display = 'block';
  } else if (page === 'analysis') {
    document.getElementById('analysis-section').style.display = 'block';
  }
}
// Show login by default
showPage('login');
