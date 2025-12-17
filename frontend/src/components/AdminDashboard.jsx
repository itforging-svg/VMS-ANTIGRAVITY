import React, { useEffect, useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
    const [stats, setStats] = useState({ total_today: 0, pending: 0, approved: 0, rejected: 0 });
    const [visitors, setVisitors] = useState([]);
    const [filter, setFilter] = useState({ status: 'ALL', date: '' });
    const [exportRange, setExportRange] = useState('last_7_days');
    const [printVisitor, setPrintVisitor] = useState(null);
    const navigate = useNavigate();

    const fetchData = async () => {
        try {
            const [statsRes, visitorsRes] = await Promise.all([
                api.get('/stats'),
                api.get('/visitors', { params: filter })
            ]);
            setStats(statsRes.data);
            setVisitors(visitorsRes.data);
        } catch (err) {
            if (err.response?.status === 401 || err.response?.status === 403) {
                navigate('/admin');
            }
            console.error(err);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [filter]);

    const handleStatusUpdate = async (id, newStatus) => {
        if (!confirm(`Mark visitor as ${newStatus}?`)) return;
        try {
            await api.put(`/visitors/${id}/status`, { status: newStatus });
            fetchData();
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/admin');
    };

    const handleExport = async () => {
        try {
            const response = await api.get('/export', {
                params: { range: exportRange },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `visitors_export_${exportRange}.csv`);
            document.body.appendChild(link);
            link.click();
        } catch (err) {
            alert("Export failed");
        }
    };

    const triggerPrint = () => {
        window.print();
    };

    // Format Date: DD-MM-YYYY
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = date.getFullYear();
        return `${d}-${m}-${y}`;
    };

    // Format Time: 12:00 HR AM/PM
    const formatTime = (timeString) => {
        if (!timeString) return '';
        // If it's full ISO string
        if (timeString.includes('T')) {
            return new Date(timeString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        }
        // If it's HH:mm
        const [h, m] = timeString.split(':');
        const date = new Date();
        date.setHours(h);
        date.setMinutes(m);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    return (
        <div className="container">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Admin Dashboard</h1>
                <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
            </header>

            {/* Print Preview Modal */}
            {printVisitor && (
                <div className="modal-overlay" onClick={() => setPrintVisitor(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h2>Print Preview</h2>
                            <div>
                                <button onClick={triggerPrint} className="btn btn-primary" style={{ marginRight: '1rem' }}>🖨️ Print</button>
                                <button onClick={() => setPrintVisitor(null)} className="btn btn-secondary">Close</button>
                            </div>
                        </div>

                        {/* Printable Area - Adjusted size */}
                        <div id="print-section" className="slip-preview">
                            <div className="slip-header" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderBottom: '2px solid #000', marginBottom: '15px' }}>
                                <h1 style={{ fontSize: '1.8rem', margin: '0 0 5px 0', textTransform: 'uppercase' }}>CHANDAN STEEL Ltd</h1>
                                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold' }}>VISITOR PASS</p>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
                                <div>
                                    <strong>Batch No: </strong> <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{printVisitor.batch_number}</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div><strong>Date:</strong> {formatDate(printVisitor.visit_date)}</div>
                                    <div><strong>Time:</strong> {formatTime(printVisitor.visit_time)}</div>
                                </div>
                            </div>

                            <div className="slip-body">
                                <div className="slip-row">
                                    <span className="slip-label">Visitor Name:</span>
                                    <span><strong>{printVisitor.name}</strong></span>
                                </div>
                                <div className="slip-row">
                                    <span className="slip-label">Mobile No:</span>
                                    <span>{printVisitor.mobile}</span>
                                </div>
                                <div className="slip-row">
                                    <span className="slip-label">Company:</span>
                                    <span>{printVisitor.company_name}</span>
                                </div>
                                <div className="slip-row">
                                    <span className="slip-label">From:</span>
                                    <span>{printVisitor.address || '-'}</span>
                                </div>
                                <div className="slip-row">
                                    <span className="slip-label">To Visit:</span>
                                    <span><strong>{printVisitor.whom_to_visit}</strong></span>
                                </div>
                                <div className="slip-row">
                                    <span className="slip-label">Purpose:</span>
                                    <span>{printVisitor.purpose}</span>
                                </div>
                                {/* Reduced gap after assets */}
                                <div className="slip-row" style={{ marginBottom: '5px' }}>
                                    <span className="slip-label">Assets Carried:</span>
                                    <span>{printVisitor.items_carried}</span>
                                </div>
                            </div>

                            <div style={{ marginTop: 'auto', borderTop: '1px solid #000', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ marginBottom: '30px' }}>_____________________</p>
                                    <p>Authorized Signature</p>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ marginBottom: '30px' }}>_____________________</p>
                                    <p>Security Check</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2rem' }}>
                <div className="glass-card text-center">
                    <h3>Today's Visitors</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{stats.total_today}</p>
                </div>
                <div className="glass-card text-center">
                    <h3>Pending</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'orange' }}>{stats.pending}</p>
                </div>
                <div className="glass-card text-center">
                    <h3>Approved</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'green' }}>{stats.approved}</p>
                </div>
                <div className="glass-card text-center">
                    <h3>Rejected</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'red' }}>{stats.rejected}</p>
                </div>
            </div>

            <div className="glass-card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <select value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}>
                            <option value="ALL">All Status</option>
                            <option value="PENDING">Pending</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                            <option value="EXITED">Exited</option>
                        </select>
                        <input type="date" value={filter.date} onChange={e => setFilter({ ...filter, date: e.target.value })} />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <select value={exportRange} onChange={e => setExportRange(e.target.value)}>
                            <option value="last_7_days">Last 7 Days</option>
                            <option value="last_15_days">Last 15 Days</option>
                            <option value="last_1_month">Last 1 Month</option>
                            <option value="last_3_months">Last 3 Months</option>
                            <option value="last_6_months">Last 6 Months</option>
                            <option value="last_1_year">Last 1 Year</option>
                            <option value="all">All Time</option>
                        </select>
                        <button onClick={handleExport} className="btn btn-primary">Export CSV</button>
                    </div>
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Batch #</th>
                                <th>Visitor Details</th>
                                <th>Visit Info</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visitors.length === 0 ? (
                                <tr><td colSpan="5" className="text-center">No visitors found</td></tr>
                            ) : (
                                visitors.map(v => (
                                    <tr key={v.id}>
                                        <td>
                                            <strong>{v.batch_number}</strong>
                                            <div className="text-sm text-gray">{formatDate(v.created_at)}</div>
                                        </td>
                                        <td>
                                            <strong>{v.name}</strong> ({v.gender})<br />
                                            {v.mobile}<br />
                                            <span className="text-sm text-gray">{v.company_name}</span><br />
                                            <span className="text-sm text-gray">Items: {v.items_carried}</span>
                                        </td>
                                        <td>
                                            <strong>To Visit:</strong> {v.whom_to_visit}<br />
                                            <strong>Purpose:</strong> {v.purpose}<br />
                                            <strong>Date:</strong> {formatDate(v.visit_date)}<br />
                                            <strong>Time:</strong> {formatTime(v.visit_time)}
                                        </td>
                                        <td>
                                            <span className={`badge badge-${v.status.toLowerCase()}`}>{v.status}</span>
                                            {v.exit_time && <div className="text-sm" style={{ marginTop: '0.2rem' }}>Exit: {formatTime(v.exit_time)}</div>}
                                        </td>
                                        <td>
                                            {v.status === 'PENDING' && (
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button onClick={() => handleStatusUpdate(v.id, 'APPROVED')} className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>✓ Approve</button>
                                                    <button onClick={() => handleStatusUpdate(v.id, 'REJECTED')} className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>✕ Reject</button>
                                                </div>
                                            )}
                                            {v.status === 'APPROVED' && (
                                                <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                                                    <button onClick={() => setPrintVisitor(v)} className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', backgroundColor: '#4b5563' }}>
                                                        🖨️ Print Slip
                                                    </button>
                                                    <button onClick={() => handleStatusUpdate(v.id, 'EXITED')} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: '#e2e8f0' }}>
                                                        ➜ Mark Exit
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
