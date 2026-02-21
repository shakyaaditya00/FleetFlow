const express = require('express');
const { pool } = require('../config/db');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// List expenses (optional vehicle_id)
router.get('/', async (req, res) => {
  try {
    const { vehicle_id } = req.query;
    let query = 'SELECT e.*, v.name as vehicle_name FROM expenses e JOIN vehicles v ON e.vehicle_id = v.id WHERE 1=1';
    const params = [];
    if (vehicle_id) { query += ' AND e.vehicle_id = $1'; params.push(vehicle_id); }
    query += ' ORDER BY e.expense_date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add expense
router.post('/', requireRole('manager', 'financial_analyst'), async (req, res) => {
  try {
    const { vehicle_id, trip_id, amount, description, expense_date } = req.body;
    if (!vehicle_id || amount == null) return res.status(400).json({ error: 'vehicle_id and amount required.' });
    const result = await pool.query(
      `INSERT INTO expenses (vehicle_id, trip_id, amount, description, expense_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [vehicle_id, trip_id || null, amount, description || null, expense_date || new Date().toISOString().slice(0, 10)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
