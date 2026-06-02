// ===== FIXED UPLOAD BUTTON HANDLER =====
// This replaces the old upload function

// Wait for page to load
document.addEventListener('DOMContentLoaded', function() {
    const uploadBtn = document.getElementById('upload-btn');
    if (!uploadBtn) return;
    
    // Remove old button and create new one
    const newBtn = uploadBtn.cloneNode(true);
    uploadBtn.parentNode.replaceChild(newBtn, uploadBtn);
    
    newBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        
        const jobSelect = document.getElementById('grade-job-select');
        const jobId = jobSelect ? jobSelect.value : null;
        const fileInput = document.getElementById('answer-file');
        const file = fileInput ? fileInput.files[0] : null;
        
        if (!jobId) {
            alert('Please select a job first');
            return;
        }
        
        if (!file) {
            alert('Please select a CSV file');
            return;
        }
        
        // Show uploading message
        const msgDiv = document.getElementById('grade-result');
        if (msgDiv) {
            msgDiv.textContent = 'Uploading...';
            msgDiv.className = 'result-message success';
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetch(`http://localhost:8000/api/jobs/${jobId}/upload`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (response.ok && result.total > 0) {
                alert(`✅ Uploaded ${result.total} answers!`);
                // Refresh the page to show updated job
                window.location.reload();
            } else {
                alert('Upload failed: ' + (result.detail || result.message || 'Unknown error'));
            }
        } catch(err) {
            console.error('Upload error:', err);
            alert('Upload error: ' + err.message);
        }
    });
    
    console.log('✅ Upload button fixed');
});
