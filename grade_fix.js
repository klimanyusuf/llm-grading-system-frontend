
// ========== FIXED GRADING FUNCTION ==========
// Replace the start-grading-btn handler

// Remove existing listener and add fixed one
const gradeBtn = document.getElementById('start-grading-btn');
if (gradeBtn) {
    // Clone and replace to remove old listeners
    const newGradeBtn = gradeBtn.cloneNode(true);
    gradeBtn.parentNode.replaceChild(newGradeBtn, gradeBtn);
    
    newGradeBtn.addEventListener('click', async function() {
        console.log('Start Grading clicked');
        
        const jobSelect = document.getElementById('grade-job-select');
        const jobId = jobSelect?.value;
        
        if (!jobId) {
            alert('Please select a job first');
            return;
        }
        
        // First, verify the job has answers
        const checkRes = await fetch(`${API_BASE}/api/jobs/${jobId}`);
        const jobData = await checkRes.json();
        
        if (jobData.total_answers === 0) {
            alert('No answers found. Please upload a CSV file first.');
            return;
        }
        
        // Show progress bar
        const progressDiv = document.getElementById('grading-progress');
        if (progressDiv) {
            progressDiv.style.display = 'block';
            const progressFill = document.getElementById('progress-fill');
            if (progressFill) progressFill.style.width = '0%';
            const progressText = document.getElementById('progress-text');
            if (progressText) progressText.innerHTML = 'Starting grading...';
        }
        
        try {
            const response = await fetch(`${API_BASE}/api/jobs/${jobId}/grade`, {
                method: 'POST'
            });
            
            const result = await response.json();
            console.log('Grade response:', result);
            
            if (response.ok) {
                showMessage('grade-result', `Grading started for job ${jobId}`, 'success');
                
                // Poll for completion
                if (window.pollingInterval) clearInterval(window.pollingInterval);
                window.pollingInterval = setInterval(async () => {
                    const jobsRes = await fetch(`${API_BASE}/api/jobs`);
                    const jobs = await jobsRes.json();
                    const job = jobs.find(j => j.id == jobId);
                    
                    if (job && job.total_answers > 0) {
                        const percent = (job.processed_answers / job.total_answers) * 100;
                        const progressFill = document.getElementById('progress-fill');
                        const progressText = document.getElementById('progress-text');
                        if (progressFill) progressFill.style.width = `${percent}%`;
                        if (progressText) progressText.innerHTML = `Processed ${job.processed_answers} of ${job.total_answers} answers...`;
                        
                        if (job.status === 'completed') {
                            clearInterval(window.pollingInterval);
                            const progressDiv2 = document.getElementById('grading-progress');
                            if (progressDiv2) progressDiv2.style.display = 'none';
                            showMessage('grade-result', '✅ Grading completed! Go to Review tab to see results.', 'success');
                            
                            // Refresh dropdowns
                            if (typeof loadJobsForSelect === 'function') {
                                loadJobsForSelect('review-job-select');
                                loadJobsForSelect('eval-job-select');
                            }
                        }
                    }
                }, 2000);
            } else {
                showMessage('grade-result', `Grading failed: ${JSON.stringify(result)}`, 'error');
                const progressDiv2 = document.getElementById('grading-progress');
                if (progressDiv2) progressDiv2.style.display = 'none';
            }
        } catch (error) {
            console.error('Grade error:', error);
            showMessage('grade-result', `Error: ${error.message}`, 'error');
            const progressDiv2 = document.getElementById('grading-progress');
            if (progressDiv2) progressDiv2.style.display = 'none';
        }
    });
    
    console.log('✅ Fixed grading button attached');
}
