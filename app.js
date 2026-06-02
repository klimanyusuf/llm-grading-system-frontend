const API_BASE = 'http://localhost:8000';
let currentJobId = null;
let pollingInterval = null;

// Helper: Load jobs into dropdowns
async function loadJobsForSelect(selectId) {
    try {
        const res = await fetch(`${API_BASE}/api/jobs`);
        const jobs = await res.json();
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = '<option value="">-- Select a job --</option>';
        jobs.forEach(job => {
            const opt = document.createElement('option');
            opt.value = job.id;
            opt.textContent = `${job.job_name} (${job.status} - ${job.total_answers} answers)`;
            select.appendChild(opt);
        });
    } catch(e) { console.error(e); }
}

function showMessage(elId, msg, type) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = msg;
    el.className = `result-message ${type}`;
    setTimeout(() => { if(el) { el.textContent = ''; el.className = 'result-message'; } }, 5000);
}

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`${tabId}-tab`).classList.add('active');
        if (tabId === 'jobs') loadJobs();
        if (tabId === 'grade') loadJobsForSelect('grade-job-select');
        if (tabId === 'review') loadJobsForSelect('review-job-select');
        if (tabId === 'evaluate') loadJobsForSelect('eval-job-select');
    });
});

// CREATE JOB
document.getElementById('create-job-btn').addEventListener('click', async () => {
    const jobName = document.getElementById('job-name').value.trim();
    const qText = document.getElementById('question-text').value.trim();
    const refAns = document.getElementById('ref-answer').value.trim();
    const maxScore = parseInt(document.getElementById('max-score').value);
    
    if (!jobName || !qText || !refAns) {
        showMessage('create-result', 'Please fill all fields', 'error');
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/api/jobs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                job_name: jobName,
                questions: [{ question_text: qText, reference_answer: refAns, max_score: maxScore }]
            })
        });
        const job = await res.json();
        showMessage('create-result', `✅ Job created! ID: ${job.id}`, 'success');
        document.getElementById('job-name').value = '';
        document.getElementById('question-text').value = '';
        document.getElementById('ref-answer').value = '';
        loadJobsForSelect('grade-job-select');
        loadJobsForSelect('review-job-select');
        loadJobsForSelect('eval-job-select');
    } catch(e) { showMessage('create-result', `Error: ${e.message}`, 'error'); }
});

// UPLOAD ANSWERS - FIXED
document.getElementById('upload-btn').addEventListener('click', async () => {
    const jobId = document.getElementById('grade-job-select').value;
    const fileInput = document.getElementById('answer-file');
    const file = fileInput.files[0];
    
    if (!jobId) {
        showMessage('grade-result', 'Please select a job first', 'error');
        return;
    }
    if (!file) {
        showMessage('grade-result', 'Please select a CSV file', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const res = await fetch(`${API_BASE}/api/jobs/${jobId}/upload`, {
            method: 'POST',
            body: formData
        });
        const result = await res.json();
        
        if (res.ok && result.total > 0) {
            showMessage('grade-result', `✅ Uploaded ${result.total} answers!`, 'success');
            // Refresh the job dropdowns
            await loadJobsForSelect('grade-job-select');
            await loadJobsForSelect('review-job-select');
            // Show the updated answer count in the dropdown
            const select = document.getElementById('grade-job-select');
            if (select) {
                for (let i = 0; i < select.options.length; i++) {
                    if (select.options[i].value == jobId) {
                        select.options[i].text = select.options[i].text.replace('0 answers', `${result.total} answers`);
                        break;
                    }
                }
            }
        } else {
            showMessage('grade-result', `Upload failed: ${result.message || 'Unknown error'}`, 'error');
        }
    } catch(e) {
        showMessage('grade-result', `Upload error: ${e.message}`, 'error');
    }
});

// START GRADING
document.getElementById('start-grading-btn').addEventListener('click', async () => {
    const jobId = document.getElementById('grade-job-select').value;
    
    if (!jobId) {
        showMessage('grade-result', 'Please select a job', 'error');
        return;
    }
    
    // Check if job has answers first
    const checkRes = await fetch(`${API_BASE}/api/jobs/${jobId}`);
    const jobData = await checkRes.json();
    
    if (jobData.total_answers === 0) {
        showMessage('grade-result', 'No answers found. Please upload a CSV file first.', 'error');
        return;
    }
    
    const progressDiv = document.getElementById('grading-progress');
    progressDiv.style.display = 'block';
    document.getElementById('progress-fill').style.width = '0%';
    document.getElementById('progress-text').innerHTML = 'Starting grading...';
    
    try {
        const res = await fetch(`${API_BASE}/api/jobs/${jobId}/grade`, { method: 'POST' });
        const result = await res.json();
        
        if (res.ok) {
            showMessage('grade-result', `Grading started for job ${jobId}`, 'success');
            
            if (pollingInterval) clearInterval(pollingInterval);
            pollingInterval = setInterval(async () => {
                const jobsRes = await fetch(`${API_BASE}/api/jobs`);
                const jobs = await jobsRes.json();
                const job = jobs.find(j => j.id == jobId);
                
                if (job && job.total_answers > 0) {
                    const percent = (job.processed_answers / job.total_answers) * 100;
                    document.getElementById('progress-fill').style.width = `${percent}%`;
                    document.getElementById('progress-text').innerHTML = `Processed ${job.processed_answers} of ${job.total_answers} answers...`;
                    
                    if (job.status === 'completed') {
                        clearInterval(pollingInterval);
                        progressDiv.style.display = 'none';
                        showMessage('grade-result', '✅ Grading completed! Go to Review tab.', 'success');
                        loadJobsForSelect('review-job-select');
                    }
                }
            }, 2000);
        } else {
            showMessage('grade-result', `Grading failed: ${JSON.stringify(result)}`, 'error');
            progressDiv.style.display = 'none';
        }
    } catch(e) {
        showMessage('grade-result', `Error: ${e.message}`, 'error');
        progressDiv.style.display = 'none';
    }
});

// LOAD RESULTS
document.getElementById('load-results-btn').addEventListener('click', async () => {
    const jobId = document.getElementById('review-job-select').value;
    if (!jobId) { alert('Select a job'); return; }
    
    const res = await fetch(`${API_BASE}/api/jobs/${jobId}/results`);
    const results = await res.json();
    const tbody = document.querySelector('#results-table tbody');
    tbody.innerHTML = '';
    
    if (results.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No results found. Make sure grading is complete.</td></table>';
        return;
    }
    
    results.forEach(a => {
        const row = tbody.insertRow();
        row.insertCell(0).textContent = a.student_id || 'N/A';
        row.insertCell(1).textContent = a.student_answer.length > 60 ? a.student_answer.substring(0,60)+'...' : a.student_answer;
        row.insertCell(2).textContent = a.model_score !== null ? a.model_score : 'Pending';
        
        const varCell = row.insertCell(3);
        const badge = document.createElement('span');
        badge.className = `variation-badge ${a.is_nigerian_variation ? 'variation-yes' : 'variation-no'}`;
        badge.textContent = a.is_nigerian_variation ? 'Yes' : 'No';
        varCell.appendChild(badge);
        
        const overrideCell = row.insertCell(4);
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.className = 'override-input';
        inp.value = a.human_override_score !== null ? a.human_override_score : (a.model_score || '');
        overrideCell.appendChild(inp);
        
        row.insertCell(5).textContent = a.final_score !== null ? a.final_score : 'Pending';
        
        const actionCell = row.insertCell(6);
        const btn = document.createElement('button');
        btn.textContent = 'Save';
        btn.className = 'btn btn-secondary btn-sm';
        btn.onclick = async () => {
            const newScore = parseFloat(inp.value);
            if (isNaN(newScore)) { alert('Enter a number'); return; }
            await fetch(`${API_BASE}/api/override`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answer_id: a.id, override_score: newScore })
            });
            row.cells[5].textContent = newScore;
            alert('✅ Grade updated');
        };
        actionCell.appendChild(btn);
    });
    currentJobId = jobId;
});

// EXPORT
document.getElementById('export-btn').addEventListener('click', () => {
    if (!currentJobId) { alert('Load results first'); return; }
    window.open(`${API_BASE}/api/jobs/${currentJobId}/export`, '_blank');
});

// BATCH OVERRIDE
document.getElementById('batch-override-btn').addEventListener('click', async () => {
    if (!currentJobId) { alert('Load results first'); return; }
    const res = await fetch(`${API_BASE}/api/jobs/${currentJobId}/results`);
    const results = await res.json();
    let count = 0;
    for (const a of results) {
        if (a.is_nigerian_variation && a.model_score !== null) {
            const newScore = Math.min(100, a.model_score + 5);
            await fetch(`${API_BASE}/api/override`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answer_id: a.id, override_score: newScore })
            });
            count++;
        }
    }
    alert(`✅ Updated ${count} answers (+5 points)`);
    document.getElementById('load-results-btn').click();
});

// EVALUATION
document.getElementById('run-evaluation-btn').addEventListener('click', async () => {
    const jobId = document.getElementById('eval-job-select').value;
    if (!jobId) { alert('Select a job'); return; }
    try {
        const res = await fetch(`${API_BASE}/api/evaluate/${jobId}`);
        const r = await res.json();
        document.getElementById('evaluation-results').style.display = 'block';
        document.getElementById('eval-qwk-all').textContent = r.qwk_all?.toFixed(4) || 'N/A';
        document.getElementById('eval-rmse-all').textContent = r.rmse_all?.toFixed(2) || 'N/A';
        document.getElementById('eval-qwk-standard').textContent = r.qwk_standard?.toFixed(4) || 'N/A';
        document.getElementById('eval-qwk-variation').textContent = r.qwk_variation?.toFixed(4) || 'N/A';
    } catch(e) { alert('Evaluation failed: ' + e.message); }
});

// DOWNLOAD SAMPLE CSV
document.getElementById('download-sample-csv').addEventListener('click', () => {
    const sample = `student_id,answer\nCIT001,The CPU is the brain of the computer.\nCIT002,CPU dey process all instructions.\nCIT003,Central Processing Unit executes programs.`;
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_answers.csv';
    a.click();
    URL.revokeObjectURL(url);
});

async function loadJobs() {
    try {
        const res = await fetch(`${API_BASE}/api/jobs`);
        const jobs = await res.json();
        const container = document.getElementById('jobs-list');
        container.innerHTML = '';
        if (jobs.length === 0) { container.innerHTML = '<p>No jobs yet.</p>'; return; }
        jobs.forEach(job => {
            const div = document.createElement('div');
            div.className = 'job-item';
            div.innerHTML = `<div><strong>${job.job_name}</strong><br><small>ID: ${job.id}</small></div><div><span class="job-status status-${job.status}">${job.status}</span> 📊 ${job.processed_answers}/${job.total_answers}</div>`;
            container.appendChild(div);
        });
    } catch(e) { console.error(e); }
}

// Initialize
loadJobsForSelect('grade-job-select');
loadJobsForSelect('review-job-select');
loadJobsForSelect('eval-job-select');
console.log('✅ UI Ready - Upload should work now');

// ============================================
// FIXED UPLOAD FUNCTION - Added on $(Get-Date)
// ============================================
(function fixUpload() {
    console.log('Applying upload fix...');
    
    const uploadBtn = document.getElementById('upload-btn');
    if (!uploadBtn) {
        console.log('Upload button not found');
        return;
    }
    
    // Clone and replace to remove old event listeners
    const newUploadBtn = uploadBtn.cloneNode(true);
    uploadBtn.parentNode.replaceChild(newUploadBtn, uploadBtn);
    
    newUploadBtn.addEventListener('click', async function(e) {
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
        
        console.log('Uploading to job:', jobId);
        console.log('File:', file.name, file.size, 'bytes');
        
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
                alert(`✅ Uploaded ${result.total} answers! Now click Start Grading.`);
                // Refresh the page to show updated job status
                location.reload();
            } else {
                alert('Upload failed: ' + (result.message || JSON.stringify(result)));
            }
        } catch(err) {
            console.error('Upload error:', err);
            alert('Upload error: ' + err.message);
        }
    });
    
    console.log('✅ Upload button fixed. Now try uploading again.');
})();

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

// ===== FIXED EVALUATION FUNCTION =====
(function fixEvaluation() {
    console.log('Applying evaluation fix...');
    
    const evaluateBtn = document.getElementById('run-evaluation-btn');
    if (!evaluateBtn) {
        console.log('Evaluate button not found');
        return;
    }
    
    // Clone and replace to remove old listeners
    const newBtn = evaluateBtn.cloneNode(true);
    evaluateBtn.parentNode.replaceChild(newBtn, evaluateBtn);
    
    newBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        
        const jobSelect = document.getElementById('eval-job-select');
        const jobId = jobSelect ? jobSelect.value : null;
        
        if (!jobId) {
            alert('Please select a completed job first');
            return;
        }
        
        console.log('Evaluating job:', jobId);
        
        try {
            const response = await fetch(`http://localhost:8000/api/evaluate/${jobId}`);
            
            if (!response.ok) {
                const error = await response.json();
                alert('Evaluation failed: ' + (error.detail || 'Unknown error'));
                return;
            }
            
            const results = await response.json();
            console.log('Evaluation results:', results);
            
            // Display results
            const resultsDiv = document.getElementById('evaluation-results');
            if (resultsDiv) {
                resultsDiv.style.display = 'block';
                
                document.getElementById('eval-qwk-all').textContent = (results.qwk_all || 0).toFixed(4);
                document.getElementById('eval-rmse-all').textContent = (results.rmse_all || 0).toFixed(2);
                document.getElementById('eval-qwk-standard').textContent = (results.qwk_standard || 0).toFixed(4);
                document.getElementById('eval-qwk-variation').textContent = (results.qwk_variation || 0).toFixed(4);
                
                // Add interpretation
                const qwkAll = results.qwk_all || 0;
                const rq1El = document.getElementById('rq1-interpretation');
                if (rq1El) {
                    if (qwkAll >= 0.70) {
                        rq1El.innerHTML = '<strong>✓ RQ1 Answer:</strong> Model achieves substantial agreement (QWK ≥ 0.70) on Nigerian English variations.';
                    } else if (qwkAll >= 0.50) {
                        rq1El.innerHTML = '<strong>⚠️ RQ1 Answer:</strong> Model achieves moderate agreement (QWK between 0.50-0.70).';
                    } else {
                        rq1El.innerHTML = '<strong>❌ RQ1 Answer:</strong> Model shows low agreement. Consider more fine-tuning.';
                    }
                }
                
                const qwkStandard = results.qwk_standard || 0;
                const qwkVariation = results.qwk_variation || 0;
                const rq2El = document.getElementById('rq2-interpretation');
                if (rq2El) {
                    if (Math.abs(qwkStandard - qwkVariation) < 0.1) {
                        rq2El.innerHTML = '<strong>✓ RQ2 Answer:</strong> Model performs equally well on both standard English and Nigerian variations.';
                    } else if (qwkVariation < qwkStandard) {
                        rq2El.innerHTML = `<strong>⚠️ RQ2 Answer:</strong> Model performs better on standard English (${qwkStandard.toFixed(3)}) than Nigerian variations (${qwkVariation.toFixed(3)}).`;
                    } else {
                        rq2El.innerHTML = `<strong>✓ RQ2 Answer:</strong> Model performs better on Nigerian variations (${qwkVariation.toFixed(3)}).`;
                    }
                }
            }
            
            alert('✅ Evaluation complete! Check the results below.');
            
        } catch (error) {
            console.error('Evaluation error:', error);
            alert('Evaluation error: ' + error.message);
        }
    });
    
    console.log('✅ Evaluation button fixed');
})();
