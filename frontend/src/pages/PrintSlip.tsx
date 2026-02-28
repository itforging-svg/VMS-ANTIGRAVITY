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
    safetyEquipment: string;
    visitorCardNo: string;
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

            {/* Unified One-Box Pass - Increased Size (195mm x 139mm) */}
            <div style={{ width: '195mm', height: '139mm' }} className="border-2 border-slate-900 bg-white relative overflow-hidden flex flex-col items-center">
                <div style={{ transform: 'scale(0.81)', transformOrigin: 'top center', width: '100%', padding: '15px 25px' }}>
                    {/* Header */}
                    <div className="flex items-center justify-between border-b-2 border-slate-900 pb-1.5 mb-2.5 px-4">
                        <img src="/csl-logo-print.png" alt="CSL Logo" className="h-10 w-auto object-contain" />
                        <div className="text-center flex-1 mr-8"> {/* mr-8 to offset logo width for centering */}
                            <h1 className="text-[14px] font-bold uppercase tracking-wider">Chandan Steel Ltd</h1>
                            <p className="text-[10px] uppercase">Visitor Pass</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        {/* Photo */}
                        <div className="w-24 h-24 bg-gray-200 border border-slate-400 overflow-hidden">
                            <img src={visitor.photoPath.startsWith('http') ? visitor.photoPath : `${API_URL}${visitor.photoPath}`} alt="Visitor" className="w-full h-full object-cover" />
                        </div>

                        {/* Details */}
                        <div className="flex-1 space-y-1">
                            <div>
                                <div className="text-[10px] font-bold uppercase text-slate-500">Full Name</div>
                                <div className="text-[10px] leading-tight text-slate-900 font-bold">{visitor.name}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <div className="text-[10px] font-bold uppercase text-slate-500">Gender</div>
                                    <div className="text-[10px] leading-none text-slate-900 font-bold">{visitor.gender}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold uppercase text-slate-500">Mobile</div>
                                    <div className="text-[10px] leading-none font-mono text-slate-900 font-bold">{visitor.mobile}</div>
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold uppercase text-slate-500">Company / From</div>
                                <div className="text-[10px] leading-none text-slate-900 font-bold">{visitor.company}</div>
                            </div>
                        </div>
                    </div>

                    {/* Middle Section */}
                    <div className="mt-2 grid grid-cols-3 gap-2 border-t border-slate-300 pt-1.5 text-center text-[10px]">
                        <div>
                            <div className="font-bold uppercase text-slate-500">Date</div>
                            <div className="font-mono font-bold">{formatDate(visitor.visitDate)}</div>
                        </div>
                        <div>
                            <div className="font-bold uppercase text-slate-500">Time</div>
                            <div className="font-mono font-bold">{visitor.visitTime}</div>
                        </div>
                        <div>
                            <div className="font-bold uppercase text-slate-500">Batch No</div>
                            <div className="font-mono font-bold">{visitor.batchNo}</div>
                        </div>
                    </div>

                    <div className="mt-1.5 text-[10px] border-t border-slate-300 pt-1 text-slate-900">
                        <div className="flex justify-between">
                            <span><span className="font-bold uppercase text-slate-500">Visiting:</span> <span className="font-bold">{visitor.host} ({visitor.plant})</span></span>
                            {visitor.visitorCardNo && <span><span className="font-bold uppercase text-slate-500">Card No:</span> <span className="font-bold">{visitor.visitorCardNo}</span></span>}
                        </div>
                        <div className="mt-0.5">
                            <span className="font-bold uppercase text-slate-500">Assets:</span> <span className="font-bold">{visitor.assets || 'None'}</span>
                            {visitor.safetyEquipment && <span className="ml-4"><span className="font-bold uppercase text-slate-500">Safety Equp:</span> <span className="font-bold">{visitor.safetyEquipment}</span></span>}
                        </div>
                    </div>

                    {/* EHS guidelines */}
                    <div className="mt-2.5 pt-2.5 border-t-2 border-dashed border-slate-900">
                        <div className="text-center mb-1">
                            <h2 className="text-[10px] font-bold uppercase underline text-slate-900">EHS GUIDELINES FOR VISITORS</h2>
                        </div>

                        <ul className="text-[10px] list-decimal pl-5 space-y-0.5 text-slate-800 leading-snug">
                            <li>Safety Helmet, Safety Shoes and Safety Goggles are mandatory in Production areas. If required, additional PPEs will be provided, by the concern CSL representative whom you intend to meet.</li>
                            <li>First Aid Boxes are available in all shops/ areas.</li>
                            <li>Use designated Walkway / Gangway marked in Yellow Line/Epoxy Paint.</li>
                            <li>Use of personal Mobile phone, Camera and other electronic devices are strictly prohibited inside the Plant.</li>
                            <li>Do not enter any "Restricted Areas".</li>
                            <li>Be aware of overhead crane movements. Do not walk under the suspended loads.</li>
                            <li>Comply with "No Tobacco Policy". Consumption of any form of tobacco products are strictly prohibited within the premises.</li>
                            <li>Keep inform to the concern CSL representative about the area, you are visiting. Do not hesitate to ask for help.</li>
                            <li>Prior to leaving the premises, inform concern CSL representative, obtain a signature on gate pass & return the pass at the Security gate.</li>
                        </ul>
                    </div>

                    <div className="mt-2">
                        <h3 className="text-[10px] font-bold uppercase underline mb-0.5 text-slate-900">ACTION TO BE TAKEN IN CASE OF AN EMERGENCY</h3>
                        <p className="text-[10px] leading-snug text-slate-800 italic">
                            In case of an emergency, you will hear a continuous emergency siren. On such occasion, leave the building immediately following the nearest escape route, proceed to the nearest assembly point marked in respective plants and remain there till further instructions.
                        </p>
                    </div>

                    <div className="mt-2 pt-1 border-t border-slate-300">
                        <p className="text-[9px] italic text-slate-700 leading-snug">
                            Declaration: I have watched safety briefing video and understood EHS guidelines provided on the back of the gate pass.
                        </p>
                    </div>

                    {/* Signatures */}
                    <div className="flex justify-between items-end mt-12 px-1">
                        <div className="border-t border-slate-900 w-24 text-center text-[7px] uppercase pt-0.5 text-slate-600">Security</div>
                        <div className="border-t border-slate-900 w-24 text-center text-[7px] uppercase pt-0.5 text-slate-600">Authorized</div>
                    </div>
                </div>
            </div>
        </div>
    );
};