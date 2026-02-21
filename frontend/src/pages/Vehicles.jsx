import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { createApi } from '../api';

export default function Vehicles() {
  const { getToken } = useAuth();
  const api = createApi(getToken);
  const [list, setList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', model: '', license_plate: '', vehicle_type: 'van', max_capacity_kg: '', odometer: '', region: '', status: 'available' });
  const [error, setError] = useState('');

  const load = () => api.vehicles.list().then(setList).catch(() => setList([]));

  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    const payload = { ...form, max_capacity_kg: Number(form.max_capacity_kg) || 0, odometer: Number(form.odometer) || 0 };
    if (editing) {
      const res = await api.vehicles.update(editing.id, payload);
      if (res.error) setError(res.error);
      else { setEditing(null); setShowForm(false); load(); resetForm(); }
    } else {
      const res = await api.vehicles.create(payload);
      if (res.error) setError(res.error);
      else { setShowForm(false); load(); resetForm(); }
    }
  };

  const resetForm = () => setForm({ name: '', model: '', license_plate: '', vehicle_type: 'van', max_capacity_kg: '', odometer: '', region: '', status: 'available' });

  const deleteV = async (id) => {
    if (!confirm('Delete this vehicle?')) return;
    const res = await api.vehicles.delete(id);
    if (!res.error) load();
  };

  return (
    <>
      <h1>Vehicle Registry</h1>
      <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>CRUD for fleet assets</p>

      {!showForm && !editing && (
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>Add Vehicle</button>
      )}

      {(showForm || editing) && (
        <div className="card mt1">
          <h3>{editing ? 'Edit Vehicle' : 'New Vehicle'}</h3>
          <form onSubmit={save}>
            <div className="form-grid">
              <div><label>Name *</label><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required /></div>
              <div><label>Model</label><input value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} /></div>
              <div><label>License Plate *</label><input value={form.license_plate} onChange={(e) => setForm((f) => ({ ...f, license_plate: e.target.value }))} required /></div>
              <div>
                <label>Type</label>
                <select value={form.vehicle_type} onChange={(e) => setForm((f) => ({ ...f, vehicle_type: e.target.value }))}>
                  <option value="truck">Truck</option><option value="van">Van</option><option value="bike">Bike</option>
                </select>
              </div>
              <div><label>Max Capacity (kg) *</label><input type="number" value={form.max_capacity_kg} onChange={(e) => setForm((f) => ({ ...f, max_capacity_kg: e.target.value }))} required /></div>
              <div><label>Odometer</label><input type="number" value={form.odometer} onChange={(e) => setForm((f) => ({ ...f, odometer: e.target.value }))} /></div>
              <div><label>Region</label><input value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} /></div>
              {editing && (
                <div>
                  <label>Status</label>
                  <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                    <option value="available">Available</option><option value="on_trip">On Trip</option><option value="in_shop">In Shop</option><option value="out_of_service">Out of Service</option>
                  </select>
                </div>
              )}
            </div>
            {error && <p style={{ color: '#f87171' }}>{error}</p>}
            <div className="flex mt1">
              <button type="submit" className="btn btn-primary">Save</button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditing(null); resetForm(); }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card mt1">
        <table>
          <thead>
            <tr><th>Name</th><th>License</th><th>Type</th><th>Capacity (kg)</th><th>Odometer</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {list.map((v) => (
              <tr key={v.id}>
                <td>{v.name}</td>
                <td>{v.license_plate}</td>
                <td>{v.vehicle_type}</td>
                <td>{v.max_capacity_kg}</td>
                <td>{v.odometer}</td>
                <td><span className={`pill pill-${v.status}`}>{v.status}</span></td>
                <td>
                  <button className="btn btn-secondary" style={{ marginRight: '0.25rem' }} onClick={() => { setEditing(v); setForm({ name: v.name, model: v.model || '', license_plate: v.license_plate, vehicle_type: v.vehicle_type, max_capacity_kg: v.max_capacity_kg, odometer: v.odometer || '', region: v.region || '', status: v.status }); }}>Edit</button>
                  <button className="btn btn-danger" onClick={() => deleteV(v.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
