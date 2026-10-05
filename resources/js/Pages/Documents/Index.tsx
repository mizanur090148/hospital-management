import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card, CardHeader, CardContent } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import {
    FolderLock, UploadCloud, Download, CheckCircle2, ShieldCheck,
    Search, Filter, FileText, Lock, Link as LinkIcon, AlertCircle,
    User, HardDrive, Check, Copy, ExternalLink, ShieldAlert
} from 'lucide-react';

interface Patient {
    id: string;
    first_name: string;
    last_name: string;
    mrn: string;
}

interface ClinicalDocument {
    id: string;
    document_number: string;
    title: string;
    category: string;
    file_name: string;
    mime_type: string;
    file_size_bytes: number;
    storage_disk: string;
    checksum_sha256: string;
    is_confidential: boolean;
    created_at: string;
    patient?: {
        id: string;
        first_name: string;
        last_name: string;
        mrn: string;
    };
    uploaded_by_user?: {
        id: string;
        name: string;
    };
}

interface DocumentsProps {
    documents: {
        data: ClinicalDocument[];
        links: any[];
        total: number;
        current_page: number;
        last_page: number;
    };
    stats: {
        total_documents: number;
        total_storage_mb: number;
        category_breakdown: Record<string, number>;
    };
    patients: Patient[];
    categories: string[];
    filters: {
        category?: string;
        search?: string;
    };
}

export default function DocumentsIndex({ documents, stats, patients, categories, filters }: DocumentsProps) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [categoryFilter, setCategoryFilter] = useState(filters.category || '');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [presignedUrlData, setPresignedUrlData] = useState<{ docNumber: string; url: string } | null>(null);
    const [checksumResult, setChecksumResult] = useState<{ docNumber: string; checksum: string; isValid: boolean; message: string } | null>(null);
    const [copiedUrl, setCopiedUrl] = useState(false);

    // Upload Form State
    const [uploadTitle, setUploadTitle] = useState('');
    const [uploadCategory, setUploadCategory] = useState('LAB_REPORT');
    const [uploadPatientId, setUploadPatientId] = useState('');
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [isConfidential, setIsConfidential] = useState(true);

    const handleFilter = () => {
        router.get('/documents', {
            search: searchQuery || undefined,
            category: categoryFilter || undefined,
        }, { preserveState: true });
    };

    const handleUpload = (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadFile) return;

        const formData = new FormData();
        formData.append('title', uploadTitle);
        formData.append('category', uploadCategory);
        if (uploadPatientId) formData.append('patient_id', uploadPatientId);
        formData.append('file', uploadFile);
        formData.append('is_confidential', isConfidential ? '1' : '0');

        router.post('/documents', formData, {
            preserveScroll: true,
            onSuccess: () => {
                setShowUploadModal(false);
                setUploadTitle('');
                setUploadFile(null);
                setUploadPatientId('');
            },
        });
    };

    const handleGetPresignedUrl = async (doc: ClinicalDocument) => {
        try {
            const res = await fetch(`/documents/${doc.id}/temporary-url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                },
            });
            const data = await res.json();
            if (data.temporary_url) {
                setPresignedUrlData({
                    docNumber: doc.document_number,
                    url: data.temporary_url,
                });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleVerifyChecksum = async (doc: ClinicalDocument) => {
        try {
            const res = await fetch(`/documents/${doc.id}/verify-checksum`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                },
            });
            const data = await res.json();
            setChecksumResult({
                docNumber: doc.document_number,
                checksum: data.stored_checksum,
                isValid: data.is_valid,
                message: data.message,
            });
        } catch (err) {
            console.error(err);
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getCategoryBadge = (cat: string) => {
        switch (cat) {
            case 'LAB_REPORT':
                return <Badge variant="cyan" className="text-[10px]">LAB REPORT</Badge>;
            case 'RADIOLOGY_SCAN':
                return <Badge variant="purple" className="text-[10px]">RADIOLOGY</Badge>;
            case 'PATIENT_CONSENT':
                return <Badge variant="success" className="text-[10px]">CONSENT FORM</Badge>;
            case 'DISCHARGE_SUMMARY':
                return <Badge variant="warning" className="text-[10px]">DISCHARGE</Badge>;
            case 'CLINICAL_NOTE':
                return <Badge variant="neutral" className="text-[10px]">CLINICAL NOTE</Badge>;
            default:
                return <Badge variant="outline" className="text-[10px]">{cat}</Badge>;
        }
    };

    return (
        <AppLayout title="Clinical Document Vault & Attachments">
            <Head title="Clinical Document Vault & Attachments" />

            <div className="space-y-6">
                {/* Header Title & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-600 text-white shadow-md shadow-cyan-600/20">
                                <FolderLock className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                    Secure Clinical Document Vault
                                </h1>
                                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                                    HIPAA-Compliant Encrypted Medical Storage, SHA-256 Checksums & Presigned Temporary Access
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setShowUploadModal(true)}
                            className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-xs text-white shadow-sm"
                        >
                            <UploadCloud className="w-3.5 h-3.5" />
                            Upload Medical Document
                        </Button>
                    </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-white border border-slate-200/80 shadow-2xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Documents</span>
                                <div className="p-2 rounded-lg bg-cyan-50 text-cyan-600">
                                    <FileText className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-slate-900">{stats.total_documents}</div>
                            <div className="text-[11px] text-cyan-700 font-medium mt-0.5">Encrypted clinical files</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border border-slate-200/80 shadow-2xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vault Storage</span>
                                <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
                                    <HardDrive className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-slate-900">{stats.total_storage_mb} MB</div>
                            <div className="text-[11px] text-teal-600 font-medium mt-0.5">Active disk footprint</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border border-slate-200/80 shadow-2xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Data Integrity</span>
                                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-emerald-600">SHA-256</div>
                            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Cryptographic checksummed</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border border-slate-200/80 shadow-2xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">HIPAA Audit</span>
                                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                                    <Lock className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-blue-600">100% Logged</div>
                            <div className="text-[11px] text-blue-600 font-medium mt-0.5">Every view audit-trailed</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter and Search Bar */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                            <input
                                type="text"
                                placeholder="Search by Document #, Title or File..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 text-xs rounded-lg border-slate-200 py-1.5 w-64"
                            />
                        </div>

                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="text-xs rounded-lg border-slate-200 py-1.5"
                        >
                            <option value="">All Categories</option>
                            {categories.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>

                        <Button variant="outline" size="sm" onClick={handleFilter} className="text-xs">
                            Apply Search
                        </Button>
                    </div>

                    <div className="text-xs text-slate-500 font-medium">
                        Showing {documents.data.length} of {documents.total} documents
                    </div>
                </div>

                {/* Documents Table */}
                <Card className="bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-700">
                            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4">Doc Number</th>
                                    <th className="py-3 px-4">Document Title</th>
                                    <th className="py-3 px-4">Category</th>
                                    <th className="py-3 px-4">Patient (MRN)</th>
                                    <th className="py-3 px-4">Size & Mime</th>
                                    <th className="py-3 px-4">SHA-256 Checksum</th>
                                    <th className="py-3 px-4">Uploaded</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {documents.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-slate-400">
                                            No clinical documents found. Upload a new document to start the secure vault.
                                        </td>
                                    </tr>
                                ) : (
                                    documents.data.map((doc) => (
                                        <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                                                {doc.document_number}
                                            </td>
                                            <td className="py-3 px-4 max-w-xs">
                                                <div className="font-semibold text-slate-900 truncate">{doc.title}</div>
                                                <div className="text-[11px] text-slate-400 font-mono truncate">{doc.file_name}</div>
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                {getCategoryBadge(doc.category)}
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                {doc.patient ? (
                                                    <div>
                                                        <div className="font-semibold text-slate-900">
                                                            {doc.patient.first_name} {doc.patient.last_name}
                                                        </div>
                                                        <div className="text-[10px] text-cyan-700 font-mono">
                                                            {doc.patient.mrn}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic">General Facility</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                <div className="font-semibold text-slate-800">{formatBytes(doc.file_size_bytes)}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">{doc.mime_type}</div>
                                            </td>
                                            <td className="py-3 px-4 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                                                <button
                                                    onClick={() => handleVerifyChecksum(doc)}
                                                    className="group flex items-center gap-1 hover:text-cyan-700 transition-colors"
                                                    title="Click to cryptographically verify checksum"
                                                >
                                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                                    <span>{doc.checksum_sha256.substring(0, 12)}...</span>
                                                </button>
                                            </td>
                                            <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                                                {new Date(doc.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                                                <a
                                                    href={`/documents/${doc.id}/download`}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-cyan-50 text-cyan-700 hover:bg-cyan-100 transition-colors"
                                                    title="Download with HIPAA Audit Trail"
                                                >
                                                    <Download className="w-3 h-3" /> Download
                                                </a>
                                                <button
                                                    onClick={() => handleGetPresignedUrl(doc)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                                                    title="Generate Presigned URL"
                                                >
                                                    <LinkIcon className="w-3 h-3" /> Presigned URL
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* UPLOAD MODAL */}
                {showUploadModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
                            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <UploadCloud className="w-5 h-5 text-cyan-600" />
                                    <h3 className="font-black text-slate-900 text-base">Upload Secure Medical Document</h3>
                                </div>
                                <button
                                    onClick={() => setShowUploadModal(false)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                                >
                                    ✕
                                </button>
                            </div>

                            <form onSubmit={handleUpload} className="p-5 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Document Title</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Chest X-Ray Scan AP View, Comprehensive Metabolic Panel"
                                        value={uploadTitle}
                                        onChange={(e) => setUploadTitle(e.target.value)}
                                        className="w-full text-xs rounded-lg border-slate-200"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                                        <select
                                            value={uploadCategory}
                                            onChange={(e) => setUploadCategory(e.target.value)}
                                            className="w-full text-xs rounded-lg border-slate-200"
                                        >
                                            {categories.map((c) => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Associate Patient</label>
                                        <select
                                            value={uploadPatientId}
                                            onChange={(e) => setUploadPatientId(e.target.value)}
                                            className="w-full text-xs rounded-lg border-slate-200"
                                        >
                                            <option value="">No Patient (Facility Level)</option>
                                            {patients.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.first_name} {p.last_name} ({p.mrn})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Document File (Max 20MB)</label>
                                    <input
                                        type="file"
                                        onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                                        className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100 border border-slate-200 rounded-lg p-1"
                                        required
                                    />
                                </div>

                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
                                    <input
                                        type="checkbox"
                                        checked={isConfidential}
                                        onChange={(e) => setIsConfidential(e.target.checked)}
                                        className="rounded text-cyan-600 border-slate-300"
                                    />
                                    Mark as Confidential (HIPAA Protected Health Information)
                                </label>

                                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowUploadModal(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        size="sm"
                                        className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-bold"
                                    >
                                        Encrypt & Vault Document
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* PRESIGNED URL MODAL */}
                {presignedUrlData && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
                            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <LinkIcon className="w-5 h-5 text-cyan-600" />
                                    <div>
                                        <h3 className="font-black text-slate-900 text-base">Presigned Temporary Download URL</h3>
                                        <p className="text-[11px] text-slate-400 font-mono">{presignedUrlData.docNumber}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setPresignedUrlData(null); setCopiedUrl(false); }}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="p-5 space-y-4">
                                <div className="p-3 bg-cyan-50 rounded-xl border border-cyan-200 text-xs text-cyan-900 leading-relaxed">
                                    <span className="font-bold block mb-0.5">🔒 Time-Limited Signed URL (Expires in 15 Minutes)</span>
                                    This cryptographically signed URL grants temporary authorized download access for external EMR integration or patient transmission.
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Temporary Signed URL</label>
                                    <textarea
                                        readOnly
                                        rows={3}
                                        value={presignedUrlData.url}
                                        className="w-full text-[11px] font-mono rounded-lg border-slate-200 bg-slate-50 text-slate-700"
                                    />
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(presignedUrlData.url);
                                            setCopiedUrl(true);
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 text-white hover:bg-cyan-700 transition-colors"
                                    >
                                        {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copiedUrl ? 'Copied to Clipboard!' : 'Copy URL'}
                                    </button>

                                    <a
                                        href={presignedUrlData.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:underline"
                                    >
                                        Open Link <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* CHECKSUM VERIFICATION RESULT MODAL */}
                {checksumResult && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
                            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {checksumResult.isValid ? (
                                        <ShieldCheck className="w-6 h-6 text-emerald-600" />
                                    ) : (
                                        <ShieldAlert className="w-6 h-6 text-rose-600 animate-pulse" />
                                    )}
                                    <div>
                                        <h3 className="font-black text-slate-900 text-base">Cryptographic Checksum Verification</h3>
                                        <p className="text-[11px] text-slate-400 font-mono">{checksumResult.docNumber}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setChecksumResult(null)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="p-5 space-y-4">
                                <div className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                                    checksumResult.isValid
                                        ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                        : 'bg-rose-50 text-rose-900 border-rose-200'
                                }`}>
                                    <div className="font-bold mb-1 flex items-center gap-1.5">
                                        {checksumResult.isValid ? 'Authenticity Confirmed (100% Match)' : 'Integrity Failure Detected'}
                                    </div>
                                    <p>{checksumResult.message}</p>
                                </div>

                                <div className="p-3 bg-slate-900 rounded-xl text-slate-300 font-mono text-[11px] space-y-1">
                                    <span className="text-slate-400 block text-[10px] uppercase">Stored SHA-256 Checksum:</span>
                                    <span className="text-cyan-300 break-all">{checksumResult.checksum}</span>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button variant="outline" size="sm" onClick={() => setChecksumResult(null)}>
                                        Dismiss
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
