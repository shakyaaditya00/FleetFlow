const express = require('express');
const { pool } = require('../config/db');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// List trips
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT t.*, v.name as vehicle_name, v.license_plate, v.max_capacity_kg,
             d.full_name as driver_name
      FROM trips t
      LEFT JOIN vehicles v ON t.vehicle_id = v.id
      LEFT JOIN drivers d ON t.driver_id = d.id
      WHERE 1=1`;
    const params = [];
    if (status) { query += ' AND t.status = $1'; params.push(status); }
    query += ' ORDER BY t.id DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get one trip
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, v.name as vehicle_name, v.license_plate, v.max_capacity_kg, d.full_name as driver_name
       FROM trips t LEFT JOIN vehicles v ON t.vehicle_id = v.id LEFT JOIN drivers d ON t.driver_id = d.id
       WHERE t.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Trip not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create trip (validation: cargo_weight <= max_capacity, vehicle available, driver can assign)
router.post('/', requireRole('manager', 'dispatcher'), async (req, res) => {
  try {
    const { vehicle_id, driver_id, cargo_weight_kg, origin, destination } = req.body;
    if (!vehicle_id || !driver_id || cargo_weight_kg == null) {
      return res.status(400).json({ error: 'vehicle_id, driver_id, cargo_weight_kg required.' });
    }
    const vehicle = await pool.query('SELECT * FROM vehicles WHERE id = $1', [vehicle_id]);
    if (vehicle.rows.length === 0) return res.status(404).json({ error: 'Vehicle not found.' });
    const v = vehicle.rows[0];
    if (v.status !== 'available' && v.status !== 'on_trip') {
      return res.status(400).json({ error: 'Vehicle is not available for assignment (check status: available).' });
    }
    if (Number(cargo_weight_kg) > Number(v.max_capacity_kg)) {
      return res.status(400).json({ error: `Cargo weight (${cargo_weight_kg} kg) exceeds vehicle max capacity (${v.max_capacity_kg} kg).` });
    }
    const driver = await pool.query('SELECT * FROM drivers WHERE id = $1', [driver_id]);
    if (driver.rows.length === 0) return res.status(404).json({ error: 'Driver not found.' });
    const d = driver.rows[0];
    if (d.status === 'suspended') return res.status(400).json({ error: 'Driver is suspended.' });
    if (d.license_expiry && new Date(d.license_expiry) < new Date()) {
      return res.status(400).json({ error: 'Driver license has expired.' });
    }
    const result = await pool.query(
      `INSERT INTO trips (vehicle_id, driver_id, cargo_weight_kg, origin, destination, status, created_by)
       VALUES ($1, $2, $3, $4, $5, 'draft', $6) RETURNING *`,
      [vehicle_id, driver_id, cargo_weight_kg, origin || null, destination || null, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update trip status (draft -> dispatched -> completed/cancelled)
router.patch('/:id/status', requireRole('manager', 'dispatcher'), async (req, res) => {
  try {
    const { status, end_odometer } = req.body;
    if (!status) return res.status(400).json({ error: 'status required.' });
    const trip = await pool.query('SELECT * FROM trips WHERE id = $1', [req.params.id]);
    if (trip.rows.length === 0) return res.status(404).json({ error: 'Trip not found.' });
    const t = trip.rows[0];
    if (status === 'dispatched') {
      await pool.query('UPDATE vehicles SET status = $1 WHERE id = $2', ['on_trip', t.vehicle_id]);
      await pool.query('UPDATE drivers SET status = $1 WHERE id = $2', ['on_duty', t.driver_id]);
    } else if (status === 'completed' || status === 'cancelled') {
      await pool.query('UPDATE vehicles SET status = $1, odometer = COALESCE($2, odometer) WHERE id = $3',
        ['available', end_odometer || null, t.vehicle_id]);
      await pool.query('UPDATE drivers SET status = $1, trips_completed = trips_completed + CASE WHEN $2 = $3 THEN 1 ELSE 0 END WHERE id = $4',
        ['off_duty', status, 'completed', t.driver_id]);
    }
    const result = await pool.query(
      `UPDATE trips SET status = $1, end_odometer = COALESCE($2, end_odometer), completed_at = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END WHERE id = $3 RETURNING *`,
      [status, end_odometer, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update trip (general)
router.put('/:id', requireRole('manager', 'dispatcher'), async (req, res) => {
  try {
    const { vehicle_id, driver_id, cargo_weight_kg, origin, destination, start_odometer, end_odometer } = req.body;
    const result = await pool.query(
      `UPDATE trips SET
        vehicle_id = COALESCE($2, vehicle_id), driver_id = COALESCE($3, driver_id),
        cargo_weight_kg = COALESCE($4, cargo_weight_kg), origin = COALESCE($5, origin),
        destination = COALESCE($6, destination), start_odometer = COALESCE($7, start_odometer),
        end_odometer = COALESCE($8, end_odometer)
       WHERE id = $1 RETURNING *`,
      [req.params.id, vehicle_id, driver_id, cargo_weight_kg, origin, destination, start_odometer, end_odometer]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Trip not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
