import React, { useState } from 'react';
import api from '../api';

const VisitorForm = () => {
    const [formData, setFormData] = useState({
        name: '', email: '', mobile: '', company_name: '',
        whom_to_visit: '', visit_date: '', visit_time: '',
        address: '', gender: 'Male', purpose: '', items_carried: 'None', visit_duration: ''
    });
    const [status, setStatus] = useState({ type: '', message: '', batchNumber: '' });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const validate = () => {
        if (!/^\S+@\S+\.\S+$/.test(formData.email)) return "Invalid email address";
        if (!/^\d{10}$/.test(formData.mobile)) return "Mobile number must be 10 digits";
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const error = validate();
        if (error) {
            setStatus({ type: 'error', message: error });
            return;
        }

        try {
            const res = await api.post('/visitors', formData);
            setStatus({
                type: 'success',
                message: 'Registration Successful!',
                batchNumber: res.data.batch_number
            });
            setFormData({
                name: '', email: '', mobile: '', company_name: '',
                whom_to_visit: '', visit_date: '', visit_time: '',
                address: '', gender: 'Male', purpose: '', items_carried: 'None', visit_duration: ''
            });
        } catch (err) {
            setStatus({ type: 'error', message: err.response?.data?.error || 'Registration failed' });
        }
    };

    return (
        <div className="container" style={{ maxWidth: '800px', marginTop: '2rem' }}>
            <div className="glass-card">
                <h2 className="text-center" style={{ marginBottom: '1.5rem' }}>Visitor Registration</h2>

                {status.message && (
                    <div style={{
                        padding: '1rem',
                        marginBottom: '1rem',
                        borderRadius: '8px',
                        backgroundColor: status.type === 'success' ? '#d1fae5' : '#fee2e2',
                        color: status.type === 'success' ? '#065f46' : '#991b1b',
                        border: `1px solid ${status.type === 'success' ? '#34d399' : '#f87171'}`
                    }}>
                        <strong>{status.message}</strong>
                        {status.batchNumber && (
                            <div style={{ marginTop: '0.5rem', fontSize: '1.2rem' }}>
                                Batch Number: <strong>{status.batchNumber}</strong>
                                <p className="text-sm">Please save this number for entry.</p>
                            </div>
                        )}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="grid-2">
                        <div className="form-group">
                            <label>Full Name</label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} />

                        </div>
                        <div className="form-group">
                            <label>Gender</label>
                            <select name="gender" value={formData.gender} onChange={handleChange} >

                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid-2">
                        <div className="form-group">
                            <label>Email Address</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} />

                        </div>
                        <div className="form-group">
                            <label>Mobile Number</label>
                            <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} placeholder="10 digits" />

                        </div>
                    </div>

                    <div className="form-group">
                        <label>Place of Residence / Office Address</label>
                        <input type="text" name="address" value={formData.address} onChange={handleChange} />

                    </div>

                    <div className="grid-2">
                        <div className="form-group">
                            <label>Company Name</label>
                            <input type="text" name="company_name" value={formData.company_name} onChange={handleChange} />

                        </div>
                        <div className="form-group">
                            <label>Purpose of Visit</label>
                            <input type="text" name="purpose" value={formData.purpose} onChange={handleChange} />

                        </div>
                    </div>

                    <div className="form-group">
                        <label>Whom to Visit</label>
                        <input type="text" name="whom_to_visit" value={formData.whom_to_visit} onChange={handleChange} placeholder="Employee Name / Dept" />

                    </div>

                    <div className="grid-2">
                        <div className="form-group">
                            <label>Date of Visit</label>
                            <input type="date" name="visit_date" value={formData.visit_date} onChange={handleChange} min={new Date().toISOString().split('T')[0]} />

                        </div>
                        <div className="form-group">
                            <label>Time of Visit</label>
                            <input type="time" name="visit_time" value={formData.visit_time} onChange={handleChange} />

                        </div>
                    </div>

                    <div className="grid-2">
                        <div className="form-group">
                            <label>Approx Duration</label>
                            <input type="text" name="visit_duration" value={formData.visit_duration} onChange={handleChange} placeholder="e.g. 2 hours" />

                        </div>
                        <div className="form-group">
                            <label>Allowed Assets (Laptop/Mobile/Pendrive)</label>
                            <select name="items_carried" value={formData.items_carried} onChange={handleChange} >

                                <option value="None">None</option>
                                <option value="Mobile Only">Mobile Only</option>
                                <option value="Laptop Only">Laptop Only</option>
                                <option value="Laptop & Mobile">Laptop & Mobile</option>
                                <option value="All (Laptop/Mobile/Pendrive)">All Allowed</option>
                            </select>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                        Register Visit
                    </button>
                </form>
            </div>
        </div>
    );
};

export default VisitorForm;
