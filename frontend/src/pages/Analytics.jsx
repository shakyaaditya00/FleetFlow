import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { createApi } from '../api';

export default function Analytics() {
  const { getToken } = useAuth();
  const api = createApi(getToken);
  const [operationalCost, setOperationalCost] = useState([]);
  const [fuelEfficiency, setFuelEfficiency] = useState([]);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    api.analytics.operationalCost().then(setOperationalCost).catch(() => setOperationalCost([]));
    api.analytics.fuelEfficiency().then(setFuelEfficiency).catch(() => setFuelEfficiency([]));
    api.analytics.reports().then(setReports).catch(() => setReports([]));
  }, []);

  const exportCsv = (data, filename) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csv = [headers.join(','), ...data.map((r) => headers.map((h) => (r[h] != null ? String(r[h]) : '').replace(/,/g, ';')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };

  return (
    <>
      <h1>Operational Analytics & Reports</h1>
      <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>Fuel efficiency, operational cost per vehicle, and exports.</p>

      <div className="card">
        <h3>Total Operational Cost (Fuel + Maintenance) per Vehicle</h3>
        <table>
          <thead>
            <tr><th>Vehicle</th><th>License</th><th>Fuel Cost</th><th>Maintenance Cost</th><th>Total</th></tr>
          </thead>
          <tbody>
            {operationalCost.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.license_plate}</td>
                <td>{Number(r.fuel_cost).toFixed(2)}</td>
                <td>{Number(r.maintenance_cost).toFixed(2)}</td>
                <td>{Number(r.total_operational_cost).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="btn btn-secondary mt1" onClick={() => exportCsv(operationalCost, 'operational-cost.csv')}>Export CSV</button>
      </div>

      <div className="card mt1">
        <h3>Fuel Summary (Liters & Cost per Vehicle)</h3>
        <table>
          <thead>
            <tr><th>Vehicle</th><th>Total Liters</th><th>Total Fuel Cost</th></tr>
          </thead>
          <tbody>
            {fuelEfficiency.map((r) => (
              <tr key={r.id}>
                <td>{r.name} ({r.license_plate})</td>
                <td>{Number(r.total_liters).toFixed(2)}</td>
                <td>{Number(r.total_fuel_cost).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="btn btn-secondary mt1" onClick={() => exportCsv(fuelEfficiency, 'fuel-efficiency.csv')}>Export CSV</button>
      </div>

      <div className="card mt1">
        <h3>Financial Report (Fuel + Maintenance by Vehicle)</h3>
        <table>
          <thead>
            <tr><th>Vehicle</th><th>License</th><th>Fuel Total</th><th>Maintenance Total</th></tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.license_plate}</td>
                <td>{Number(r.fuel_total).toFixed(2)}</td>
                <td>{Number(r.maintenance_total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="btn btn-secondary mt1" onClick={() => exportCsv(reports, 'financial-report.csv')}>Export CSV</button>
      </div>
    </>
  );
}
