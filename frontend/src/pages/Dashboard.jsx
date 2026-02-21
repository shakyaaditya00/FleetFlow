import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { createApi } from '../api';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { getToken } = useAuth();
  const api = createApi(getToken);
  const [kpis, setKpis] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [filters, setFilters] = useState({ type: '', status: '' });

  useEffect(() => {
    api.analytics.dashboard().then(setKpis).catch(() => setKpis({}));
  }, []);

  useEffect(() => {
    api.vehicles.list(filters).then(setVehicles).catch(() => setVehicles([]));
  }, [filters.type, filters.status]);

  if (!kpis) return <p>Loading dashboard...</p>;

  return (
    <>
      <h1 style={{ marginBottom: '1rem' }}>Command Center</h1>
      <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>High-level fleet oversight</p>

      <div className="grid2" style={{ marginBottom: '2rem' }}>
        <div className="kpi">
          <div className="value">{kpis.activeFleet ?? 0}</div>
          <div className="label">Active Fleet (On Trip)</div>
        </div>
        <div className="kpi">
          <div className="value">{kpis.maintenanceAlerts ?? 0}</div>
          <div className="label">Maintenance Alerts (In Shop)</div>
        </div>
        <div className="kpi">
          <div className="value">{kpis.utilizationRate ?? 0}%</div>
          <div className="label">Utilization Rate</div>
        </div>
        <div className="kpi">
          <div className="value">{kpis.pendingCargo ?? 0}</div>
          <div className="label">Pending Cargo (Draft Trips)</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Filters</h3>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          <div>
            <label>Vehicle Type</label>
            <select value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}>
              <option value="">All</option>
              <option value="truck">Truck</option>
              <option value="van">Van</option>
              <option value="bike">Bike</option>
            </select>
          </div>
          <div>
            <label>Status</label>
            <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
              <option value="">All</option>
              <option value="available">Available</option>
              <option value="on_trip">On Trip</option>
              <option value="in_shop">In Shop</option>
              <option value="out_of_service">Out of Service</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Vehicles</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>License</th>
              <th>Type</th>
              <th>Capacity (kg)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v.id}>
                <td><Link to="/vehicles">{v.name}</Link></td>
                <td>{v.license_plate}</td>
                <td>{v.vehicle_type}</td>
                <td>{v.max_capacity_kg}</td>
                <td><span className={`pill pill-${v.status}`}>{v.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
