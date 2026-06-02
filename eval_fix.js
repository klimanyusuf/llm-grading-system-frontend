
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
