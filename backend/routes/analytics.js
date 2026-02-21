const express = require('express');
const { pool } = require('../config/db');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// Dashboard KPIs: active fleet, maintenance alerts, utilization, pending cargo
router.get('/dashboard', async (req, res) => {
  try {
    const onTrip = await pool.query("SELECT COUNT(*) as count FROM vehicles WHERE status = 'on_trip'");
    const inShop = await pool.query("SELECT COUNT(*) as count FROM vehicles WHERE status = 'in_shop'");
    const total = await pool.query('SELECT COUNT(*) as count FROM vehicles WHERE status != $1', ['out_of_service']);
    const assigned = await pool.query(
      "SELECT COUNT(*) as count FROM vehicles WHERE status IN ('on_trip', 'in_shop') AND status != 'out_of_service'"
    );
    const totalVehicles = total.rows[0].count;
    const utilization = totalVehicles > 0
      ? Math.round((assigned.rows[0].count / totalVehicles) * 100)
      : 0;
    const pendingTrips = await pool.query("SELECT COUNT(*) as count FROM trips WHERE status = 'draft'");
    res.json({
      activeFleet: parseInt(onTrip.rows[0].count, 10),
      maintenanceAlerts: parseInt(inShop.rows[0].count, 10),
      totalVehicles: parseInt(totalVehicles, 10),
      utilizationRate: utilization,
      pendingCargo: parseInt(pendingTrips.rows[0].count, 10),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Operational cost per vehicle (fuel + maintenance)
router.get('/operational-cost', requireRole('manager', 'financial_analyst'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.id, v.name, v.license_plate,
        COALESCE(SUM(f.cost), 0) as fuel_cost,
        (SELECT COALESCE(SUM(cost), 0) FROM maintenance_logs WHERE vehicle_id = v.id) as maintenance_cost,
        COALESCE(SUM(f.cost), 0) + (SELECT COALESCE(SUM(cost), 0) FROM maintenance_logs WHERE vehicle_id = v.id) as total_operational_cost
      FROM vehicles v
      LEFT JOIN fuel_logs f ON v.id = f.vehicle_id
      GROUP BY v.id, v.name, v.license_plate
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fuel efficiency (km/L) - needs trip distance; simplified: cost per vehicle
router.get('/fuel-efficiency', requireRole('manager', 'financial_analyst'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.id, v.name, v.license_plate,
        COALESCE(SUM(f.liters), 0) as total_liters,
        COALESCE(SUM(f.cost), 0) as total_fuel_cost
      FROM vehicles v
      LEFT JOIN fuel_logs f ON v.id = f.vehicle_id
      GROUP BY v.id, v.name, v.license_plate
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vehicle ROI placeholder (Revenue - (Maintenance + Fuel)) / Acquisition Cost - we don't have revenue/acquisition; return cost summary
router.get('/reports', requireRole('manager', 'financial_analyst'), async (req, res) => {
  try {
    const cost = await pool.query(`
      SELECT v.id, v.name, v.license_plate,
        (SELECT COALESCE(SUM(cost), 0) FROM fuel_logs WHERE vehicle_id = v.id) as fuel_total,
        (SELECT COALESCE(SUM(cost), 0) FROM maintenance_logs WHERE vehicle_id = v.id) as maintenance_total
      FROM vehicles v
    `);
    res.json(cost.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
