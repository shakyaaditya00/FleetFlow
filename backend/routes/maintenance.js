const express = require('express');
const { pool } = require('../config/db');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// List maintenance logs (optional vehicle_id filter)
router.get('/', async (req, res) => {
  try {
    const { vehicle_id } = req.query;
    let query = `
      SELECT m.*, v.name as vehicle_name, v.license_plate
      FROM maintenance_logs m
      JOIN vehicles v ON m.vehicle_id = v.id
      WHERE 1=1`;
    const params = [];
    if (vehicle_id) { query += ' AND m.vehicle_id = $1'; params.push(vehicle_id); }
    query += ' ORDER BY m.service_date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create maintenance log - auto set vehicle status to "in_shop"
router.post('/', requireRole('manager', 'dispatcher'), async (req, res) => {
  try {
    const { vehicle_id, description, cost, service_date } = req.body;
    if (!vehicle_id || !description) {
      return res.status(400).json({ error: 'vehicle_id and description required.' });
    }
    await pool.query('UPDATE vehicles SET status = $1 WHERE id = $2', ['in_shop', vehicle_id]);
    const result = await pool.query(
      `INSERT INTO maintenance_logs (vehicle_id, description, cost, service_date, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [vehicle_id, description, cost || 0, service_date || new Date().toISOString().slice(0, 10), req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// When maintenance is "done", set vehicle back to available (via vehicle update in vehicles route)
// Frontend can PATCH vehicle status to 'available' after service complete.

module.exports = router;
