import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { createApi } from '../api';

export default function Drivers() {
  const { getToken } = useAuth();
  const api = createApi(getToken);
  const [list, setList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ full_name: '', license_number: '', license_expiry: '', license_category: '', status: 'off_duty', safety_score: 100 });
  const [error, setError] = useState('');

  const load = () => api.drivers.list().then(setList).catch(() => setList([]));

  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    if (editing) {
      const res = await api.drivers.update(editing.id, { ...form, safety_score: Number(form.safety_score) || 100 });
      if (res.error) setError(res.error);
      else { setEditing(null); setShowForm(false); load(); }
    } else {
      const res = await api.drivers.create(form);
      if (res.error) setError(res.error);
      else { setShowForm(false); load(); }
    }
  };

  const isExpired = (dateStr) => dateStr && new Date(dateStr) < new Date();

  return (
    <>
      <h1>Driver Performance & Safety</h1>
      <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>License expiry blocks assignment. Status: On Duty, Off Duty, Suspended.</p>

      {!showForm && !editing && <button className="btn btn-primary" onClick={() => setShowForm(true)}>Add Driver</button>}

      {(showForm || editing) && (
        <div className="card mt1">
          <h3>{editing ? 'Edit Driver' : 'New Driver'}</h3>
          <form onSubmit={save}>
            <div className="form-grid">
              <div><label>Full Name *</label><input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} required /></div>
              <div><label>License Number</label><input value={form.license_number} onChange={(e) => setForm((f) => ({ ...f, license_number: e.target.value }))} /></div>
              <div><label>License Expiry</label><input type="date" value={form.license_expiry} onChange={(e) => setForm((f) => ({ ...f, license_expiry: e.target.value }))} /></div>
              <div><label>License Category</label><input value={form.license_category} onChange={(e) => setForm((f) => ({ ...f, license_category: e.target.value }))} /></div>
              <div>
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                  <option value="on_duty">On Duty</option><option value="off_duty">Off Duty</option><option value="suspended">Suspended</option>
                </select>
              </div>
              {editing && <div><label>Safety Score</label><input type="number" min="0" max="100" value={form.safety_score} onChange={(e) => setForm((f) => ({ ...f, safety_score: e.target.value }))} /></div>}
            </div>
            {error && <p style={{ color: '#f87171' }}>{error}</p>}
            <div className="flex mt1">
              <button type="submit" className="btn btn-primary">Save</button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card mt1">
        <table>
          <thead>
            <tr><th>Name</th><th>License</th><th>Expiry</th><th>Status</th><th>Safety Score</th><th>Trips Done</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {list.map((d) => (
              <tr key={d.id}>
                <td>{d.full_name}</td>
                <td>{d.license_number}</td>
                <td style={{ color: isExpired(d.license_expiry) ? '#f87171' : '' }}>{d.license_expiry} {isExpired(d.license_expiry) && '(Expired)'}</td>
                <td><span className={`pill pill-${d.status}`}>{d.status}</span></td>
                <td>{d.safety_score}</td>
                <td>{d.trips_completed}</td>
                <td><button className="btn btn-secondary" onClick={() => { setEditing(d); setForm({ full_name: d.full_name, license_number: d.license_number || '', license_expiry: d.license_expiry || '', license_category: d.license_category || '', status: d.status, safety_score: d.safety_score }); }}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
