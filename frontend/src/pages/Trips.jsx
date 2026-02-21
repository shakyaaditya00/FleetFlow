import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { createApi } from '../api';

export default function Trips() {
  const { getToken } = useAuth();
  const api = createApi(getToken);
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vehicle_id: '', driver_id: '', cargo_weight_kg: '', origin: '', destination: '' });
  const [error, setError] = useState('');
  const [statusModal, setStatusModal] = useState(null);

  const loadTrips = () => api.trips.list().then(setTrips).catch(() => setTrips([]));
  const loadVehicles = () => api.vehicles.list({ status: 'available' }).then(setVehicles).catch(() => setVehicles([]));
  const loadDrivers = () => api.drivers.list().then(setDrivers).catch(() => setDrivers([]));

  useEffect(() => { loadTrips(); }, []);
  useEffect(() => { if (showForm) { loadVehicles(); loadDrivers(); } }, [showForm]);

  const createTrip = async (e) => {
    e.preventDefault();
    setError('');
    const res = await api.trips.create({
      vehicle_id: Number(form.vehicle_id),
      driver_id: Number(form.driver_id),
      cargo_weight_kg: Number(form.cargo_weight_kg),
      origin: form.origin || null,
      destination: form.destination || null,
    });
    if (res.error) setError(res.error);
    else { setShowForm(false); setForm({ vehicle_id: '', driver_id: '', cargo_weight_kg: '', origin: '', destination: '' }); loadTrips(); loadVehicles(); loadDrivers(); }
  };

  const updateStatus = async (tripId, status, end_odometer) => {
    const res = await api.trips.updateStatus(tripId, status, end_odometer ? Number(end_odometer) : undefined);
    if (!res.error) { setStatusModal(null); loadTrips(); loadVehicles(); loadDrivers(); }
  };

  return (
    <>
      <h1>Trip Dispatcher & Management</h1>
      <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>Create trips, assign vehicle + driver. Cargo weight must not exceed vehicle capacity.</p>

      {!showForm && <button className="btn btn-primary" onClick={() => setShowForm(true)}>Create Trip</button>}

      {showForm && (
        <div className="card mt1">
          <h3>New Trip</h3>
          <form onSubmit={createTrip}>
            <div className="form-grid">
              <div>
                <label>Vehicle *</label>
                <select value={form.vehicle_id} onChange={(e) => setForm((f) => ({ ...f, vehicle_id: e.target.value }))} required>
                  <option value="">Select</option>
                  {vehicles.filter((v) => v.status === 'available').map((v) => (
                    <option key={v.id} value={v.id}>{v.name} - {v.license_plate} (max {v.max_capacity_kg} kg)</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Driver *</label>
                <select value={form.driver_id} onChange={(e) => setForm((f) => ({ ...f, driver_id: e.target.value }))} required>
                  <option value="">Select</option>
                  {drivers.filter((d) => d.status !== 'suspended' && (!d.license_expiry || new Date(d.license_expiry) >= new Date())).map((d) => (
                    <option key={d.id} value={d.id}>{d.full_name} ({d.status})</option>
                  ))}
                </select>
              </div>
              <div><label>Cargo Weight (kg) *</label><input type="number" value={form.cargo_weight_kg} onChange={(e) => setForm((f) => ({ ...f, cargo_weight_kg: e.target.value }))} required /></div>
              <div><label>Origin</label><input value={form.origin} onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value }))} /></div>
              <div><label>Destination</label><input value={form.destination} onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))} /></div>
            </div>
            {error && <p style={{ color: '#f87171' }}>{error}</p>}
            <div className="flex mt1">
              <button type="submit" className="btn btn-primary">Create</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card mt1">
        <table>
          <thead>
            <tr><th>ID</th><th>Vehicle</th><th>Driver</th><th>Cargo (kg)</th><th>Origin → Dest</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {trips.map((t) => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td>{t.vehicle_name} ({t.license_plate})</td>
                <td>{t.driver_name}</td>
                <td>{t.cargo_weight_kg}</td>
                <td>{t.origin} → {t.destination}</td>
                <td><span className={`pill pill-${t.status}`}>{t.status}</span></td>
                <td>
                  {t.status === 'draft' && <button className="btn btn-success" onClick={() => updateStatus(t.id, 'dispatched')}>Dispatch</button>}
                  {t.status === 'dispatched' && (
                    <button className="btn btn-primary" onClick={() => setStatusModal({ trip: t, action: 'complete' })}>Complete</button>
                  )}
                  {(t.status === 'draft' || t.status === 'dispatched') && (
                    <button className="btn btn-danger" style={{ marginLeft: '0.25rem' }} onClick={() => updateStatus(t.id, 'cancelled')}>Cancel</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {statusModal && statusModal.action === 'complete' && (
        <div className="modal-overlay" onClick={() => setStatusModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Complete Trip</h3>
            <label>End Odometer</label>
            <input type="number" id="end_odo" placeholder="Optional" />
            <div className="flex mt1">
              <button className="btn btn-success" onClick={() => updateStatus(statusModal.trip.id, 'completed', document.getElementById('end_odo')?.value)}>Mark Completed</button>
              <button className="btn btn-secondary" onClick={() => setStatusModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
