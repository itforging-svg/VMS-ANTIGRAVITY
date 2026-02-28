import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, RefreshCw, Save, User, Building, MapPin, Briefcase, ChevronRight, Search, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

export const RegisterVisitor = () => {
    const webcamRef = useRef<Webcam>(null);
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isSecureContext, setIsSecureContext] = useState<boolean>(true);
    const [mediaSupported, setMediaSupported] = useState<boolean>(true);
    const [diagInfo, setDiagInfo] = useState<string>('');
    const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
    const [cameraKey, setCameraKey] = useState<number>(0);
    const [useRawCamera, setUseRawCamera] = useState<boolean>(false);
    const rawVideoRef = useRef<HTMLVideoElement>(null);

    const startRawCamera = useCallback(async () => {
        if (rawVideoRef.current && useRawCamera) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true
                });
                rawVideoRef.current.srcObject = stream;
            } catch (err) {
                console.error("Raw camera error:", err);
                setCameraError(String(err));
            }
        }
    }, [selectedDeviceId, useRawCamera]);

    React.useEffect(() => {
        if (useRawCamera) {
            startRawCamera();
        }
    }, [useRawCamera, startRawCamera]);

    const runDiagnostics = useCallback(async () => {
        const secure = window.isSecureContext;
        const supported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
        setIsSecureContext(secure);
        setMediaSupported(supported);

        let info = `Secure: ${secure}, Media: ${supported}`;
        if (supported) {
            try {
                const devs = await navigator.mediaDevices.enumerateDevices();
                const vids = devs.filter(d => d.kind === 'videoinput');
                info += `, Cameras: ${vids.length}`;
                if (vids.length > 0) {
                    const current = vids.find(d => d.deviceId === selectedDeviceId) || vids[0];
                    info += ` | Active: ${current.label || 'Unknown'}`;
                }
            } catch (e) {
                info += `, EnumError: ${String(e)}`;
            }
        }
        setDiagInfo(info);
    }, [selectedDeviceId]);

    const restartCamera = () => {
        setCameraKey(prev => prev + 1);
        setCameraError(null);
        runDiagnostics();
    };

    React.useEffect(() => {
        runDiagnostics();
    }, [runDiagnostics]);

    const handleDevices = useCallback(
        (mediaDevices: MediaDeviceInfo[]) => {
            const videoDevices = mediaDevices.filter(({ kind }) => kind === "videoinput");
            setDevices(videoDevices);
            if (videoDevices.length > 0 && !selectedDeviceId) {
                // Check if any device label looks like a real camera vs virtual
                const realCamera = videoDevices.find(d => !d.label.toLowerCase().includes('virtual'));
                setSelectedDeviceId(realCamera?.deviceId || videoDevices[0].deviceId);
            }
        },
        [selectedDeviceId]
    );

    React.useEffect(() => {
        navigator.mediaDevices.enumerateDevices().then(handleDevices);
    }, [handleDevices]);

    const onUserMediaError = useCallback((error: string | DOMException) => {
        console.error("Camera error:", error);
        setCameraError(typeof error === 'string' ? error : error.message);
    }, []);

    const [formData, setFormData] = useState({
        name: '',
        gender: 'Male',
        mobile: '',
        email: '',
        address: '',
        company: '',
        host: '',
        purpose: 'Meeting',
        plant: 'Seamsless Division',
        assets: '',
        customAsset: '',
        safetyEquipment: '',
        visitorCardNo: '',
        aadharNo: '',
        visitDate: new Date().toISOString().slice(0, 10),
        visitTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        duration: '1 Hour'
    });
    const [submitting, setSubmitting] = useState(false);
    const [searching, setSearching] = useState(false);
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

        // Mandatory Field Validation
        const mandatoryFields = ['name', 'gender', 'mobile', 'address', 'company', 'host', 'aadharNo'];
        const missingFields = mandatoryFields.filter(field => !formData[field as keyof typeof formData]);

        if (missingFields.length > 0) {
            alert(`Please fill the following mandatory fields: ${missingFields.join(', ')}`);
            return;
        }

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
                if (key === 'customAsset') return;

                let value = (formData as any)[key];
                if (key === 'assets' && value === 'Other') {
                    value = formData.customAsset;
                }

                data.append(key, value);
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
                    company: '', host: '', purpose: 'Meeting', plant: 'Seamsless Division', assets: '', customAsset: '',
                    safetyEquipment: '', visitorCardNo: '', aadharNo: '',
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

    const handleSearch = async () => {
        if (!formData.mobile || formData.mobile.length < 10) {
            alert('Please enter a valid mobile number first');
            return;
        }

        setSearching(true);
        try {
            const res = await fetch(`${API_URL}/api/visitors/search?mobile=${formData.mobile}`);
            if (res.ok) {
                const data = await res.json();

                // Warn if blacklisted
                if (data.isBlacklisted) {
                    alert("⚠️ WARNING: This visitor is BLACKLISTED!");
                }

                setFormData(prev => ({
                    ...prev,
                    name: data.name || '',
                    gender: data.gender || 'Male',
                    email: data.email || '',
                    address: data.address || '',
                    company: data.company || '',
                    aadharNo: data.aadharNo || ''
                }));

                // Auto-fill photo if available
                if (data.photoPath) {
                    setImgSrc(data.photoPath.startsWith('http') ? data.photoPath : `${API_URL}${data.photoPath}`);
                }

                if (!data.isBlacklisted) {
                    alert('Welcome back! Details found and autofilled.');
                }
            } else {
                alert('No previous visitor found with this mobile number.');
            }
        } catch (error) {
            console.error(error);
            alert('Search failed');
        } finally {
            setSearching(false);
        }
    };

    const handleAadharSearch = async () => {
        if (!formData.aadharNo || formData.aadharNo.length < 12) {
            alert('Please enter a valid 12-digit Aadhar number first');
            return;
        }

        setSearching(true);
        try {
            const res = await fetch(`${API_URL}/api/visitors/search?aadhar=${formData.aadharNo}`);
            if (res.ok) {
                const data = await res.json();

                if (data.isBlacklisted) {
                    alert("⚠️ WARNING: This visitor is BLACKLISTED!");
                }

                setFormData(prev => ({
                    ...prev,
                    name: data.name || '',
                    gender: data.gender || 'Male',
                    email: data.email || '',
                    address: data.address || '',
                    company: data.company || '',
                    mobile: data.mobile || ''
                }));

                // Auto-fill photo if available
                if (data.photoPath) {
                    setImgSrc(data.photoPath.startsWith('http') ? data.photoPath : `${API_URL}${data.photoPath}`);
                }

                if (!data.isBlacklisted) {
                    alert('Welcome back! Details found and autofilled.');
                }
            } else {
                alert('No previous visitor found with this Aadhar number.');
            }
        } catch (error) {
            console.error(error);
            alert('Search failed');
        } finally {
            setSearching(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans">
            <header className="bg-[#0e2a63] text-white p-4 sticky top-0 z-50 shadow-xl border-b border-white/10 mb-8">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="CS Logo" className="h-14 w-auto object-contain bg-white/10 rounded-lg p-1" />
                        <div>
                            <h1 className="text-2xl font-extrabold text-white tracking-tight">VISITOR REGISTRATION</h1>
                            <p className="text-xs text-slate-300 uppercase tracking-widest font-semibold">Chandan Steel Ltd <span className="text-[10px] font-mono text-amber-500 opacity-50 ml-2">v2.2.dbg</span></p>
                        </div>
                    </div>
                    <button onClick={() => navigate('/login')} className="bg-white/10 px-4 py-2 rounded-full text-xs font-bold text-white hover:bg-white/20 hover:shadow shadow-sm transition-all border border-white/10 uppercase tracking-wider">
                        Admin Login
                    </button>
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-4 md:p-8">

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
                                    <div className="relative w-full h-full">
                                        <div className="absolute top-2 left-2 bg-black/50 text-[10px] text-white px-2 py-1 rounded font-mono z-30">
                                            {diagInfo || 'Init...'}
                                        </div>
                                        <Webcam
                                            key={cameraKey}
                                            audio={false}
                                            ref={webcamRef}
                                            screenshotFormat="image/jpeg"
                                            className="w-full h-full object-cover"
                                            videoConstraints={{
                                                facingMode: facingMode,
                                                deviceId: selectedDeviceId
                                            }}
                                            onUserMedia={() => setCameraError(null)}
                                            onUserMediaError={onUserMediaError}
                                        />

                                        <video
                                            ref={rawVideoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className={`absolute inset-0 w-full h-full object-cover z-20 bg-black ${useRawCamera ? 'block' : 'hidden'}`}
                                        />
                                        {cameraError && (
                                            <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center z-10">
                                                <Camera className="text-red-500 mb-4" size={48} />
                                                <p className="text-white font-bold mb-2">Camera Access Error</p>
                                                <p className="text-slate-400 text-sm mb-4">{cameraError}</p>

                                                {!isSecureContext && (
                                                    <div className="mb-4 text-xs bg-red-500/20 text-red-400 p-3 rounded border border-red-500/30">
                                                        ⚠️ This site is not running over a secure HTTPS connection. Browsers block camera access on non-secure sites.
                                                    </div>
                                                )}

                                                <div className="text-[10px] text-slate-500 mb-4 font-mono">{diagInfo}</div>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setCameraError(null);
                                                        runDiagnostics();
                                                    }}
                                                    className="bg-amber-500 text-slate-900 px-4 py-2 rounded-lg text-xs font-bold uppercase"
                                                >
                                                    Retry Connection
                                                </button>
                                            </div>
                                        )}

                                        {!mediaSupported && (
                                            <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-center z-20">
                                                <div className="w-12 h-12 border-2 border-slate-700 rounded-full flex items-center justify-center mb-4 text-slate-500 italic">!</div>
                                                <p className="text-white font-bold">Browser Not Supported</p>
                                                <p className="text-slate-400 text-xs">Your browser does not support camera access or it is disabled in settings.</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Overlay Frame */}
                                <div className="absolute inset-4 border-2 border-white/30 rounded-lg pointer-events-none">
                                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-500 rounded-tl-sm"></div>
                                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-500 rounded-tr-sm"></div>
                                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-500 rounded-bl-sm"></div>
                                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-500 rounded-br-sm"></div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                {!imgSrc && devices.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Select Camera Device</label>
                                        <select
                                            value={selectedDeviceId}
                                            onChange={(e) => setSelectedDeviceId(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-amber-500"
                                        >
                                            <option value="">Default (Auto)</option>
                                            {devices.map((device, key) => (
                                                <option key={key} value={device.deviceId}>
                                                    {device.label || `Camera ${key + 1}`}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFacingMode(prev => prev === "user" ? "environment" : "user")}
                                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-1"
                                    >
                                        <RefreshCw size={12} className={facingMode === "environment" ? "rotate-180 transition-transform" : "transition-transform"} />
                                        Switch Mode ({facingMode})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={restartCamera}
                                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-1"
                                    >
                                        <Camera size={12} />
                                        Restart Stream
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setUseRawCamera(!useRawCamera)}
                                    className="w-full bg-slate-800 text-slate-200 py-2 rounded-lg text-[10px] font-bold uppercase hover:bg-slate-700 transition-colors"
                                >
                                    {useRawCamera ? "Switch to Standard Mode" : "Debug: Force Raw Mode"}
                                </button>

                                <div className="flex gap-3">
                                    {imgSrc ? (
                                        <button type="button" onClick={retake} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors">
                                            <RefreshCw size={20} /> Retake
                                        </button>
                                    ) : (
                                        <button type="button" onClick={capture} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all">
                                            <Camera size={20} /> Capture Photo
                                        </button>
                                    )}
                                </div>
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
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name <span className="text-red-500">*</span></label>
                                        <input name="name" value={formData.name} onChange={handleChange} className="input-field" placeholder="John Doe" required />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Gender <span className="text-red-500">*</span></label>
                                            <select name="gender" value={formData.gender} onChange={handleChange} className="input-field" required>
                                                <option>Male</option>
                                                <option>Female</option>
                                                <option>Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mobile <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <input name="mobile" value={formData.mobile} onChange={handleChange} className="input-field pr-10" placeholder="9876543210" required />
                                                <button
                                                    type="button"
                                                    onClick={handleSearch}
                                                    disabled={searching}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                                                    title="Search by Mobile"
                                                >
                                                    {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Aadhar Card Number <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <input name="aadharNo" value={formData.aadharNo} onChange={handleChange} className="input-field pr-10" placeholder="12-digit Aadhar Number" required />
                                            <button
                                                type="button"
                                                onClick={handleAadharSearch}
                                                disabled={searching}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                                                title="Search by Aadhar"
                                            >
                                                {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email (Optional)</label>
                                        <input type="email" name="email" value={formData.email} onChange={handleChange} className="input-field" placeholder="john@example.com" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"><MapPin size={12} className="inline mr-1" />Address / Residence <span className="text-red-500">*</span></label>
                                        <input name="address" value={formData.address} onChange={handleChange} className="input-field" placeholder="City, Area" required />
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
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Company Name <span className="text-red-500">*</span></label>
                                        <input name="company" value={formData.company} onChange={handleChange} className="input-field" placeholder="Visitor's Organisation" required />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Host to Visit <span className="text-red-500">*</span></label>
                                        <input name="host" value={formData.host} onChange={handleChange} className="input-field" placeholder="CSL Employee Name" required />
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
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Plant to visit</label>
                                        <select name="plant" value={formData.plant} onChange={handleChange} className="input-field">
                                            <option>Seamsless Division</option>
                                            <option>Forging Division</option>
                                            <option>Main Plant</option>
                                            <option>Bright Bar</option>
                                            <option>Flat Bar</option>
                                            <option>Wire Plant</option>
                                            <option>Main Plant 2 ( SMS 2 )</option>
                                            <option>40"Inch Mill</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Assets Carried</label>
                                        <select name="assets" value={formData.assets} onChange={handleChange} className="input-field">
                                            <option value="">None</option>
                                            <option>Mobile Only</option>
                                            <option>Laptop Only</option>
                                            <option>Mobile + Laptop</option>
                                            <option>Tools / Equipment</option>
                                            <option>Other</option>
                                        </select>
                                    </div>
                                    {formData.assets === 'Other' && (
                                        <div className="animate-fade-in">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-amber-600">Specify Asset Details</label>
                                            <input
                                                name="customAsset"
                                                value={formData.customAsset}
                                                onChange={handleChange}
                                                className="input-field border-amber-200 focus:ring-amber-500"
                                                placeholder="e.g. Industrial Drill, Measurement Tools"
                                                required={formData.assets === 'Other'}
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Safety Equipment Given</label>
                                        <input
                                            name="safetyEquipment"
                                            value={formData.safetyEquipment}
                                            onChange={handleChange}
                                            className="input-field"
                                            placeholder="e.g. Helmet, Shoes, Goggles"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Visitor Card Number</label>
                                        <input
                                            name="visitorCardNo"
                                            value={formData.visitorCardNo}
                                            onChange={handleChange}
                                            className="input-field"
                                            placeholder="Enter card number"
                                        />
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
