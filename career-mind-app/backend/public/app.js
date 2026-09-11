const sections = {
  upload: document.getElementById('upload-section'),
  loading: document.getElementById('loading-section'),
  dashboard: document.getElementById('dashboard-section'),
  plan: document.getElementById('plan-section'),
  interview: document.getElementById('interview-section'),
  jobs: document.getElementById('jobs-section'),
};

const stageOrder = ['upload', 'dashboard', 'plan', 'interview', 'jobs'];
const stageEls = document.querySelectorAll('.stage');
let completedStages = new Set(['upload']);

// ---------- TOASTS ----------
function toast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type === 'error' ? 'error' : ''}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 200);
  }, 4000);
}

let state = {
  cv: null,
  job: null,
  matching: null,
  skillGap: null,
  roadmap: null,
  interviewSessionId: null,
  interviewScore: null,
};

function show(name) {
  Object.values(sections).forEach((s) => s.classList.add('hidden'));
  sections[name].classList.remove('hidden');

  const idx = stageOrder.indexOf(name);
  stageEls.forEach((el, i) => {
    const stageName = stageOrder[i];
    el.classList.toggle('active', i === idx);
    el.classList.toggle('done', completedStages.has(stageName) && i !== idx);
    el.classList.toggle('clickable', completedStages.has(stageName));
  });
}

stageEls.forEach((el, i) => {
  el.addEventListener('click', () => {
    const stageName = stageOrder[i];
    if (completedStages.has(stageName)) show(stageName);
  });
});

document.querySelectorAll('.back-btn').forEach((btn) => {
  btn.addEventListener('click', () => show(btn.dataset.back));
});

// file input label + drag-and-drop
const cvFileInput = document.getElementById('cvFile');
const fileDrop = document.getElementById('fileDrop');
const fileLabel = document.getElementById('fileLabel');

function setFileLabel(file) {
  fileLabel.textContent = file ? file.name : 'Drop a PDF here, or click to browse';
  fileDrop.classList.toggle('has-file', !!file);
}

cvFileInput.addEventListener('change', () => setFileLabel(cvFileInput.files[0]));

['dragover', 'dragenter'].forEach((evt) => {
  fileDrop.addEventListener(evt, (e) => {
    e.preventDefault();
    fileDrop.classList.add('drag-over');
  });
});
['dragleave', 'dragend'].forEach((evt) => {
  fileDrop.addEventListener(evt, () => fileDrop.classList.remove('drag-over'));
});
fileDrop.addEventListener('drop', (e) => {
  e.preventDefault();
  fileDrop.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type === 'application/pdf') {
    cvFileInput.files = e.dataTransfer.files;
    setFileLabel(file);
  } else {
    toast('Only PDF files are supported.', 'error');
  }
});

// ---------- STEP 1: Analyze ----------
const loadingMessages = [
  'Reading CV...',
  'Reading job description...',
  'Comparing skills...',
  'Mapping skill gaps...',
  'Building roadmap...',
];

document.getElementById('analyzeBtn').addEventListener('click', async () => {
  const jdText = document.getElementById('jdText').value.trim();
  const errorEl = document.getElementById('uploadError');
  errorEl.textContent = '';

  if (!cvFileInput.files[0]) {
    toast('Upload your CV as a PDF first.', 'error');
    return;
  }
  if (!jdText) {
    toast('Paste the job description first.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('cvFile', cvFileInput.files[0]);
  formData.append('jdText', jdText);

  show('loading');
  let step = 0;
  const loadingText = document.getElementById('loadingText');
  const loadingInterval = setInterval(() => {
    step = (step + 1) % loadingMessages.length;
    loadingText.textContent = loadingMessages[step];
  }, 1800);

  try {
    const res = await fetch('/api/full-analysis', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');

    state.cv = data.cv;
    state.job = data.job;
    state.matching = data.matching;
    state.skillGap = data.skillGap;
    state.roadmap = data.roadmap;

    clearInterval(loadingInterval);
    completedStages.add('dashboard');
    renderDashboard();
    show('dashboard');
    toast('Analysis complete.');
  } catch (err) {
    clearInterval(loadingInterval);
    show('upload');
    toast(err.message, 'error');
  }
});

// ---------- DASHBOARD ----------
const GAUGE_CIRCUMFERENCE = 327; // 2 * PI * 52

function renderDashboard() {
  const jobMatch = state.matching.job_match_score ?? 0;
  const interviewScore = state.interviewScore;
  const readiness = interviewScore != null
    ? Math.round((jobMatch + interviewScore) / 2)
    : jobMatch;

  document.getElementById('readinessValue').textContent = `${readiness}%`;
  document.getElementById('jobMatchScore').textContent = `${jobMatch}/100`;
  document.getElementById('interviewScoreValue').textContent =
    interviewScore != null ? `${interviewScore}/100` : 'not taken';

  const offset = GAUGE_CIRCUMFERENCE - (GAUGE_CIRCUMFERENCE * readiness) / 100;
  document.getElementById('gaugeFill').style.strokeDashoffset = offset;

  const matchingList = document.getElementById('matchingSkillsList');
  matchingList.innerHTML = '';
  (state.matching.matching_skills || []).forEach((skill) => {
    const li = document.createElement('li');
    li.textContent = skill;
    matchingList.appendChild(li);
  });

  const missingList = document.getElementById('missingSkillsList');
  missingList.innerHTML = '';
  (state.matching.missing_skills || []).forEach((skill) => {
    const li = document.createElement('li');
    li.textContent = skill;
    missingList.appendChild(li);
  });
}

// ---------- CAREER PLAN ----------
document.getElementById('viewPlanBtn').addEventListener('click', () => {
  const container = document.getElementById('planWeeks');
  container.innerHTML = '';

  (state.roadmap.weeks || []).forEach((week) => {
    const block = document.createElement('div');
    block.className = 'week-block';

    const title = document.createElement('h4');
    title.textContent = `WEEK ${week.week_number} — ${week.focus}`;
    block.appendChild(title);

    const topicsList = document.createElement('ul');
    (week.topics || []).forEach((t) => {
      const li = document.createElement('li');
      li.textContent = t;
      topicsList.appendChild(li);
    });
    block.appendChild(topicsList);

    const project = document.createElement('div');
    project.className = 'project';
    project.textContent = `Project: ${week.project}`;
    block.appendChild(project);

    container.appendChild(block);
  });

  show('plan');
  completedStages.add('plan');
});

// ---------- INTERVIEW ----------
const chatWindow = document.getElementById('chatWindow');
const chatInput = document.getElementById('chatInput');
const typingIndicator = document.getElementById('typingIndicator');

function clearChat() {
  chatWindow.querySelectorAll('.msg:not(.typing)').forEach((el) => el.remove());
}

function showTyping() {
  typingIndicator.classList.remove('hidden');
  chatWindow.appendChild(typingIndicator); // keep it pinned to the bottom
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function hideTyping() {
  typingIndicator.classList.add('hidden');
}

function appendMessage(text, sender) {
  const div = document.createElement('div');
  div.className = `msg ${sender}`;
  div.textContent = text;
  chatWindow.insertBefore(div, typingIndicator);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

document.getElementById('startInterviewBtn').addEventListener('click', async () => {
  clearChat();
  document.getElementById('interviewFinal').classList.add('hidden');
  document.getElementById('chatInputRow').classList.remove('hidden');
  show('interview');
  showTyping();

  try {
    const res = await fetch('/api/interview/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cv: state.cv, job: state.job }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    state.interviewSessionId = data.sessionId;
    completedStages.add('interview');
    hideTyping();
    appendMessage(data.message, 'agent');
  } catch (err) {
    hideTyping();
    appendMessage('Error starting interview: ' + err.message, 'agent');
    toast(err.message, 'error');
  }
});

document.getElementById('sendAnswerBtn').addEventListener('click', sendAnswer);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendAnswer();
});

async function sendAnswer() {
  const text = chatInput.value.trim();
  if (!text || !state.interviewSessionId) return;

  appendMessage(text, 'user');
  chatInput.value = '';
  showTyping();

  try {
    const res = await fetch('/api/interview/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: state.interviewSessionId, message: text }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    hideTyping();
    if (data.isFinal && data.evaluation) {
      showFinalEvaluation(data.evaluation);
    } else {
      appendMessage(data.message, 'agent');
    }
  } catch (err) {
    hideTyping();
    appendMessage('Error: ' + err.message, 'agent');
    toast(err.message, 'error');
  }
}

function showFinalEvaluation(evalData) {
  document.getElementById('chatInputRow').classList.add('hidden');
  const finalSection = document.getElementById('interviewFinal');
  finalSection.classList.remove('hidden');

  state.interviewScore = evalData.overall_score;

  const container = document.getElementById('finalScores');
  container.innerHTML = `
    <div class="metric-list">
      <div class="metric-row"><span>Technical</span><span class="mono">${evalData.technical_score}</span></div>
      <div class="metric-row"><span>Communication</span><span class="mono">${evalData.communication_score}</span></div>
      <div class="metric-row"><span>Completeness</span><span class="mono">${evalData.completeness_score}</span></div>
      <div class="metric-row"><span>Overall</span><span class="mono">${evalData.overall_score}</span></div>
    </div>
    <h4 style="margin-top:16px;">Strengths</h4>
    <ul>${(evalData.strengths || []).map((s) => `<li>${s}</li>`).join('')}</ul>
    <h4>Areas to improve</h4>
    <ul>${(evalData.areas_to_improve || []).map((s) => `<li>${s}</li>`).join('')}</ul>
  `;

  renderDashboard();
}

// ---------- JOBS ----------
document.getElementById('viewJobsBtn').addEventListener('click', () => {
  const topSkill = (state.matching.matching_skills || [])[0]
    || state.job?.job_title
    || '';
  document.getElementById('jobQuery').value = state.job?.job_title || topSkill || '';
  show('jobs');
  completedStages.add('jobs');
  searchJobs();
});

document.getElementById('searchJobsBtn').addEventListener('click', searchJobs);
document.getElementById('jobQuery').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchJobs();
});

async function searchJobs() {
  const query = document.getElementById('jobQuery').value.trim();
  const listEl = document.getElementById('jobsList');
  const errorEl = document.getElementById('jobsError');
  errorEl.textContent = '';
  listEl.innerHTML = '<p class="hint">Searching...</p>';

  if (!query) {
    listEl.innerHTML = '';
    toast('Type a role to search for.', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/jobs/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Job search failed.');

    listEl.innerHTML = '';
    if (!data.jobs || data.jobs.length === 0) {
      listEl.innerHTML = '<p class="hint">No open roles found for this search.</p>';
      return;
    }

    data.jobs.forEach((job) => {
      const card = document.createElement('div');
      card.className = 'job-card';
      card.innerHTML = `
        <h4>${job.title}</h4>
        <div class="job-company">${job.company} — ${job.location}</div>
        <a href="${job.url}" target="_blank" rel="noopener">View posting →</a>
      `;
      listEl.appendChild(card);
    });
  } catch (err) {
    listEl.innerHTML = '';
    toast(err.message, 'error');
  }
}
