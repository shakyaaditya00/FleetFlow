import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { createApi } from '../api';

export default function FuelExpense() {
  const { getToken } = useAuth();
  const api = createApi(getToken);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [tab, setTab] = useState('fuel');
  const [fuelForm, setFuelForm] = useState({ vehicle_id: '', trip_id: '', liters: '', cost: '', fuel_date: new Date().toISOString().slice(0, 10) });
  const [expenseForm, setExpenseForm] = useState({ vehicle_id: '', amount: '', description: '', expense_date: new Date().toISOString().slice(0, 10) });
  const [error, setError] = useState('');

  const loadFuel = () => api.fuel.list().then(setFuelLogs).catch(() => setFuelLogs([]));
  const loadExpenses = () => api.expenses.list().then(setExpenses).catch(() => setExpenses([]));
  const loadVehicles = () => api.vehicles.list().then(setVehicles).catch(() => setVehicles([]));

  useEffect(() => { loadFuel(); loadExpenses(); loadVehicles(); }, []);

  const addFuel = async (e) => {
    e.preventDefault();
    setError('');
    const res = await api.fuel.create({
      vehicle_id: Number(fuelForm.vehicle_id),
      trip_id: fuelForm.trip_id ? Number(fuelForm.trip_id) : null,
      liters: Number(fuelForm.liters),
      cost: Number(fuelForm.cost),
      fuel_date: fuelForm.fuel_date,
    });
    if (res.error) setError(res.error);
    else { setFuelForm({ vehicle_id: '', trip_id: '', liters: '', cost: '', fuel_date: new Date().toISOString().slice(0, 10) }); loadFuel(); }
  };

  const addExpense = async (e) => {
    e.preventDefault();
    setError('');
    const res = await api.expenses.create({
      vehicle_id: Number(expenseForm.vehicle_id),
      amount: Number(expenseForm.amount),
      description: expenseForm.description,
      expense_date: expenseForm.expense_date,
    });
    if (res.error) setError(res.error);
    else { setExpenseForm({ vehicle_id: '', amount: '', description: '', expense_date: new Date().toISOString().slice(0, 10) }); loadExpenses(); }
  };

  return (
    <>
      <h1>Fuel & Expense Logging</h1>
      <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>Record fuel and expenses per vehicle. Total operational cost = Fuel + Maintenance.</p>

      <div className="flex" style={{ marginBottom: '1rem' }}>
        <button className={`btn ${tab === 'fuel' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('fuel')}>Fuel Logs</button>
        <button className={`btn ${tab === 'expense' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('expense')}>Expenses</button>
      </div>

      {tab === 'fuel' && (
        <>
          <div className="card">
            <h3>Add Fuel Log</h3>
            <form onSubmit={addFuel}>
              <div className="form-grid">
                <div>
                  <label>Vehicle *</label>
                  <select value={fuelForm.vehicle_id} onChange={(e) => setFuelForm((f) => ({ ...f, vehicle_id: e.target.value }))} required>
                    <option value="">Select</option>
                    {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name} - {v.license_plate}</option>)}
                  </select>
                </div>
                <div><label>Liters *</label><input type="number" step="0.01" value={fuelForm.liters} onChange={(e) => setFuelForm((f) => ({ ...f, liters: e.target.value }))} required /></div>
                <div><label>Cost *</label><input type="number" step="0.01" value={fuelForm.cost} onChange={(e) => setFuelForm((f) => ({ ...f, cost: e.target.value }))} required /></div>
                <div><label>Date</label><input type="date" value={fuelForm.fuel_date} onChange={(e) => setFuelForm((f) => ({ ...f, fuel_date: e.target.value }))} /></div>
              </div>
              {error && <p style={{ color: '#f87171' }}>{error}</p>}
              <button type="submit" className="btn btn-primary">Add</button>
            </form>
          </div>
          <div className="card mt1">
            <table>
              <thead><tr><th>Vehicle</th><th>Liters</th><th>Cost</th><th>Date</th></tr></thead>
              <tbody>
                {fuelLogs.map((f) => (
                  <tr key={f.id}><td>{f.vehicle_name}</td><td>{f.liters}</td><td>{f.cost}</td><td>{f.fuel_date}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'expense' && (
        <>
          <div className="card">
            <h3>Add Expense</h3>
            <form onSubmit={addExpense}>
              <div className="form-grid">
                <div>
                  <label>Vehicle *</label>
                  <select value={expenseForm.vehicle_id} onChange={(e) => setExpenseForm((f) => ({ ...f, vehicle_id: e.target.value }))} required>
                    <option value="">Select</option>
                    {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div><label>Amount *</label><input type="number" step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))} required /></div>
                <div><label>Description</label><input value={expenseForm.description} onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))} /></div>
                <div><label>Date</label><input type="date" value={expenseForm.expense_date} onChange={(e) => setExpenseForm((f) => ({ ...f, expense_date: e.target.value }))} /></div>
              </div>
              {error && <p style={{ color: '#f87171' }}>{error}</p>}
              <button type="submit" className="btn btn-primary">Add</button>
            </form>
          </div>
          <div className="card mt1">
            <table>
              <thead><tr><th>Vehicle</th><th>Amount</th><th>Description</th><th>Date</th></tr></thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}><td>{e.vehicle_name}</td><td>{e.amount}</td><td>{e.description}</td><td>{e.expense_date}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
