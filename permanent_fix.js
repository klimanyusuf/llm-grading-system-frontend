
// ============================================
// PERMANENT FIX FOR UPLOAD - DO NOT REMOVE
// ============================================
(function() {
    console.log('Applying permanent upload fix...');
    
    // Wait for DOM to be ready
    setTimeout(() => {
        const uploadBtn = document.getElementById('upload-btn');
        if (!uploadBtn) {
            console.log('Upload button not found');
            return;
        }
        
        // Clone and replace to remove old listeners
        const newBtn = uploadBtn.cloneNode(true);
        uploadBtn.parentNode.replaceChild(newBtn, uploadBtn);
        
        newBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
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
            
            console.log('Uploading to job:', jobId);
            console.log('File:', file.name, file.size);
            
            const formData = new FormData();
            formData.append('file', file);
            
            try {
                const response = await fetch(`http://localhost:8000/api/jobs/${jobId}/upload`, {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                console.log('Upload response:', result);
                
                if (response.ok && result.total > 0) {
                    alert(`✅ Uploaded ${result.total} answers! The page will now refresh.`);
                    // Force refresh to show updated job
                    window.location.reload();
                } else {
                    alert('Upload failed: ' + (result.message || 'Unknown error'));
                }
            } catch(err) {
                console.error('Upload error:', err);
                alert('Upload error: ' + err.message);
            }
        });
        
        console.log('✅ Permanent upload fix applied');
    }, 500);
})();
