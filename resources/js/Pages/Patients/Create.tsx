import React, { useState, useMemo } from 'react';
import { useForm, Link } from '@inertiajs/react';
import {
    UserPlus, ArrowLeft, ShieldCheck, HeartPulse, AlertTriangle,
    Phone, Mail, MapPin, UserCheck, Calendar, Activity,
    Plus, Trash2, CheckCircle2, Sparkles, FileText, ChevronRight,
    IdCard, ShieldAlert, Heart
} from 'lucide-react';
import { AppLayout } from '@/Layouts/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/Components/ui/Card';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';

interface PatientsCreateProps {
    bloodGroups: string[];
    genders: string[];
    nextMrn: string;
}

export default function PatientsCreate({ bloodGroups, genders, nextMrn }: PatientsCreateProps) {
    const [redirectToDossier, setRedirectToDossier] = useState(true);

    const { data, setData, post, processing, errors } = useForm({
        first_name: '',
        last_name: '',
        dob: '',
        gender: 'MALE' as 'MALE' | 'FEMALE' | 'OTHER',
        blood_group: 'UNKNOWN',
        phone: '',
        email: '',
        national_id: '',
        emergency_contact: {
            name: '',
            relationship: '',
            phone: '',
        },
        address: {
            street: '',
            city: '',
            state: '',
            postal_code: '',
            country: 'USA',
        },
        allergies: [] as Array<{ substance: string; severity: string; reaction: string }>,
        chronic_conditions: [] as Array<{ condition: string; diagnosed_year: string; notes: string }>,
        redirect_to_dossier: true,
    });

    // Dynamic Age Calculation
    const calculatedAge = useMemo(() => {
        if (!data.dob) return null;
        const birthDate = new Date(data.dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age >= 0 ? age : null;
    }, [data.dob]);

    // Form Completion Calculation
    const completionScore = useMemo(() => {
        let score = 0;
        if (data.first_name) score += 15;
        if (data.last_name) score += 15;
        if (data.dob) score += 15;
        if (data.phone) score += 20;
        if (data.blood_group && data.blood_group !== 'UNKNOWN') score += 10;
        if (data.email) score += 10;
        if (data.emergency_contact.name && data.emergency_contact.phone) score += 15;
        return Math.min(score, 100);
    }, [data]);

    // Allergies Handlers
    const addAllergy = () => {
        setData('allergies', [
            ...data.allergies,
            { substance: '', severity: 'Mild', reaction: '' },
        ]);
    };

    const removeAllergy = (index: number) => {
        setData('allergies', data.allergies.filter((_, i) => i !== index));
    };

    // Chronic Conditions Handlers
    const addChronicCondition = () => {
        setData('chronic_conditions', [
            ...data.chronic_conditions,
            { condition: '', diagnosed_year: new Date().getFullYear().toString(), notes: '' },
        ]);
    };

    const removeChronicCondition = (index: number) => {
        setData('chronic_conditions', data.chronic_conditions.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent, openDossier: boolean) => {
        e.preventDefault();
        setData('redirect_to_dossier', openDossier);
        post(route('patients.store'));
    };

    return (
        <AppLayout title="Register New Patient">
            <div className="max-w-7xl mx-auto space-y-6 pb-16">
                {/* Breadcrumbs & Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                            <Link
                                href={route('patients.index')}
                                className="hover:text-cyan-600 transition-colors flex items-center gap-1"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Patient Master Registry
                            </Link>
                            <ChevronRight className="w-3 h-3 text-slate-400" />
                            <span className="text-cyan-700">New Registration</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                                Register New Patient
                            </h1>
                            <Badge variant="cyan" className="font-mono text-xs px-2.5 py-1 font-semibold">
                                <Sparkles className="w-3 h-3 text-cyan-600" />
                                Allocating {nextMrn}
                            </Badge>
                        </div>
                        <p className="text-sm text-slate-500">
                            Enterprise Master Patient Index (EMPI) enrollment with automated sequential MRN allocation and HIPAA baseline profiling.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link href={route('patients.index')}>
                            <Button variant="outline" size="md">
                                Cancel
                            </Button>
                        </Link>
                        <Button
                            variant="primary"
                            size="md"
                            isLoading={processing}
                            onClick={(e) => handleSubmit(e, true)}
                            className="shadow-sm shadow-cyan-600/30"
                        >
                            <UserCheck className="w-4 h-4 mr-1.5" />
                            Register & Open Dossier
                        </Button>
                    </div>
                </div>

                {/* Has Errors Banner */}
                {Object.keys(errors).length > 0 && (
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3 animate-fadeIn">
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-rose-900">Please correct the highlighted fields:</h4>
                            <ul className="list-disc list-inside mt-1 space-y-0.5 text-xs text-rose-700">
                                {Object.values(errors).map((err, i) => (
                                    <li key={i}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Main Form Fields (8 Columns) */}
                    <div className="lg:col-span-8 space-y-6">
                        <form onSubmit={(e) => handleSubmit(e, redirectToDossier)} className="space-y-6">
                            {/* Section 1: Demographics & Identity */}
                            <Card className="shadow-xs border-slate-200">
                                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 rounded-lg bg-cyan-100/70 text-cyan-700">
                                                <UserPlus className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base font-bold text-slate-900">
                                                    1. Demographics & Identification
                                                </CardTitle>
                                                <CardDescription>
                                                    Primary patient credentials required for sequential MRN assignment.
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <Badge variant="cyan" className="font-medium">Mandatory</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 space-y-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                                                First Name <span className="text-rose-500">*</span>
                                            </label>
                                            <Input
                                                value={data.first_name}
                                                onChange={(e) => setData('first_name', e.target.value)}
                                                placeholder="e.g. Alexander"
                                                error={errors.first_name}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                                                Last Name <span className="text-rose-500">*</span>
                                            </label>
                                            <Input
                                                value={data.last_name}
                                                onChange={(e) => setData('last_name', e.target.value)}
                                                placeholder="e.g. Fleming"
                                                error={errors.last_name}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                                                    Date of Birth <span className="text-rose-500">*</span>
                                                </label>
                                                {calculatedAge !== null && (
                                                    <span className="text-xs font-semibold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200/60">
                                                        {calculatedAge} yrs old
                                                    </span>
                                                )}
                                            </div>
                                            <Input
                                                type="date"
                                                value={data.dob}
                                                onChange={(e) => setData('dob', e.target.value)}
                                                max={new Date().toISOString().split('T')[0]}
                                                error={errors.dob}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                                                Gender <span className="text-rose-500">*</span>
                                            </label>
                                            <select
                                                value={data.gender}
                                                onChange={(e) => setData('gender', e.target.value as any)}
                                                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 shadow-2xs"
                                                required
                                            >
                                                <option value="MALE">Male</option>
                                                <option value="FEMALE">Female</option>
                                                <option value="OTHER">Other / Non-Binary</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                                                Blood Group
                                            </label>
                                            <select
                                                value={data.blood_group}
                                                onChange={(e) => setData('blood_group', e.target.value)}
                                                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 shadow-2xs"
                                            >
                                                <option value="UNKNOWN">Select Blood Group</option>
                                                {bloodGroups.map((bg) => (
                                                    <option key={bg} value={bg}>{bg}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                                                National ID / Passport / SSN
                                            </label>
                                            <Input
                                                leftIcon={<IdCard className="w-4 h-4" />}
                                                value={data.national_id}
                                                onChange={(e) => setData('national_id', e.target.value)}
                                                placeholder="e.g. NID-987654321 or Passport #"
                                                error={errors.national_id}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Section 2: Contact Information & Address */}
                            <Card className="shadow-xs border-slate-200">
                                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-indigo-100/70 text-indigo-700">
                                            <Phone className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-bold text-slate-900">
                                                2. Contact Coordinates & Residence
                                            </CardTitle>
                                            <CardDescription>
                                                Direct phone for SMS notifications and physical residential address.
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 space-y-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                                                Primary Phone Number <span className="text-rose-500">*</span>
                                            </label>
                                            <Input
                                                leftIcon={<Phone className="w-4 h-4" />}
                                                value={data.phone}
                                                onChange={(e) => setData('phone', e.target.value)}
                                                placeholder="+1 (555) 019-2834"
                                                error={errors.phone}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                                                Email Address
                                            </label>
                                            <Input
                                                leftIcon={<Mail className="w-4 h-4" />}
                                                type="email"
                                                value={data.email}
                                                onChange={(e) => setData('email', e.target.value)}
                                                placeholder="patient.name@example.com"
                                                error={errors.email}
                                            />
                                        </div>
                                    </div>

                                    {/* Address Details */}
                                    <div className="space-y-4 pt-2">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                            Residential Address
                                        </h4>
                                        <div>
                                            <Input
                                                placeholder="Street Address (e.g. 742 Evergreen Terrace)"
                                                value={data.address.street}
                                                onChange={(e) => setData('address', { ...data.address, street: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <div>
                                                <Input
                                                    placeholder="City"
                                                    value={data.address.city}
                                                    onChange={(e) => setData('address', { ...data.address, city: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <Input
                                                    placeholder="State / Region"
                                                    value={data.address.state}
                                                    onChange={(e) => setData('address', { ...data.address, state: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <Input
                                                    placeholder="Postal Code"
                                                    value={data.address.postal_code}
                                                    onChange={(e) => setData('address', { ...data.address, postal_code: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <Input
                                                    placeholder="Country"
                                                    value={data.address.country}
                                                    onChange={(e) => setData('address', { ...data.address, country: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Section 3: Emergency Contact */}
                            <Card className="shadow-xs border-slate-200">
                                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-amber-100/70 text-amber-700">
                                            <ShieldAlert className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-bold text-slate-900">
                                                3. Emergency Contact & Next of Kin
                                            </CardTitle>
                                            <CardDescription>
                                                Designated relative or surrogate in the event of clinical emergencies.
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                                                Contact Full Name
                                            </label>
                                            <Input
                                                placeholder="e.g. Mary Fleming"
                                                value={data.emergency_contact.name}
                                                onChange={(e) => setData('emergency_contact', { ...data.emergency_contact, name: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                                                Relationship
                                            </label>
                                            <Input
                                                placeholder="e.g. Spouse / Parent / Sibling"
                                                value={data.emergency_contact.relationship}
                                                onChange={(e) => setData('emergency_contact', { ...data.emergency_contact, relationship: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                                                Emergency Phone
                                            </label>
                                            <Input
                                                leftIcon={<Phone className="w-4 h-4" />}
                                                placeholder="+1 (555) 999-8877"
                                                value={data.emergency_contact.phone}
                                                onChange={(e) => setData('emergency_contact', { ...data.emergency_contact, phone: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Section 4: Clinical History (Allergies & Chronic Conditions) */}
                            <Card className="shadow-xs border-slate-200">
                                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-rose-100/70 text-rose-700">
                                            <HeartPulse className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-bold text-slate-900">
                                                4. Clinical Risk Alerts & Medical History
                                            </CardTitle>
                                            <CardDescription>
                                                Drug allergies, environmental sensitivities, and pre-existing chronic conditions.
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    {/* Allergies Sub-builder */}
                                    <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/70 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                                                    Known Allergies ({data.allergies.length})
                                                </h4>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={addAllergy}
                                                className="bg-white text-amber-800 border-amber-200 hover:bg-amber-100/50"
                                            >
                                                <Plus className="w-3.5 h-3.5 mr-1" />
                                                Add Allergy
                                            </Button>
                                        </div>

                                        {data.allergies.length === 0 ? (
                                            <p className="text-xs text-amber-700/80 italic">
                                                No known drug or environmental allergies logged. Click "+ Add Allergy" if patient has documented reactions.
                                            </p>
                                        ) : (
                                            <div className="space-y-2.5">
                                                {data.allergies.map((allergy, index) => (
                                                    <div key={index} className="flex flex-col sm:flex-row items-center gap-2 bg-white p-2.5 rounded-lg border border-amber-200/80 shadow-2xs">
                                                        <Input
                                                            placeholder="Substance (e.g. Penicillin, Peanuts, Sulfa)"
                                                            value={allergy.substance}
                                                            onChange={(e) => {
                                                                const updated = [...data.allergies];
                                                                updated[index].substance = e.target.value;
                                                                setData('allergies', updated);
                                                            }}
                                                            className="flex-1"
                                                            required
                                                        />
                                                        <select
                                                            value={allergy.severity}
                                                            onChange={(e) => {
                                                                const updated = [...data.allergies];
                                                                updated[index].severity = e.target.value;
                                                                setData('allergies', updated);
                                                            }}
                                                            className="px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                                        >
                                                            <option value="Mild">Mild</option>
                                                            <option value="Moderate">Moderate</option>
                                                            <option value="Severe">Severe</option>
                                                            <option value="Severe / Anaphylactic">Severe / Anaphylactic</option>
                                                        </select>
                                                        <Input
                                                            placeholder="Observed Reaction (e.g. Hives, Angioedema)"
                                                            value={allergy.reaction}
                                                            onChange={(e) => {
                                                                const updated = [...data.allergies];
                                                                updated[index].reaction = e.target.value;
                                                                setData('allergies', updated);
                                                            }}
                                                            className="flex-1"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeAllergy(index)}
                                                            className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                                                            title="Remove Allergy"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Chronic Conditions Sub-builder */}
                                    <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Activity className="w-4 h-4 text-cyan-600" />
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                                    Chronic Medical Conditions ({data.chronic_conditions.length})
                                                </h4>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={addChronicCondition}
                                                className="bg-white text-slate-800 border-slate-200 hover:bg-slate-100"
                                            >
                                                <Plus className="w-3.5 h-3.5 mr-1" />
                                                Add Condition
                                            </Button>
                                        </div>

                                        {data.chronic_conditions.length === 0 ? (
                                            <p className="text-xs text-slate-500 italic">
                                                No chronic health history recorded (e.g. Hypertension, Diabetes Mellitus). Click "+ Add Condition" to record.
                                            </p>
                                        ) : (
                                            <div className="space-y-2.5">
                                                {data.chronic_conditions.map((condition, index) => (
                                                    <div key={index} className="flex flex-col sm:flex-row items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                                                        <Input
                                                            placeholder="Condition (e.g. Essential Hypertension)"
                                                            value={condition.condition}
                                                            onChange={(e) => {
                                                                const updated = [...data.chronic_conditions];
                                                                updated[index].condition = e.target.value;
                                                                setData('chronic_conditions', updated);
                                                            }}
                                                            className="flex-2"
                                                            required
                                                        />
                                                        <Input
                                                            type="number"
                                                            placeholder="Year (e.g. 2021)"
                                                            value={condition.diagnosed_year}
                                                            onChange={(e) => {
                                                                const updated = [...data.chronic_conditions];
                                                                updated[index].diagnosed_year = e.target.value;
                                                                setData('chronic_conditions', updated);
                                                            }}
                                                            className="w-full sm:w-28"
                                                        />
                                                        <Input
                                                            placeholder="Clinical Notes / Staging"
                                                            value={condition.notes}
                                                            onChange={(e) => {
                                                                const updated = [...data.chronic_conditions];
                                                                updated[index].notes = e.target.value;
                                                                setData('chronic_conditions', updated);
                                                            }}
                                                            className="flex-1"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeChronicCondition(index)}
                                                            className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                                                            title="Remove Condition"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-6">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="redirectDossier"
                                            checked={redirectToDossier}
                                            onChange={(e) => setRedirectToDossier(e.target.checked)}
                                            className="w-4 h-4 text-cyan-600 rounded-sm border-slate-300 focus:ring-cyan-500"
                                        />
                                        <label htmlFor="redirectDossier" className="text-xs font-medium text-slate-700 cursor-pointer">
                                            Open 360° Comprehensive Dossier immediately after enrollment
                                        </label>
                                    </div>

                                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                        <Link href={route('patients.index')}>
                                            <Button type="button" variant="outline" size="md">
                                                Cancel
                                            </Button>
                                        </Link>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="md"
                                            isLoading={processing}
                                            onClick={(e) => handleSubmit(e, false)}
                                        >
                                            Save & Return to Registry
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            size="md"
                                            isLoading={processing}
                                            className="shadow-sm shadow-cyan-600/30"
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                            Register Patient
                                        </Button>
                                    </div>
                                </CardFooter>
                            </Card>
                        </form>
                    </div>

                    {/* Right Summary / Live Preview Sidebar (4 Columns) */}
                    <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
                        {/* Live Identity Badge Preview */}
                        <Card className="shadow-xs border-cyan-100 overflow-hidden bg-gradient-to-br from-white via-cyan-50/20 to-slate-50">
                            <div className="h-2 bg-gradient-to-r from-cyan-500 to-indigo-600" />
                            <CardHeader className="pb-3 border-b border-slate-100">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-700 bg-cyan-100/60 px-2 py-0.5 rounded">
                                        Live Patient Card Preview
                                    </span>
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-md shadow-cyan-600/20">
                                        {data.first_name ? data.first_name[0].toUpperCase() : 'P'}
                                        {data.last_name ? data.last_name[0].toUpperCase() : 'T'}
                                    </div>
                                    <div className="overflow-hidden">
                                        <h3 className="text-base font-bold text-slate-900 truncate">
                                            {data.first_name || data.last_name
                                                ? `${data.first_name} ${data.last_name}`
                                                : 'Patient Name Preview'}
                                        </h3>
                                        <p className="text-xs font-mono font-semibold text-cyan-700 mt-0.5">
                                            {nextMrn}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                                    <div className="p-2 rounded-lg bg-white border border-slate-100">
                                        <span className="text-[10px] uppercase text-slate-400 font-semibold block">Age / Gender</span>
                                        <span className="font-semibold text-slate-800">
                                            {calculatedAge !== null ? `${calculatedAge} yrs` : '—'} • {data.gender}
                                        </span>
                                    </div>
                                    <div className="p-2 rounded-lg bg-white border border-slate-100">
                                        <span className="text-[10px] uppercase text-slate-400 font-semibold block">Blood Group</span>
                                        <Badge
                                            variant={data.blood_group !== 'UNKNOWN' ? 'destructive' : 'default'}
                                            className="font-bold text-[11px] mt-0.5"
                                        >
                                            <Heart className="w-3 h-3 mr-0.5" />
                                            {data.blood_group || 'UNKNOWN'}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="space-y-2 text-xs text-slate-600 pt-1">
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate">{data.phone || 'No phone entered yet'}</span>
                                    </div>
                                    {data.email && (
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span className="truncate">{data.email}</span>
                                        </div>
                                    )}
                                    {data.address.city && (
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span className="truncate">
                                                {data.address.city}{data.address.state ? `, ${data.address.state}` : ''}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Clinical Flags Count */}
                                {(data.allergies.length > 0 || data.chronic_conditions.length > 0) && (
                                    <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/70 text-xs flex items-center justify-between">
                                        <span className="font-semibold text-amber-900">Clinical Flags:</span>
                                        <div className="flex items-center gap-1.5">
                                            {data.allergies.length > 0 && (
                                                <Badge variant="warning">{data.allergies.length} Allergies</Badge>
                                            )}
                                            {data.chronic_conditions.length > 0 && (
                                                <Badge variant="info">{data.chronic_conditions.length} Conditions</Badge>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Intake Completeness Indicator */}
                        <Card className="shadow-xs border-slate-200 p-5 space-y-3 bg-white">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-700 uppercase tracking-wider">
                                    Intake Completeness
                                </span>
                                <span className="font-bold text-cyan-700">{completionScore}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-gradient-to-r from-cyan-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${completionScore}%` }}
                                />
                            </div>
                            <p className="text-[11px] text-slate-500">
                                Required: Name, DOB, Gender, and Phone. Providing blood group and emergency contact enhances patient safety.
                            </p>
                        </Card>

                        {/* Quick Help Card */}
                        <Card className="shadow-xs border-slate-200 p-4 bg-slate-50/60 text-xs text-slate-600 space-y-2">
                            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-cyan-600" />
                                Master Patient Index (EMPI) Guidelines
                            </h4>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                The system prevents duplicate record creation across branches by indexing National ID and Primary Phone under the active tenant partition.
                            </p>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
