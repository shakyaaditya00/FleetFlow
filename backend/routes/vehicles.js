const express = require('express');
const { pool } = require('../config/db');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// List vehicles (with filters)
router.get('/', async (req, res) => {
  try {
    const { type, status, region } = req.query;
    let query = 'SELECT * FROM vehicles WHERE 1=1';
    const params = [];
    let i = 1;
    if (type) { query += ` AND vehicle_type = $${i++}`; params.push(type); }
    if (status) { query += ` AND status = $${i++}`; params.push(status); }
    if (region) { query += ` AND region = $${i++}`; params.push(region); }
    query += ' ORDER BY id';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get one vehicle
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vehicles WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Vehicle not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create vehicle
router.post('/', requireRole('manager', 'dispatcher'), async (req, res) => {
  try {
    const { name, model, license_plate, vehicle_type, max_capacity_kg, odometer, region } = req.body;
    if (!name || !license_plate || !vehicle_type || max_capacity_kg == null) {
      return res.status(400).json({ error: 'name, license_plate, vehicle_type, max_capacity_kg required.' });
    }
    const result = await pool.query(
      `INSERT INTO vehicles (name, model, license_plate, vehicle_type, max_capacity_kg, odometer, region, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'available')
       RETURNING *`,
      [name, model || null, license_plate, vehicle_type, max_capacity_kg, odometer || 0, region || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'License plate already exists.' });
    res.status(500).json({ error: err.message });
  }
});

// Update vehicle (including Out of Service toggle)
router.put('/:id', requireRole('manager', 'dispatcher'), async (req, res) => {
  try {
    const { name, model, license_plate, vehicle_type, max_capacity_kg, odometer, status, region } = req.body;
    const result = await pool.query(
      `UPDATE vehicles SET
        name = COALESCE($2, name), model = COALESCE($3, model), license_plate = COALESCE($4, license_plate),
        vehicle_type = COALESCE($5, vehicle_type), max_capacity_kg = COALESCE($6, max_capacity_kg),
        odometer = COALESCE($7, odometer), status = COALESCE($8, status), region = COALESCE($9, region),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [req.params.id, name, model, license_plate, vehicle_type, max_capacity_kg, odometer, status, region]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Vehicle not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete vehicle
router.delete('/:id', requireRole('manager'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM vehicles WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Vehicle not found.' });
    res.json({ message: 'Vehicle deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
