import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { createApi } from '../api';

export default function Maintenance() {
  const { getToken } = useAuth();
  const api = createApi(getToken);
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vehicle_id: '', description: '', cost: '', service_date: new Date().toISOString().slice(0, 10) });
  const [error, setError] = useState('');

  const load = () => api.maintenance.list().then(setLogs).catch(() => setLogs([]));
  const loadVehicles = () => api.vehicles.list().then(setVehicles).catch(() => setVehicles([]));

  useEffect(() => { load(); }, []);
  useEffect(() => { if (showForm) loadVehicles(); }, [showForm]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await api.maintenance.create({
      vehicle_id: Number(form.vehicle_id),
      description: form.description,
      cost: Number(form.cost) || 0,
      service_date: form.service_date,
    });
    if (res.error) setError(res.error);
    else { setShowForm(false); setForm({ vehicle_id: '', description: '', cost: '', service_date: new Date().toISOString().slice(0, 10) }); load(); loadVehicles(); }
  };

  const setVehicleAvailable = async (vehicleId) => {
    const v = vehicles.find((x) => x.id === vehicleId);
    if (!v) return;
    await api.vehicles.update(vehicleId, { ...v, status: 'available' });
    loadVehicles();
    load();
  };

  return (
    <>
      <h1>Maintenance & Service Logs</h1>
      <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>Adding a vehicle to service sets its status to In Shop (hidden from dispatcher).</p>

      {!showForm && <button className="btn btn-primary" onClick={() => setShowForm(true)}>Add Service Log</button>}

      {showForm && (
        <div className="card mt1">
          <h3>New Service Log</h3>
          <form onSubmit={submit}>
            <div className="form-grid">
              <div>
                <label>Vehicle *</label>
                <select value={form.vehicle_id} onChange={(e) => setForm((f) => ({ ...f, vehicle_id: e.target.value }))} required>
                  <option value="">Select</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.name} - {v.license_plate}</option>
                  ))}
                </select>
              </div>
              <div><label>Description *</label><textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required rows={2} /></div>
              <div><label>Cost</label><input type="number" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} /></div>
              <div><label>Service Date</label><input type="date" value={form.service_date} onChange={(e) => setForm((f) => ({ ...f, service_date: e.target.value }))} /></div>
            </div>
            {error && <p style={{ color: '#f87171' }}>{error}</p>}
            <div className="flex mt1">
              <button type="submit" className="btn btn-primary">Add Log</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card mt1">
        <table>
          <thead>
            <tr><th>Vehicle</th><th>Description</th><th>Cost</th><th>Date</th></tr>
          </thead>
          <tbody>
            {logs.map((m) => (
              <tr key={m.id}>
                <td>{m.vehicle_name} ({m.license_plate})</td>
                <td>{m.description}</td>
                <td>{m.cost}</td>
                <td>{m.service_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
