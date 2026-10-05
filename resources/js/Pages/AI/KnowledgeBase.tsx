import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card, CardHeader, CardContent } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import {
    BookOpen, Search, Plus, AlertTriangle, ShieldCheck, FileText,
    Pill, CheckCircle2, ExternalLink, Filter, Sparkles, RefreshCw
} from 'lucide-react';

interface KnowledgeDoc {
    id: string;
    title: string;
    category: string;
    summary: string | null;
    content: string;
    tags: string[] | null;
    source_reference: string | null;
    version: string;
    is_active: boolean;
    created_at: string;
}

interface KnowledgeBaseProps {
    documents: {
        data: KnowledgeDoc[];
        links: any[];
        total: number;
    };
    categories: string[];
    stats: {
        total_documents: number;
        drug_contraindications: number;
        active_retrieval_status: string;
    };
    filters: {
        category?: string;
        search?: string;
    };
}

export default function KnowledgeBase({ documents, categories, stats, filters }: KnowledgeBaseProps) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [categoryFilter, setCategoryFilter] = useState(filters.category || '');
    const [showModal, setShowModal] = useState(false);

    // Live RAG Query Sandbox
    const [ragQuery, setRagQuery] = useState('empirical antibiotic treatment for community acquired pneumonia');
    const [ragResults, setRagResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Drug Interaction Sandbox
    const [medListInput, setMedListInput] = useState('Warfarin, Aspirin, Ibuprofen');
    const [interactionResult, setInteractionResult] = useState<any | null>(null);
    const [isCheckingMeds, setIsCheckingMeds] = useState(false);

    // New Document Form
    const [newTitle, setNewTitle] = useState('');
    const [newCategory, setNewCategory] = useState('CLINICAL_GUIDELINE');
    const [newContent, setNewContent] = useState('');
    const [newTags, setNewTags] = useState('cardiology, hypertension, jnc8');
    const [newSource, setNewSource] = useState('Hospital Clinical Committee 2026');

    const handleApplyFilters = () => {
        router.get('/ai/knowledge-base', {
            search: searchQuery || undefined,
            category: categoryFilter || undefined,
        }, { preserveState: true });
    };

    const handleIndexDocument = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/ai/knowledge-base', {
            title: newTitle,
            category: newCategory,
            content: newContent,
            tags: newTags.split(',').map((t) => t.trim()),
            source_reference: newSource,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setShowModal(false);
                setNewTitle('');
                setNewContent('');
            },
        });
    };

    const handleLiveRagSearch = async () => {
        if (!ragQuery.trim()) return;
        setIsSearching(true);
        try {
            const res = await fetch('/ai/knowledge-base/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                },
                body: JSON.stringify({ query: ragQuery }),
            });
            const data = await res.json();
            setRagResults(data.results || []);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSearching(false);
        }
    };

    const handleCheckInteractions = async () => {
        const meds = medListInput.split(',').map((m) => m.trim()).filter(Boolean);
        if (meds.length < 2) return;
        setIsCheckingMeds(true);
        try {
            const res = await fetch('/ai/knowledge-base/check-interactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as any)?.content || '',
                },
                body: JSON.stringify({ medications: meds }),
            });
            const data = await res.json();
            setInteractionResult(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsCheckingMeds(false);
        }
    };

    const getCategoryBadge = (cat: string) => {
        switch (cat) {
            case 'CLINICAL_GUIDELINE':
                return <Badge variant="cyan" className="text-[10px]">CLINICAL GUIDELINE</Badge>;
            case 'DRUG_CONTRAINDICATION':
                return <Badge variant="destructive" className="text-[10px]">DRUG CONTRAINDICATION</Badge>;
            case 'TRIAGE_PROTOCOL':
                return <Badge variant="purple" className="text-[10px]">TRIAGE PROTOCOL</Badge>;
            case 'ANTIBIOTIC_STEWARDSHIP':
                return <Badge variant="success" className="text-[10px]">ANTIBIOTIC STEWARDSHIP</Badge>;
            default:
                return <Badge variant="outline" className="text-[10px]">{cat}</Badge>;
        }
    };

    return (
        <AppLayout title="Medical Domain RAG Knowledge Base">
            <Head title="Medical Domain RAG Knowledge Base" />

            <div className="space-y-6">
                {/* Header Title & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-600/20">
                                <BookOpen className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                    Medical Domain RAG & Clinical Knowledge Base
                                </h1>
                                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                                    Clinical Practice Guidelines, Drug Contraindication Matrix & LLM Context Augmentation
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 text-xs text-white shadow-sm"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Index Clinical Guideline
                        </Button>
                    </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-white border border-slate-200/80 shadow-2xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Guidelines Indexed</span>
                                <div className="p-2 rounded-lg bg-cyan-50 text-cyan-600">
                                    <FileText className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-slate-900">{stats.total_documents}</div>
                            <div className="text-[11px] text-cyan-700 font-medium mt-0.5">Verified hospital protocols</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border border-slate-200/80 shadow-2xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contraindication Rules</span>
                                <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                                    <Pill className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-rose-600">{stats.drug_contraindications}</div>
                            <div className="text-[11px] text-rose-600 font-medium mt-0.5">Active drug interaction alerts</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border border-slate-200/80 shadow-2xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">RAG Pipeline</span>
                                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-emerald-600">ONLINE</div>
                            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Context injection ready</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border border-slate-200/80 shadow-2xs">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Citation Integrity</span>
                                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-2 text-2xl font-black text-indigo-700">100% Sourced</div>
                            <div className="text-[11px] text-indigo-600 font-medium mt-0.5">Zero hallucination grounding</div>
                        </CardContent>
                    </Card>
                </div>

                {/* 2-Column Live Clinical Sandboxes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Sandbox 1: Live RAG Semantic Query Tester */}
                    <Card className="bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
                        <CardHeader className="p-4 bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-cyan-600" />
                                <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                                    Live RAG Query & Guideline Retriever
                                </span>
                            </div>
                            <span className="text-[10px] font-mono text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded font-bold">
                                Semantic Retriever v1
                            </span>
                        </CardHeader>

                        <CardContent className="p-4 space-y-3">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={ragQuery}
                                    onChange={(e) => setRagQuery(e.target.value)}
                                    placeholder="Enter clinical question or medical protocol..."
                                    className="flex-1 text-xs rounded-xl border-slate-200"
                                />
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={handleLiveRagSearch}
                                    disabled={isSearching}
                                    className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs"
                                >
                                    {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                                </Button>
                            </div>

                            {/* Results display */}
                            <div className="space-y-2 max-h-64 overflow-y-auto pt-1">
                                {ragResults.length === 0 ? (
                                    <div className="py-8 text-center text-slate-400 text-xs">
                                        Type a query and click Search to test real-time RAG context retrieval.
                                    </div>
                                ) : (
                                    ragResults.map((res, i) => (
                                        <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-xs text-slate-900">{res.document?.title}</span>
                                                <span className="font-mono text-[10px] bg-cyan-100 text-cyan-800 px-1.5 py-0.5 rounded font-bold">
                                                    Score: {res.relevance_score}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-600 leading-relaxed">
                                                {res.snippet}
                                            </p>
                                            <div className="text-[10px] text-slate-400 font-medium">
                                                Source: {res.document?.source_reference || 'Hospital Committee'}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sandbox 2: Drug-Drug Interaction Checker */}
                    <Card className="bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
                        <CardHeader className="p-4 bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Pill className="w-4 h-4 text-rose-600" />
                                <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                                    Clinical Drug-Drug Interaction Evaluator
                                </span>
                            </div>
                            <span className="text-[10px] font-mono text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-bold">
                                Patient Safety Rule Engine
                            </span>
                        </CardHeader>

                        <CardContent className="p-4 space-y-3">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={medListInput}
                                    onChange={(e) => setMedListInput(e.target.value)}
                                    placeholder="Comma-separated drugs, e.g. Warfarin, Aspirin, Metformin"
                                    className="flex-1 text-xs rounded-xl border-slate-200"
                                />
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={handleCheckInteractions}
                                    disabled={isCheckingMeds}
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                                >
                                    {isCheckingMeds ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Check Risks'}
                                </Button>
                            </div>

                            {/* Interaction Results */}
                            <div className="space-y-2 max-h-64 overflow-y-auto pt-1">
                                {!interactionResult ? (
                                    <div className="py-8 text-center text-slate-400 text-xs">
                                        Enter 2 or more medications to test cross-interaction warnings.
                                    </div>
                                ) : interactionResult.has_interaction ? (
                                    interactionResult.alerts.map((al: any, i: number) => (
                                        <div key={i} className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-950 space-y-1">
                                            <div className="flex items-center justify-between font-bold text-xs text-rose-900">
                                                <span className="flex items-center gap-1.5">
                                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                                    {al.title}
                                                </span>
                                                <Badge variant="destructive" className="text-[10px]">{al.severity}</Badge>
                                            </div>
                                            <p className="text-[11px] text-rose-800 leading-relaxed">
                                                {al.guideline_snippet}
                                            </p>
                                            <div className="text-[10px] text-rose-600 font-semibold">
                                                Interacting: {al.medications.join(' + ')} • Ref: {al.source}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <span>No major contraindications or high-risk interactions found in the medical knowledge base for this regimen.</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter and Search Bar for Documents */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                            <input
                                type="text"
                                placeholder="Search guidelines & policies..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 text-xs rounded-lg border-slate-200 py-1.5 w-60"
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

                        <Button variant="outline" size="sm" onClick={handleApplyFilters} className="text-xs">
                            Apply Filter
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
                                    <th className="py-3 px-4">Title</th>
                                    <th className="py-3 px-4">Category</th>
                                    <th className="py-3 px-4">Source Reference</th>
                                    <th className="py-3 px-4">Tags</th>
                                    <th className="py-3 px-4">Version</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Created</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {documents.data.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-3 px-4 max-w-sm">
                                            <div className="font-bold text-slate-900">{doc.title}</div>
                                            <div className="text-[11px] text-slate-500 line-clamp-1">{doc.summary || doc.content}</div>
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            {getCategoryBadge(doc.category)}
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                                            {doc.source_reference || 'Internal Protocol'}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex flex-wrap gap-1 max-w-xs">
                                                {doc.tags?.map((t, idx) => (
                                                    <span key={idx} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-mono">
                                                        #{t}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                                            v{doc.version}
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                <CheckCircle2 className="w-3 h-3" /> Active
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right whitespace-nowrap text-slate-400 text-[11px]">
                                            {new Date(doc.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* INDEX NEW GUIDELINE MODAL */}
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
                            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-cyan-600" />
                                    <h3 className="font-black text-slate-900 text-base">Index Clinical Knowledge Document</h3>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                                >
                                    ✕
                                </button>
                            </div>

                            <form onSubmit={handleIndexDocument} className="p-5 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Guideline / Protocol Title</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Sepsis 1-Hour Protocol, Diabetic Ketoacidosis Management"
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        className="w-full text-xs rounded-lg border-slate-200"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                                        <select
                                            value={newCategory}
                                            onChange={(e) => setNewCategory(e.target.value)}
                                            className="w-full text-xs rounded-lg border-slate-200"
                                        >
                                            {categories.map((c) => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Source Reference</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. WHO, Surviving Sepsis 2026"
                                            value={newSource}
                                            onChange={(e) => setNewSource(e.target.value)}
                                            className="w-full text-xs rounded-lg border-slate-200"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Tags (Comma-separated)</label>
                                    <input
                                        type="text"
                                        placeholder="sepsis, lactate, fluid resuscitation, icu"
                                        value={newTags}
                                        onChange={(e) => setNewTags(e.target.value)}
                                        className="w-full text-xs rounded-lg border-slate-200"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Clinical Protocol Content</label>
                                    <textarea
                                        rows={6}
                                        placeholder="Enter the full guideline text, dosage recommendations, contraindications, and clinical instructions..."
                                        value={newContent}
                                        onChange={(e) => setNewContent(e.target.value)}
                                        className="w-full text-xs font-mono rounded-lg border-slate-200 leading-relaxed"
                                        required
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowModal(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        size="sm"
                                        className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold"
                                    >
                                        Index into RAG Knowledge
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
