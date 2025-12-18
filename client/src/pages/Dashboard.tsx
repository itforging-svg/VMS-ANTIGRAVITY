import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, CheckCircle, XCircle, Printer, DoorOpen, Users, Clock, FileText, Search, ChevronDown } from 'lucide-react';
import { format, subDays, subMonths, subYears } from 'date-fns';
import { API_URL } from '../config';

interface Visitor {
    id: number;
    batchNo: string;
    name: string;
    company: string;
    visitTime: string;
    purpose: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXITED';
    entryTime: string | null;
    exitTime: string | null;
    photoPath: string;
    mobile: string;
    plant: string;
}

export const Dashboard = () => {
    const { token, logout } = useAuth();
    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [showReportMenu, setShowReportMenu] = useState(false);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    const fetchVisitors = async () => {
        try {
            const res = await fetch(`${API_URL}/api/visitors`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setVisitors(data);
            setLoading(false);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchVisitors();
        const interval = setInterval(fetchVisitors, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, [token]);

    const updateStatus = async (id: number, status: string) => {
        try {
            await fetch(`${API_URL}/api/visitors/${id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });
            fetchVisitors();
        } catch (error) {
            alert('Action failed');
        }
    };

    const handlePrint = (id: number) => {
        window.open(`/print/${id}`, '_blank');
    };

    const stats = {
        today: visitors.length,
        pending: visitors.filter(v => v.status === 'PENDING').length,
        active: visitors.filter(v => v.status === 'APPROVED' && !v.exitTime).length
    };

    const filteredVisitors = visitors.filter(v =>
        v.name.toLowerCase().includes(filter.toLowerCase()) ||
        v.company.toLowerCase().includes(filter.toLowerCase()) ||
        v.batchNo.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Header */}
            <header className="bg-slate-900 text-white p-4 sticky top-0 z-50 shadow-xl border-b border-white/10">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="bg-amber-500 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-slate-900 text-lg shadow-lg shadow-amber-500/20">CS</div>
                        <div>
                            <h1 className="text-lg font-bold tracking-wide">CHANDAN STEEL LTD</h1>
                            <div className="text-xs text-slate-400 uppercase tracking-widest">
                                {useAuth().plant ? `${useAuth().plant} Plant Admin` : 'Super Admin Dashboard'}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden md:block text-right">
                            <div className="text-sm font-semibold">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}</div>
                            <div className="text-xs text-slate-400">System Active</div>
                        </div>
                        <button onClick={logout} className="bg-white/10 px-4 py-2 rounded-lg text-sm hover:bg-white/20 transition-all flex items-center gap-2">
                            <LogOut size={16} /> Logout
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-6 md:p-8">

                {/* Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Users size={64} /></div>
                        <div className="text-blue-100 text-sm font-bold uppercase tracking-wider mb-1">Total Visitors</div>
                        <div className="text-4xl font-extrabold">{stats.today}</div>
                        <div className="text-xs text-blue-100 mt-2 bg-white/20 inline-block px-2 py-1 rounded">Today's Count</div>
                    </div>

                    <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-lg shadow-amber-500/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Clock size={64} /></div>
                        <div className="text-amber-100 text-sm font-bold uppercase tracking-wider mb-1">Pending Approval</div>
                        <div className="text-4xl font-extrabold">{stats.pending}</div>
                        <div className="text-xs text-amber-100 mt-2 bg-white/20 inline-block px-2 py-1 rounded">Action Required</div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-6 text-white shadow-lg shadow-green-500/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><DoorOpen size={64} /></div>
                        <div className="text-green-100 text-sm font-bold uppercase tracking-wider mb-1">Inside Premise</div>
                        <div className="text-4xl font-extrabold">{stats.active}</div>
                        <div className="text-xs text-green-100 mt-2 bg-white/20 inline-block px-2 py-1 rounded">Checked In</div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 flex flex-col justify-center gap-3 relative">
                        <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Quick Actions</div>

                        <div className="relative">
                            <button
                                onClick={() => setShowReportMenu(!showReportMenu)}
                                className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg hover:bg-slate-700 font-medium text-sm flex items-center justify-between gap-2 transition-colors"
                            >
                                <span className="flex items-center gap-2"><FileText size={16} /> Download Report</span>
                                <ChevronDown size={16} />
                            </button>

                            {showReportMenu && (
                                <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-lg shadow-xl border border-slate-100 overflow-hidden z-20">
                                    {[
                                        { label: 'Last 7 Days', val: '7days' },
                                        { label: 'Last 15 Days', val: '15days' },
                                        { label: 'Last 30 Days', val: '1month' },
                                        { label: 'Last 3 Months', val: '3months' },
                                        { label: 'Last 6 Months', val: '6months' },
                                        { label: 'Last 1 Year', val: '1year' }
                                    ].map(opt => (
                                        <button
                                            key={opt.val}
                                            onClick={() => {
                                                setShowReportMenu(false);

                                                // Trigger Download
                                                const end = new Date();
                                                let start = new Date();
                                                switch (opt.val) {
                                                    case '7days': start = subDays(end, 7); break;
                                                    case '15days': start = subDays(end, 15); break;
                                                    case '1month': start = subMonths(end, 1); break;
                                                    case '3months': start = subMonths(end, 3); break;
                                                    case '6months': start = subMonths(end, 6); break;
                                                    case '1year': start = subYears(end, 1); break;
                                                }
                                                const f = format(start, 'yyyy-MM-dd');
                                                const t = format(end, 'yyyy-MM-dd');

                                                // Use fetch to send auth token
                                                fetch(`${API_URL}/api/reports/csv?from=${f}&to=${t}`, {
                                                    headers: { Authorization: `Bearer ${token}` }
                                                })
                                                    .then(res => {
                                                        if (!res.ok) throw new Error('Download failed');
                                                        return res.blob();
                                                    })
                                                    .then(blob => {
                                                        const url = window.URL.createObjectURL(blob);
                                                        const a = document.createElement('a');
                                                        a.href = url;
                                                        a.download = `visitor_report_${f}_to_${t}.csv`;
                                                        document.body.appendChild(a);
                                                        a.click();
                                                        window.URL.revokeObjectURL(url);
                                                        document.body.removeChild(a);
                                                    })
                                                    .catch(err => alert('Failed to download report: ' + err.message));
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 border-b border-slate-50 last:border-0"
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <h2 className="text-xl font-bold text-slate-800">Visitor Logs</h2>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search visitor..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center text-slate-400">Loading data...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold tracking-wider">
                                    <tr>
                                        <th className="p-4 pl-6">Batch / Photo</th>
                                        <th className="p-4">Visitor Details</th>
                                        <th className="p-4">Context</th>
                                        <th className="p-4">Timing</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-center">Controls</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredVisitors.map(v => (
                                        <tr key={v.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="p-4 pl-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border border-slate-200">
                                                        {v.photoPath && <img src={`${API_URL}${v.photoPath}`} className="w-full h-full object-cover" alt="user" />}
                                                    </div>
                                                    <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">{v.batchNo}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-slate-900">{v.name}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>{v.mobile}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm font-medium text-slate-700">{v.company}</div>
                                                <div className="text-xs text-slate-500">Purpose: {v.purpose}</div>
                                                <div className="text-xs font-bold text-amber-600 mt-1">Plant: {v.plant || 'N/A'}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-xs font-bold text-slate-500">IN</div>
                                                <div className="text-sm font-mono text-slate-800">{v.visitTime}</div>
                                                {v.exitTime && (
                                                    <div className="mt-1">
                                                        <div className="text-xs font-bold text-slate-400">OUT</div>
                                                        <div className="text-sm font-mono text-slate-500">{format(new Date(v.exitTime), 'HH:mm')}</div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                                                    ${v.status === 'PENDING' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                                        v.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                                            v.status === 'REJECTED' ? 'bg-red-100 text-red-700 border border-red-200' :
                                                                'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${v.status === 'PENDING' ? 'bg-amber-500 animate-pulse' : 'bg-current'}`}></span>
                                                    {v.status}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                                    {v.status === 'PENDING' && (
                                                        <>
                                                            <button onClick={() => updateStatus(v.id, 'APPROVED')} className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 hover:scale-110 transition-all shadow-sm" title="Approve">
                                                                <CheckCircle size={18} />
                                                            </button>
                                                            <button onClick={() => updateStatus(v.id, 'REJECTED')} className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 hover:scale-110 transition-all shadow-sm" title="Reject">
                                                                <XCircle size={18} />
                                                            </button>
                                                        </>
                                                    )}
                                                    {v.status === 'APPROVED' && !v.exitTime && (
                                                        <>
                                                            <button onClick={() => handlePrint(v.id)} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 hover:scale-110 transition-all shadow-sm" title="Print Slip">
                                                                <Printer size={18} />
                                                            </button>
                                                            <button onClick={() => updateStatus(v.id, 'EXITED')} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 hover:scale-110 transition-all shadow-sm" title="Mark Exit">
                                                                <DoorOpen size={18} />
                                                            </button>
                                                        </>
                                                    )}
                                                    {/* Allow reprint even after exit */}
                                                    {(v.status === 'EXITED' || v.status === 'APPROVED') && v.exitTime && (
                                                        <button onClick={() => handlePrint(v.id)} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 hover:scale-110 transition-all shadow-sm" title="Reprint Slip">
                                                            <Printer size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredVisitors.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-slate-400">
                                                <div className="flex flex-col items-center gap-2">
                                                    <FileText size={48} className="opacity-20" />
                                                    <span>No records found</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
