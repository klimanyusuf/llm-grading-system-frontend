# LLM Grading System - Frontend

React-based web interface for the LLM-powered automatic short answer grading system.

## Features

- Create grading jobs with rubrics
- Upload student answers (CSV)
- Automated grading with Llama 3
- Review and override grades
- Export results to CSV
- Evaluation metrics (QWK, RMSE)

## Prerequisites

- Python 3.11 or higher (for local server)
- Or any static file server

## Local Setup

### Method 1: Python HTTP Server (Easiest)

```bash
# Clone the repository
git clone https://github.com/klimanyusuf/llm-grading-system-frontend.git
cd llm-grading-system-frontend

# Start a local server
python -m http.server 3000
Then open your browser to: http://localhost:3000

Method 2: Using VS Code Live Server
Install the "Live Server" extension in VS Code

Right-click on index.html

Select "Open with Live Server"

Method 3: Using Node.js
bash
npx http-server -p 3000
Configuration
The frontend expects the backend API at http://localhost:8000. To change this, update the API_BASE variable in app.js:

javascript
const API_BASE = 'http://localhost:8000';  // Change to your backend URL
Usage
Create a Job: Enter question, reference answer, and rubric

Upload CSV: Select a CSV file with student answers (columns: student_id, answer)

Start Grading: System processes each answer through Llama 3

Review Results: Table shows model scores; override any grade

Export: Download CSV of final grades

Evaluate: Run evaluation to get QWK and RMSE scores

Sample CSV Format
csv
student_id,answer
CIT001,The CPU is the brain of the computer.
CIT002,CPU dey process all instructions wey computer need.
CIT003,Central Processing Unit executes program instructions.
Live Demo
The frontend is deployed at: https://llm-grading-system-frontend.vercel.app

Backend Requirement
This frontend requires the backend API to be running. Set up the backend:

bash
git clone https://github.com/klimanyusuf/llm-grading-system-backend.git
cd llm-grading-system-backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
License
MIT
