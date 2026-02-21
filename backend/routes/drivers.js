const express = require('express');
const { pool } = require('../config/db');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// List drivers
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM drivers WHERE 1=1';
    const params = [];
    if (status) { query += ' AND status = $1'; params.push(status); }
    query += ' ORDER BY id';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get one driver
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM drivers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Driver not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create driver
router.post('/', requireRole('manager', 'safety_officer'), async (req, res) => {
  try {
    const { full_name, license_number, license_expiry, license_category, status } = req.body;
    if (!full_name) return res.status(400).json({ error: 'full_name required.' });
    const result = await pool.query(
      `INSERT INTO drivers (full_name, license_number, license_expiry, license_category, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [full_name, license_number || null, license_expiry || null, license_category || null, status || 'off_duty']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update driver (status, safety score, etc.)
router.put('/:id', requireRole('manager', 'safety_officer'), async (req, res) => {
  try {
    const { full_name, license_number, license_expiry, license_category, status, safety_score } = req.body;
    const result = await pool.query(
      `UPDATE drivers SET
        full_name = COALESCE($2, full_name), license_number = COALESCE($3, license_number),
        license_expiry = COALESCE($4, license_expiry), license_category = COALESCE($5, license_category),
        status = COALESCE($6, status), safety_score = COALESCE($7, safety_score),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [req.params.id, full_name, license_number, license_expiry, license_category, status, safety_score]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Driver not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check if driver can be assigned (license valid, not suspended)
router.get('/:id/can-assign', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM drivers WHERE id = $1', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Driver not found.' });
    const d = r.rows[0];
    const expired = d.license_expiry && new Date(d.license_expiry) < new Date();
    const canAssign = d.status !== 'suspended' && !expired;
    res.json({ canAssign, licenseExpired: expired, status: d.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
