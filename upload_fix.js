// ===== FIXED UPLOAD FUNCTION =====
// Replace the entire upload button handler

// Remove old listener by cloning button
const oldUploadBtn = document.getElementById('upload-btn');
const newUploadBtn = oldUploadBtn.cloneNode(true);
oldUploadBtn.parentNode.replaceChild(newUploadBtn, oldUploadBtn);

newUploadBtn.addEventListener('click', async function(e) {
    e.preventDefault();
    
    const jobId = document.getElementById('grade-job-select').value;
    const fileInput = document.getElementById('answer-file');
    const file = fileInput.files[0];
    
    console.log('=== UPLOAD DEBUG ===');
    console.log('Job ID:', jobId);
    console.log('File:', file?.name, file?.size);
    
    if (!jobId) {
        alert('Please select a job first');
        return;
    }
    
    if (!file) {
        alert('Please select a CSV file');
        return;
    }
    
    // Read the file as text and send
    const reader = new FileReader();
    reader.onload = async function(event) {
        const fileContent = event.target.result;
        console.log('File content length:', fileContent.length);
        console.log('First 100 chars:', fileContent.substring(0, 100));
        
        // Create blob and FormData
        const blob = new Blob([fileContent], { type: 'text/csv' });
        const formData = new FormData();
        formData.append('file', blob, file.name);
        
        try {
            const response = await fetch(`http://localhost:8000/api/jobs/${jobId}/upload`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            console.log('Upload response:', result);
            
            if (response.ok && result.total > 0) {
                alert(`✅ Uploaded ${result.total} answers!`);
                // Refresh the page to show updated job
                location.reload();
            } else {
                alert(`Upload failed: ${result.message || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('Upload error:', err);
            alert('Upload failed: ' + err.message);
        }
    };
    
    reader.onerror = function() {
        alert('Failed to read file');
    };
    
    reader.readAsText(file, 'UTF-8');
});

console.log('✅ Fixed upload button attached');
