let selectedFile = null;

function closeModal() {
  document.getElementById('upload-modal').style.display = 'none';
}

const dropArea = document.getElementById('drop-area');
const fileElem = document.getElementById('fileElem');
const uploadBtn = document.getElementById('uploadBtn');
const uploadResult = document.getElementById('upload-result');

// Drag and drop events
['dragenter', 'dragover'].forEach(eventName => {
  dropArea.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropArea.style.background = '#f0f8ff';
    dropArea.style.borderColor = '#1976d2';
  }, false);
});
['dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropArea.style.background = '#fafbfc';
    dropArea.style.borderColor = '#bbb';
  }, false);
});
dropArea.addEventListener('drop', (e) => {
  const dt = e.dataTransfer;
  const files = dt.files;
  if (files && files[0]) {
    selectedFile = files[0];
    showSelectedFile();
  }
});
fileElem.addEventListener('change', (e) => {
  if (fileElem.files && fileElem.files[0]) {
    selectedFile = fileElem.files[0];
    showSelectedFile();
  }
});
function showSelectedFile() {
  if (selectedFile) {
    dropArea.querySelector('p').innerHTML = `<strong>${selectedFile.name}</strong>`;
  }
}
uploadBtn.onclick = async function() {
  if (!selectedFile) {
    uploadResult.innerText = 'Please select a file.';
    uploadResult.style.color = '#dc3545';
    return;
  }
  const formData = new FormData();
  formData.append('file', selectedFile);
  uploadResult.innerText = 'Uploading...';
  uploadResult.style.color = '#333';
  try {
    const res = await fetch('/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.error) {
      uploadResult.innerText = data.error;
      uploadResult.style.color = '#dc3545';
    } else {
      uploadResult.innerText = data.message;
      uploadResult.style.color = '#28a745';
      selectedFile = null;
      setTimeout(() => {
        closeModal();
        uploadResult.innerText = '';
        dropArea.querySelector('p').innerHTML = '<strong>Drag and drop files here</strong>';
      }, 1500);
    }
  } catch (e) {
    uploadResult.innerText = 'Upload failed.';
    uploadResult.style.color = '#dc3545';
  }
}; 