async function renderUploadPage() {
  // Fetch template columns
  let columns = [];
  try {
    const res = await fetch('/template');
    const data = await res.json();
    columns = data.columns || [];
  } catch (e) {}
  document.getElementById('upload-section').innerHTML = `
    <div class="card">
      <h2>Upload Excel File</h2>
      <a href="/template/download" target="_blank" class="btn">Download Template</a>
      <form id="upload-form">
        <input type="file" id="excel-file" accept=".xlsx,.xls" required />
        <button type="submit">Upload</button>
      </form>
      <div id="upload-result"></div>
      <h4>Template Columns:</h4>
      <ul>${columns.map(col => `<li>${col.name} (${col.type})</li>`).join('')}</ul>
    </div>
  `;
  document.getElementById('upload-form').onsubmit = async function(e) {
    e.preventDefault();
    const fileInput = document.getElementById('excel-file');
    if (!fileInput.files.length) return;
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    const res = await fetch('/upload', { method: 'POST', body: formData });
    const data = await res.json();
    const resultDiv = document.getElementById('upload-result');
    if (data.error) {
      resultDiv.innerText = data.error;
      resultDiv.style.color = '#dc3545';
    } else {
      resultDiv.innerText = data.message;
      resultDiv.style.color = '#28a745';
      document.getElementById('upload-form').reset();
    }
  };
}
// Render on navigation
if (document.getElementById('upload-section')) {
  document.getElementById('upload-section').addEventListener('show', renderUploadPage);
}
// Patch showPage to trigger event
const origShowPage = window.showPage;
window.showPage = function(page) {
  origShowPage(page);
  if (page === 'upload') {
    const evt = new Event('show');
    document.getElementById('upload-section').dispatchEvent(evt);
  }
};
