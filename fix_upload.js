// FIXED UPLOAD FUNCTION - Replace the existing upload function
// Find and replace the upload button click handler

// First, remove any existing listeners
const uploadBtn = document.getElementById('upload-btn');
if (uploadBtn) {
    // Create new button to replace old one
    const newUploadBtn = uploadBtn.cloneNode(true);
    uploadBtn.parentNode.replaceChild(newUploadBtn, uploadBtn);
    
    newUploadBtn.addEventListener('click', async function() {
        console.log('Upload button clicked');
        
        const jobId = document.getElementById('grade-job-select').value;
        const fileInput = document.getElementById('answer-file');
        const file = fileInput.files[0];
        
        console.log('Job ID:', jobId);
        console.log('File:', file ? file.name : 'No file');
        
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
        reader.onload = async function(e) {
            const fileContent = e.target.result;
            console.log('File content length:', fileContent.length);
            
            // Create blob from file content
            const blob = new Blob([fileContent], { type: 'text/csv' });
            const formData = new FormData();
            formData.append('file', blob, file.name);
            
            try {
                const response = await fetch(`http://localhost:8000/api/jobs/${jobId}/upload`, {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                console.log('Upload result:', result);
                
                if (response.ok) {
                    alert(`✅ Successfully uploaded ${result.total} answers!`);
                    // Refresh job lists
                    if (typeof loadJobsForSelect === 'function') {
                        loadJobsForSelect('grade-job-select');
                        loadJobsForSelect('review-job-select');
                    }
                    location.reload();
                } else {
                    alert('Upload failed: ' + JSON.stringify(result));
                }
            } catch (error) {
                console.error('Upload error:', error);
                alert('Upload failed: ' + error.message);
            }
        };
        
        reader.onerror = function() {
            alert('Failed to read file');
        };
        
        reader.readAsText(file, 'UTF-8');
    });
    
    console.log('✅ Fixed upload button attached');
}

// FIXED START GRADING FUNCTION
const gradeBtn = document.getElementById('start-grading-btn');
if (gradeBtn) {
    const newGradeBtn = gradeBtn.cloneNode(true);
    gradeBtn.parentNode.replaceChild(newGradeBtn, gradeBtn);
    
    newGradeBtn.addEventListener('click', async function() {
        console.log('Grade button clicked');
        
        const jobId = document.getElementById('grade-job-select').value;
        console.log('Job ID:', jobId);
        
        if (!jobId) {
            alert('Please select a job first');
            return;
        }
        
        try {
            const response = await fetch(`http://localhost:8000/api/jobs/${jobId}/grade`, {
                method: 'POST'
            });
            
            const result = await response.json();
            console.log('Grade result:', result);
            
            if (response.ok) {
                alert('✅ Grading started! Check progress in Review tab.');
                // Poll for completion
                const interval = setInterval(async () => {
                    const jobsRes = await fetch('http://localhost:8000/api/jobs');
                    const jobs = await jobsRes.json();
                    const job = jobs.find(j => j.id == jobId);
                    if (job && job.status === 'completed') {
                        clearInterval(interval);
                        alert('✅ Grading completed! Click Load Results to see scores.');
                        if (typeof loadJobsForSelect === 'function') {
                            loadJobsForSelect('review-job-select');
                        }
                    }
                }, 2000);
            } else {
                alert('Grading failed: ' + JSON.stringify(result));
            }
        } catch (error) {
            console.error('Grade error:', error);
            alert('Grading failed: ' + error.message);
        }
    });
    
    console.log('✅ Fixed grade button attached');
}
