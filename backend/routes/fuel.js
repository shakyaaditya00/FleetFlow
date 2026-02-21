const express = require('express');
const { pool } = require('../config/db');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// List fuel logs (optional vehicle_id)
router.get('/', async (req, res) => {
  try {
    const { vehicle_id } = req.query;
    let query = 'SELECT f.*, v.name as vehicle_name, v.license_plate FROM fuel_logs f JOIN vehicles v ON f.vehicle_id = v.id WHERE 1=1';
    const params = [];
    if (vehicle_id) { query += ' AND f.vehicle_id = $1'; params.push(vehicle_id); }
    query += ' ORDER BY f.fuel_date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add fuel log
router.post('/', requireRole('manager', 'dispatcher', 'financial_analyst'), async (req, res) => {
  try {
    const { vehicle_id, trip_id, liters, cost, fuel_date } = req.body;
    if (!vehicle_id || liters == null || cost == null) {
      return res.status(400).json({ error: 'vehicle_id, liters, cost required.' });
    }
    const result = await pool.query(
      `INSERT INTO fuel_logs (vehicle_id, trip_id, liters, cost, fuel_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [vehicle_id, trip_id || null, liters, cost, fuel_date || new Date().toISOString().slice(0, 10)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
