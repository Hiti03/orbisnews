const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/news', require('./routes/news'));
app.use('/api/countries', require('./routes/countries'));

app.get('/', (req, res) => {
  res.json({ status: 'OrbisNews API running', version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`OrbisNews backend running on http://localhost:${PORT}`);
});
