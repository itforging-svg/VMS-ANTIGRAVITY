import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, RefreshCw, Save, User, Building, MapPin, Briefcase, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

export const RegisterVisitor = () => {
    const webcamRef = useRef<Webcam>(null);
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        gender: 'Male',
        mobile: '',
        email: '',
        address: '',
        company: '',
        host: '',
        purpose: 'Meeting',
        assets: '',
        visitDate: new Date().toISOString().slice(0, 10),
        visitTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        duration: '1 Hour'
    });
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            setImgSrc(imageSrc);
        }
    }, [webcamRef]);

    const retake = () => setImgSrc(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setSubmitting(true);

        try {
            const data = new FormData();

            // Add photo if captured
            if (imgSrc) {
                const res = await fetch(imgSrc);
                const blob = await res.blob();
                const file = new File([blob], "visitor.jpg", { type: "image/jpeg" });
                data.append('photo', file);
            }

            // Add form data
            Object.keys(formData).forEach(key => {
                data.append(key, (formData as any)[key]);
            });

            const response = await fetch(`${API_URL}/api/visitors`, {
                method: 'POST',
                body: data
            });

            if (response.ok) {
                const result = await response.json();
                alert(`Welcome, ${result.name}. Please wait for approval.`);
                setFormData({
                    name: '', gender: 'Male', mobile: '', email: '', address: '',
                    company: '', host: '', purpose: 'Meeting', assets: '',
                    visitDate: new Date().toISOString().slice(0, 10),
                    visitTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                    duration: '1 Hour'
                });
                setImgSrc(null);
            } else {
                alert('Registration failed');
            }
        } catch (error) {
            alert('Error submitting form');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-amber-500 font-bold text-xl shadow-lg">CS</div>
                        <div>
                            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">VISITOR REGISTRATION</h1>
                            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Chandan Steel Ltd</p>
                        </div>
                    </div>
                    <button onClick={() => navigate('/login')} className="bg-white px-4 py-2 rounded-full text-xs font-bold text-slate-600 hover:bg-white/80 hover:shadow shadow-sm transition-all border border-slate-200 uppercase tracking-wider">
                        Admin Login
                    </button>
                </header>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Left Column - Photo & Instructions */}
                    <div className="lg:w-1/3 space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Live Camera Feed</h3>
                            </div>

                            <div className="aspect-[4/3] bg-slate-900 rounded-xl overflow-hidden relative shadow-inner mb-6 group">
                                {imgSrc ? (
                                    <img src={imgSrc} alt="Captured" className="w-full h-full object-cover" />
                                ) : (
                                    <Webcam
                                        audio={false}
                                        ref={webcamRef}
                                        screenshotFormat="image/jpeg"
                                        className="w-full h-full object-cover"
                                        videoConstraints={{ facingMode: "user" }}
                                    />
                                )}

                                {/* Overlay Frame */}
                                <div className="absolute inset-4 border-2 border-white/30 rounded-lg pointer-events-none">
                                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-500 rounded-tl-sm"></div>
                                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-500 rounded-tr-sm"></div>
                                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-500 rounded-bl-sm"></div>
                                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-500 rounded-br-sm"></div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                {imgSrc ? (
                                    <button onClick={retake} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors">
                                        <RefreshCw size={20} /> Retake
                                    </button>
                                ) : (
                                    <button onClick={capture} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all">
                                        <Camera size={20} /> Capture Photo
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-6 rounded-2xl shadow-lg text-white">
                            <h4 className="font-bold text-lg mb-2">Instructions</h4>
                            <ul className="space-y-2 text-amber-50 text-sm">
                                <li className="flex items-start gap-2"><ChevronRight size={16} className="mt-0.5" /> Remove cap/sunglasses before photo.</li>
                                <li className="flex items-start gap-2"><ChevronRight size={16} className="mt-0.5" /> Look directly into the camera.</li>
                                <li className="flex items-start gap-2"><ChevronRight size={16} className="mt-0.5" /> Fill all required details accurately.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Right Column - Form */}
                    <div className="lg:w-2/3">
                        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 animate-slide-up">

                            {/* Section 1 */}
                            <div className="mb-8">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6 pb-2 border-b border-slate-100">
                                    <User className="text-amber-500" /> Personal Identity
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                                        <input name="name" value={formData.name} onChange={handleChange} className="input-field" placeholder="John Doe" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Gender</label>
                                            <select name="gender" value={formData.gender} onChange={handleChange} className="input-field">
                                                <option>Male</option>
                                                <option>Female</option>
                                                <option>Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mobile</label>
                                            <input name="mobile" value={formData.mobile} onChange={handleChange} className="input-field" placeholder="9876543210" />
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email (Optional)</label>
                                        <input type="email" name="email" value={formData.email} onChange={handleChange} className="input-field" placeholder="john@example.com" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"><MapPin size={12} className="inline mr-1" />Address / Residence</label>
                                        <input name="address" value={formData.address} onChange={handleChange} className="input-field" placeholder="City, Area" />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2 */}
                            <div className="mb-8">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6 pb-2 border-b border-slate-100">
                                    <Building className="text-amber-500" /> Visit Context
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Company Name</label>
                                        <input name="company" value={formData.company} onChange={handleChange} className="input-field" placeholder="Visitor's Organisation" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Host to Visit</label>
                                        <input name="host" value={formData.host} onChange={handleChange} className="input-field" placeholder="CSL Employee Name" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"><Briefcase size={12} className="inline mr-1" />Purpose</label>
                                        <select name="purpose" value={formData.purpose} onChange={handleChange} className="input-field">
                                            <option>Meeting</option>
                                            <option>Interview</option>
                                            <option>Vendor Delivery</option>
                                            <option>Maintenance</option>
                                            <option>Audit</option>
                                            <option>Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Assets Carried</label>
                                        <select name="assets" value={formData.assets} onChange={handleChange} className="input-field">
                                            <option value="">None</option>
                                            <option>Mobile Only</option>
                                            <option>Laptop Only</option>
                                            <option>Tools / Equipment</option>
                                            <option>Other</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <button type="submit" disabled={submitting} className={`btn-primary w-full text-lg py-4 ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                <Save size={24} /> {submitting ? 'Processing...' : 'Complete Registration'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
