const API_BASE = 'http://localhost:8000';

let currentJobId = null;
let pollingInterval = null;

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

document.getElementById('create-job-btn').addEventListener('click', async () => {
    const jobName = document.getElementById('job-name').value.trim();
    const questionText = document.getElementById('question-text').value.trim();
    const refAnswer = document.getElementById('ref-answer').value.trim();
    const maxScore = parseInt(document.getElementById('max-score').value);
    
    if (!jobName || !questionText || !refAnswer) {
        showMessage('create-result', 'Please fill all fields', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/jobs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                job_name: jobName,
                questions: [{
                    question_text: questionText,
                    reference_answer: refAnswer,
                    max_score: maxScore
                }]
            })
        });
        
        const job = await response.json();
        showMessage('create-result', `✅ Job created! ID: ${job.id}`, 'success');
        document.getElementById('job-name').value = '';
        document.getElementById('question-text').value = '';
        document.getElementById('ref-answer').value = '';
        
        loadJobsForSelect('grade-job-select');
        loadJobsForSelect('review-job-select');
        loadJobsForSelect('eval-job-select');
    } catch (error) {
        showMessage('create-result', `Error: ${error.message}`, 'error');
    }
});

async function loadJobsForSelect(selectId) {
    try {
        const response = await fetch(`${API_BASE}/api/jobs`);
        const jobs = await response.json();
        const select = document.getElementById(selectId);
        if (!select) return;
        
        select.innerHTML = '<option value="">-- Select a job --</option>';
        jobs.forEach(job => {
            const option = document.createElement('option');
            option.value = job.id;
            option.textContent = `${job.job_name} (${job.status} - ${job.processed_answers}/${job.total_answers})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load jobs:', error);
    }
}

document.getElementById('upload-btn')?.addEventListener('click', async () => {
    const jobId = document.getElementById('grade-job-select').value;
    const fileInput = document.getElementById('answer-file');
    
    if (!jobId) {
        showMessage('grade-result', 'Please select a job first', 'error');
        return;
    }
    
    if (!fileInput.files || !fileInput.files[0]) {
        showMessage('grade-result', 'Please select a CSV file', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    
    try {
        const response = await fetch(`${API_BASE}/api/jobs/${jobId}/upload`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        showMessage('grade-result', `✅ Uploaded ${result.total} answers`, 'success');
        currentJobId = jobId;
    } catch (error) {
        showMessage('grade-result', `Upload error: ${error.message}`, 'error');
    }
});

document.getElementById('start-grading-btn')?.addEventListener('click', async () => {
    const jobId = document.getElementById('grade-job-select').value;
    if (!jobId) {
        showMessage('grade-result', 'Please select a job', 'error');
        return;
    }
    
    const progressDiv = document.getElementById('grading-progress');
    progressDiv.style.display = 'block';
    document.getElementById('progress-fill').style.width = '0%';
    document.getElementById('progress-text').innerHTML = 'Starting grading...';
    
    try {
        const response = await fetch(`${API_BASE}/api/jobs/${jobId}/grade`, {
            method: 'POST'
        });
        
        const result = await response.json();
        showMessage('grade-result', `Grading started for job ${jobId}`, 'success');
        
        if (pollingInterval) clearInterval(pollingInterval);
        pollingInterval = setInterval(() => checkProgress(jobId), 2000);
    } catch (error) {
        showMessage('grade-result', `Error: ${error.message}`, 'error');
        progressDiv.style.display = 'none';
    }
});

async function checkProgress(jobId) {
    try {
        const response = await fetch(`${API_BASE}/api/jobs`);
        const jobs = await response.json();
        const job = jobs.find(j => j.id == jobId);
        
        if (job) {
            const percent = job.total_answers > 0 ? (job.processed_answers / job.total_answers) * 100 : 0;
            document.getElementById('progress-fill').style.width = `${percent}%`;
            document.getElementById('progress-text').innerHTML = `Processed ${job.processed_answers} of ${job.total_answers} answers...`;
            
            if (job.status === 'completed') {
                clearInterval(pollingInterval);
                document.getElementById('grading-progress').style.display = 'none';
                showMessage('grade-result', '✅ Grading completed! Go to Review tab to see results.', 'success');
                loadJobsForSelect('review-job-select');
                loadJobsForSelect('eval-job-select');
            }
            if (job.status === 'failed') {
                clearInterval(pollingInterval);
                document.getElementById('grading-progress').style.display = 'none';
                showMessage('grade-result', 'Grading failed. Please check logs.', 'error');
            }
        }
    } catch (error) {
        console.error('Progress check failed:', error);
    }
}

document.getElementById('load-results-btn')?.addEventListener('click', async () => {
    const jobId = document.getElementById('review-job-select').value;
    if (!jobId) {
        alert('Please select a job');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/jobs/${jobId}/results`);
        const results = await response.json();
        displayResults(results);
        currentJobId = jobId;
    } catch (error) {
        alert('Failed to load results: ' + error.message);
    }
});

function displayResults(results) {
    const tbody = document.querySelector('#results-table tbody');
    tbody.innerHTML = '';
    
    results.forEach(answer => {
        const row = tbody.insertRow();
        row.insertCell(0).textContent = answer.student_id || 'N/A';
        row.insertCell(1).textContent = answer.student_answer.length > 80 ? answer.student_answer.substring(0, 80) + '...' : answer.student_answer;
        row.insertCell(2).textContent = answer.model_score !== null ? answer.model_score : 'Pending';
        
        const variationCell = row.insertCell(3);
        const badge = document.createElement('span');
        badge.className = `variation-badge ${answer.is_nigerian_variation ? 'variation-yes' : 'variation-no'}`;
        badge.textContent = answer.is_nigerian_variation ? 'Yes' : 'No';
        variationCell.appendChild(badge);
        
        const overrideCell = row.insertCell(4);
        const overrideInput = document.createElement('input');
        overrideInput.type = 'number';
        overrideInput.className = 'override-input';
        overrideInput.value = answer.human_override_score !== null ? answer.human_override_score : (answer.model_score || '');
        overrideInput.placeholder = 'New score';
        overrideCell.appendChild(overrideInput);
        
        row.insertCell(5).textContent = answer.final_score !== null ? answer.final_score : 'Pending';
        
        const actionCell = row.insertCell(6);
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.className = 'btn btn-secondary btn-sm';
        saveBtn.onclick = async () => {
            const newScore = parseFloat(overrideInput.value);
            if (isNaN(newScore)) {
                alert('Enter a valid number');
                return;
            }
            try {
                const resp = await fetch(`${API_BASE}/api/override`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ answer_id: answer.id, override_score: newScore })
                });
                const result = await resp.json();
                row.cells[5].textContent = newScore;
                alert(`✅ Grade updated to ${newScore}`);
            } catch (err) {
                alert('Override failed: ' + err.message);
            }
        };
        actionCell.appendChild(saveBtn);
    });
}

document.getElementById('export-btn')?.addEventListener('click', async () => {
    if (!currentJobId) {
        alert('Please load results first');
        return;
    }
    
    window.open(`${API_BASE}/api/jobs/${currentJobId}/export`, '_blank');
});

document.getElementById('batch-override-btn')?.addEventListener('click', async () => {
    if (!currentJobId) {
        alert('Please load results first');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/jobs/${currentJobId}/results`);
        const results = await response.json();
        
        let overridden = 0;
        for (const answer of results) {
            if (answer.is_nigerian_variation && answer.model_score !== null) {
                const newScore = Math.min(100, answer.model_score + 5);
                await fetch(`${API_BASE}/api/override`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ answer_id: answer.id, override_score: newScore })
                });
                overridden++;
            }
        }
        
        alert(`✅ Batch override complete. ${overridden} answers received +5 points.`);
        document.getElementById('load-results-btn').click();
    } catch (error) {
        alert('Batch override failed: ' + error.message);
    }
});

document.getElementById('run-evaluation-btn')?.addEventListener('click', async () => {
    const jobId = document.getElementById('eval-job-select').value;
    if (!jobId) {
        alert('Please select a completed job');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/evaluate/${jobId}`);
        const results = await response.json();
        
        document.getElementById('evaluation-results').style.display = 'block';
        
        document.getElementById('eval-qwk-all').textContent = results.qwk_all?.toFixed(4) || 'N/A';
        document.getElementById('eval-rmse-all').textContent = results.rmse_all?.toFixed(2) || 'N/A';
        document.getElementById('eval-qwk-standard').textContent = results.qwk_standard?.toFixed(4) || 'N/A';
        document.getElementById('eval-qwk-variation').textContent = results.qwk_variation?.toFixed(4) || 'N/A';
        
        const qwkAll = results.qwk_all || 0;
        const rq1Interpretation = document.getElementById('rq1-interpretation');
        
        if (qwkAll >= 0.70) {
            rq1Interpretation.innerHTML = '<strong>✓ RQ1 Answer:</strong> Model achieves substantial agreement (QWK ≥ 0.70) on Nigerian English variations.';
        } else if (qwkAll >= 0.50) {
            rq1Interpretation.innerHTML = '<strong>⚠️ RQ1 Answer:</strong> Model achieves moderate agreement (QWK between 0.50-0.70).';
        } else {
            rq1Interpretation.innerHTML = '<strong>❌ RQ1 Answer:</strong> Model shows low agreement. Consider more fine-tuning.';
        }
        
        const rq2Interpretation = document.getElementById('rq2-interpretation');
        const qwkStandard = results.qwk_standard || 0;
        const qwkVariation = results.qwk_variation || 0;
        
        if (Math.abs(qwkStandard - qwkVariation) < 0.1) {
            rq2Interpretation.innerHTML = '<strong>✓ RQ2 Answer:</strong> Model performs equally well on both standard English and Nigerian variations.';
        } else if (qwkVariation < qwkStandard) {
            rq2Interpretation.innerHTML = `<strong>⚠️ RQ2 Answer:</strong> Model performs better on standard English (${qwkStandard.toFixed(3)}) than Nigerian variations (${qwkVariation.toFixed(3)}).`;
        } else {
            rq2Interpretation.innerHTML = `<strong>✓ RQ2 Answer:</strong> Model performs slightly better on Nigerian variations (${qwkVariation.toFixed(3)}).`;
        }
    } catch (error) {
        alert('Evaluation failed: ' + error.message);
    }
});

document.getElementById('download-sample-csv')?.addEventListener('click', () => {
    const sampleData = `student_id,answer
CIT001,The CPU is the brain of the computer. It processes all instructions.
CIT002,CPU dey process all the instructions wey computer need to run.
CIT003,Central Processing Unit. It executes program instructions.
CIT004,The CPU na the component wey dey do all the thinking.
CIT005,CPU controls everything in the computer system.`;
    
    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_answers.csv';
    a.click();
    URL.revokeObjectURL(url);
});

async function loadJobs() {
    try {
        const response = await fetch(`${API_BASE}/api/jobs`);
        const jobs = await response.json();
        const container = document.getElementById('jobs-list');
        container.innerHTML = '';
        
        if (jobs.length === 0) {
            container.innerHTML = '<div class="card"><p>No jobs created yet. Go to the Create tab to get started.</p></div>';
            return;
        }
        
        jobs.forEach(job => {
            const div = document.createElement('div');
            div.className = 'job-item';
            div.innerHTML = `
                <div>
                    <strong>${job.job_name}</strong><br>
                    <small>ID: ${job.id} | Created: ${new Date(job.created_at).toLocaleString()}</small>
                </div>
                <div>
                    <span class="job-status status-${job.status}">${job.status}</span>
                    <span style="margin-left: 12px;">📊 ${job.processed_answers}/${job.total_answers}</span>
                </div>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        console.error('Failed to load jobs:', error);
    }
}

function showMessage(elementId, message, type) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = `result-message ${type}`;
    setTimeout(() => {
        el.textContent = '';
        el.className = 'result-message';
    }, 5000);
}

async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE}/api/health`);
        const data = await response.json();
        console.log('System status:', data);
    } catch (error) {
        console.error('Backend not running. Start with: cd backend && uvicorn app.main:app --reload');
    }
}

checkHealth();
loadJobsForSelect('grade-job-select');
loadJobsForSelect('review-job-select');
loadJobsForSelect('eval-job-select');
