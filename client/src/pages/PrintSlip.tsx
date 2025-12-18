import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_URL } from '../config';

interface Visitor {
    id: number;
    batchNo: string;
    name: string;
    gender: string;
    mobile: string;
    company: string;
    host: string;
    plant: string;
    visitDate: string;
    visitTime: string;
    assets: string;
    photoPath: string;
}

export const PrintSlip = () => {
    const { id } = useParams();
    const [visitor, setVisitor] = useState<Visitor | null>(null);

    useEffect(() => {
        fetch(`${API_URL}/api/visitors/${id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
            .then(res => res.json())
            .then(data => {
                setVisitor(data);
                // Auto print when loaded
                setTimeout(() => window.print(), 500);
            })
            .catch(err => console.error(err));
    }, [id]);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };

    if (!visitor) return <div>Loading...</div>;

    return (
        <div className="flex justify-center pt-5 bg-white min-h-screen">
            <style>{`
                @media print {
                    @page { size: A4; margin: 0; }
                    body { -webkit-print-color-adjust: exact; }
                }
            `}</style>

            {/* 120mm approx 450px. 1mm = 3.78px */}
            <div style={{ width: '120mm', height: '120mm' }} className="border-2 border-slate-900 p-4 relative">
                {/* Header */}
                <div className="text-center border-b-2 border-slate-900 pb-2 mb-4">
                    <h1 className="text-xl font-bold uppercase tracking-wider">Chandan Steel Ltd</h1>
                    <p className="text-xs uppercase">Visitor Pass</p>
                </div>

                <div className="flex gap-4">
                    {/* Photo */}
                    <div className="w-24 h-24 bg-gray-200 border border-slate-400 overflow-hidden">
                        <img src={`${API_URL}${visitor.photoPath}`} alt="Visitor" className="w-full h-full object-cover" />
                    </div>

                    {/* Details */}
                    <div className="flex-1 space-y-1.5">
                        <div>
                            <div className="text-xs font-bold uppercase text-slate-500">Full Name</div>
                            <div className="font-bold text-base leading-tight">{visitor.name}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <div className="text-[10px] font-bold uppercase text-slate-500">Gender</div>
                                <div className="font-semibold text-sm leading-none">{visitor.gender}</div>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold uppercase text-slate-500">Mobile</div>
                                <div className="font-mono text-sm leading-none">{visitor.mobile}</div>
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] font-bold uppercase text-slate-500">Company / From</div>
                            <div className="font-semibold text-sm leading-none">{visitor.company}</div>
                        </div>
                    </div>
                </div>

                {/* Middle Section */}
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-400 pt-2">
                    <div>
                        <div className="text-[10px] font-bold uppercase text-slate-500">Date</div>
                        <div className="font-mono text-xs">{formatDate(visitor.visitDate)}</div>
                    </div>
                    <div>
                        <div className="text-[10px] font-bold uppercase text-slate-500">Entry Time</div>
                        <div className="font-mono text-xs">{visitor.visitTime}</div>
                    </div>
                    <div>
                        <div className="text-[10px] font-bold uppercase text-slate-500">Assets</div>
                        <div className="font-semibold text-xs">{visitor.assets || 'None'}</div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-3 border-t border-slate-400 pt-2 grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-xs font-bold uppercase text-slate-500">To Visit ({visitor.plant})</div>
                        <div className="font-bold">{visitor.host}</div>
                    </div>
                    <div>
                        <div className="text-xs font-bold uppercase text-slate-500">Batch No</div>
                        <div className="font-mono text-lg font-bold">{visitor.batchNo}</div>
                    </div>
                </div>

                {/* Signatures */}
                <div className="absolute bottom-4 left-4 right-4 flex justify-between mt-6 pt-8">
                    <div className="border-t border-slate-900 w-24 text-center text-[10px] uppercase">Visitor Sign</div>
                    <div className="border-t border-slate-900 w-24 text-center text-[10px] uppercase">Auth Sign</div>
                </div>
            </div>
        </div>
    );
};
