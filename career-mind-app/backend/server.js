require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const analyzeRoutes = require('./routes/analyze');
const interviewRoutes = require('./routes/interview');
const jobsRoutes = require('./routes/jobs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.use('/api', analyzeRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/jobs', jobsRoutes);

// Serve the frontend
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`CareerMind AI running at http://localhost:${PORT}`);
});
