const express = require('express');
const path = require('path');
const { PORT, FETCH_INTERVAL_MS, HISTORY_DAYS } = require('./config');
const { fetchHistorical, fetchRecent } = require('./services/alertFetcher');
const predictRouter = require('./routes/predict');
const locationsRouter = require('./routes/locations');
const analyticsRouter = require('./routes/analytics');
const weightsRouter = require('./routes/weights');
const statusRouter = require('./routes/status');

const app = express();

app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/predict', predictRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/nearest-location', (req, res, next) => {
    req.url = '/nearest' + (req.url === '/' ? '' : req.url);
    locationsRouter(req, res, next);
});
app.use('/api/analytics', analyticsRouter);
app.use('/api/weights', weightsRouter);
app.use('/api/status', statusRouter);

app.listen(PORT, () => {
    console.log(`Server starting on port ${PORT}...`);
    fetchHistorical(HISTORY_DAYS).then(() => {
        console.log('Ready — hunger model');
        setInterval(() => fetchRecent().catch(() => {}), FETCH_INTERVAL_MS);
    }).catch(e => {
        console.error('Boot failed:', e.message);
        setInterval(() => fetchRecent().catch(() => {}), FETCH_INTERVAL_MS);
    });
});

module.exports = app;
