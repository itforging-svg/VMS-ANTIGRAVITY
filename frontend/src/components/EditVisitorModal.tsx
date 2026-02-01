import { useState } from 'react';
import { X } from 'lucide-react';

interface Visitor {
    id: number;
    name: string;
    company: string;
    host: string;
    purpose: string;
    assets?: string;
    safetyEquipment?: string;
    visitorCardNo?: string;
    mobile: string;
    aadharNo?: string;
}

interface EditVisitorModalProps {
    visitor: Visitor;
    onClose: () => void;
    onSave: (updatedData: Partial<Visitor>) => void;
}

export const EditVisitorModal = ({ visitor, onClose, onSave }: EditVisitorModalProps) => {
    const [formData, setFormData] = useState({
        name: visitor.name,
        company: visitor.company,
        host: visitor.host,
        purpose: visitor.purpose,
        assets: visitor.assets || '',
        safetyEquipment: visitor.safetyEquipment || '',
        visitorCardNo: visitor.visitorCardNo || '',
        mobile: visitor.mobile,
        aadharNo: (visitor as any).aadharNo || ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800">Edit Visitor Details</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Mobile</label>
                            <input
                                type="text"
                                required
                                value={formData.mobile}
                                onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                            <input
                                type="text"
                                required
                                value={formData.company}
                                onChange={e => setFormData({ ...formData, company: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Host</label>
                            <input
                                type="text"
                                required
                                value={formData.host}
                                onChange={e => setFormData({ ...formData, host: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Purpose</label>
                            <input
                                type="text"
                                required
                                value={formData.purpose}
                                onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Assets Carried</label>
                            <input
                                type="text"
                                value={formData.assets}
                                onChange={e => setFormData({ ...formData, assets: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Safety Equipment</label>
                            <input
                                type="text"
                                value={formData.safetyEquipment}
                                onChange={e => setFormData({ ...formData, safetyEquipment: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g. Helmet, Vest"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Visitor Card No</label>
                            <input
                                type="text"
                                value={formData.visitorCardNo}
                                onChange={e => setFormData({ ...formData, visitorCardNo: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Aadhar Card Number</label>
                            <input
                                type="text"
                                value={formData.aadharNo}
                                onChange={e => setFormData({ ...formData, aadharNo: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="12-digit Aadhar Number"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
