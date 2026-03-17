const express = require('express');
const router = express.Router();

// GET /api/countries — returns list of supported countries
router.get('/', (req, res) => {
  const countries = require('../data/countries.json');
  res.json(countries);
});

module.exports = router;
