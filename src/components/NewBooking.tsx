import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  UserPlus, 
  Search, 
  Check, 
  Phone, 
  MapPin, 
  Stethoscope, 
  Clock, 
  Plus,
  User,
  Receipt,
  FlaskConical,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { db } from '../db/index';
import { defaultTests } from '../db/defaultData';
import type { Patient, TestOrder, OrderTestItem, Gender, AgeUnit, PaymentStatus, PaymentMode, TestTemplate } from '../types/lab';
import { useAuth } from '../context/AuthContext';

interface NewBookingProps {
  onOrderCreated: (orderId: string, directToResults: boolean) => void;
}

export const NewBooking: React.FC<NewBookingProps> = ({ onOrderCreated }) => {
  const { currentBranch } = useAuth();
  const allTemplates = useLiveQuery(() => db.testTemplates.toArray(), []) || [];
  const tests = useMemo(() => allTemplates.filter(t => t.isActive !== false), [allTemplates]);

  // Self-healing check: ensure tests are immediately available if empty
  useEffect(() => {
    if (allTemplates.length === 0) {
      db.testTemplates.count().then(count => {
        if (count === 0) {
          db.testTemplates.bulkPut(defaultTests);
        }
      });
    }
  }, [allTemplates.length]);

  const settings = useLiveQuery(() => db.settings.get('lab_profile'), []);

  // Form State
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [ageUnit, setAgeUnit] = useState<AgeUnit>('Years');
  const [gender, setGender] = useState<Gender>('Male');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [referralDoctor, setReferralDoctor] = useState('Self');
  const [customDoctor, setCustomDoctor] = useState('');

  // Returning patient lookup by phone number
  const [matchedPatient, setMatchedPatient] = useState<{
    name: string;
    age: number;
    ageUnit: AgeUnit;
    gender: Gender;
    referralDoctor?: string;
    address?: string;
  } | null>(null);

  useEffect(() => {
    const cleanPhone = phone.trim();
    if (cleanPhone.length >= 6) {
      let active = true;
      (async () => {
        try {
          const p = await db.patients.where('phone').equals(cleanPhone).first();
          if (p && active) {
            setMatchedPatient({
              name: p.name,
              age: p.age,
              ageUnit: p.ageUnit,
              gender: p.gender,
              referralDoctor: p.referralDoctor,
              address: p.address,
            });
            return;
          }
          const o = await db.orders.where('patientPhone').equals(cleanPhone).reverse().first();
          if (o && active) {
            setMatchedPatient({
              name: o.patientName,
              age: o.patientAge,
              ageUnit: o.patientAgeUnit,
              gender: o.patientGender,
              referralDoctor: o.referralDoctor,
            });
            return;
          }
          if (active) setMatchedPatient(null);
        } catch {
          if (active) setMatchedPatient(null);
        }
      })();
      return () => { active = false; };
    } else {
      setMatchedPatient(null);
    }
  }, [phone]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTests, setSelectedTests] = useState<TestTemplate[]>([]);

  const [discount, setDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number | ''>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quickDoctors = ['Self', 'Dr. PHC', 'Dr. Clinic', 'Other'];

  const categories = useMemo(() => {
    const cats = new Set(tests.map(t => t.category));
    return ['All', ...Array.from(cats)];
  }, [tests]);

  const filteredTests = useMemo(() => {
    return tests.filter(test => {
      const matchesSearch = test.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            test.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory === 'All' || test.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [tests, searchQuery, selectedCategory]);

  const totalAmount = useMemo(() => {
    return selectedTests.reduce((sum, t) => sum + t.price, 0);
  }, [selectedTests]);

  const finalAmount = useMemo(() => {
    return Math.max(0, totalAmount - (Number(discount) || 0));
  }, [totalAmount, discount]);

  // Keep paidAmount matching finalAmount unless manually customized
  useEffect(() => {
    if (paidAmount === '' || Number(paidAmount) === totalAmount) {
      setPaidAmount(finalAmount);
    }
  }, [finalAmount, totalAmount]);

  const toggleTest = (test: TestTemplate) => {
    const exists = selectedTests.find(t => t.id === test.id);
    if (exists) {
      setSelectedTests(selectedTests.filter(t => t.id !== test.id));
    } else {
      setSelectedTests([...selectedTests, test]);
    }
  };

  const isTestSelected = (testId: string) => {
    return selectedTests.some(t => t.id === testId);
  };

  const handleSubmit = async (directToResults: boolean) => {
    if (!patientName.trim()) {
      alert('Please enter Patient Name.');
      return;
    }
    if (age === '' || Number(age) <= 0) {
      alert('Please enter a valid Patient Age.');
      return;
    }
    if (selectedTests.length === 0) {
      alert('Please select at least one diagnostic test.');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);

      const branchCode = currentBranch?.code || 'BR01';
      const branchId = currentBranch?.id || 'branch-01';

      // Zero collision multi-branch namespaced IDs
      const patientId = `${branchCode}-PT-${dateStr.replace(/-/g, '')}-${randomSuffix}`;
      const orderId = `${branchCode}-ORD-${dateStr.replace(/-/g, '')}-${randomSuffix}`;
      const effectiveDoctor = referralDoctor === 'Other' ? (customDoctor.trim() || 'Self') : referralDoctor;

      const newPatient: Patient = {
        id: patientId,
        branchId,
        branchCode,
        name: patientName.trim(),
        age: Number(age),
        ageUnit,
        gender,
        phone: phone.trim(),
        address: address.trim(),
        referralDoctor: effectiveDoctor,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        syncStatus: 'pending',
      };

      const orderTestItems: OrderTestItem[] = selectedTests.map(test => {
        const defaultResults: Record<string, any> = {};
        test.parameters.forEach(p => {
          let normalRange = p.normalRangeText || '';
          if (p.genderSpecific) {
            normalRange = gender === 'Female' ? (p.genderSpecific.female.text || '') : (p.genderSpecific.male.text || '');
          }

          defaultResults[p.id] = {
            parameterId: p.id,
            parameterName: p.name,
            value: p.defaultValue || '',
            unit: p.unit,
            normalRange: normalRange || `${p.normalRangeMin ?? ''} - ${p.normalRangeMax ?? ''}`,
            flag: 'none',
          };
        });

        return {
          testId: test.id,
          testCode: test.code,
          testName: test.name,
          category: test.category,
          price: test.price,
          sampleType: test.sampleType,
          status: 'pending',
          results: defaultResults,
        };
      });

      const actualPaid = Number(paidAmount) || 0;
      const balance = Math.max(0, finalAmount - actualPaid);
      const paymentStatus: PaymentStatus = balance === 0 ? 'paid' : (actualPaid > 0 ? 'partial' : 'unpaid');

      const newOrder: TestOrder = {
        id: orderId,
        branchId,
        branchCode,
        patientId,
        patientName: patientName.trim(),
        patientAge: Number(age),
        patientAgeUnit: ageUnit,
        patientGender: gender,
        patientPhone: phone.trim(),
        referralDoctor: effectiveDoctor,
        orderDate: dateStr,
        orderTime: timeStr,
        tests: orderTestItems,
        totalAmount,
        discountAmount: Number(discount) || 0,
        finalAmount,
        paidAmount: actualPaid,
        balanceAmount: balance,
        paymentStatus,
        paymentMode,
        overallStatus: 'registered',
        notes: notes.trim(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        syncStatus: 'pending',
      };

      await db.transaction('rw', [db.patients, db.orders], async () => {
        await db.patients.put(newPatient);
        await db.orders.put(newOrder);
      });

      // Reset form
      setPatientName('');
      setAge('');
      setPhone('');
      setAddress('');
      setSelectedTests([]);
      setDiscount(0);
      setPaidAmount('');
      setNotes('');

      onOrderCreated(orderId, directToResults);
    } catch (err) {
      console.error('Error creating order:', err);
      alert('Failed to save record to local database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currency = settings?.currencySymbol || '₹';

  return (
    <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 mb-6 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <UserPlus className="w-6 h-6 text-teal-700" />
            Patient Registration &amp; Test Booking
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Branch: <span className="font-semibold text-slate-700">{currentBranch?.name?.replace('Divine Laboratory - ', '') || 'Koottummugham'}</span> ({currentBranch?.code || 'BR01'})
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs text-slate-600 font-medium shadow-xs">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Patient Info & Billing (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Card 1: Patient Information */}
          <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <User className="w-4 h-4 text-teal-700" />
              Patient Details
            </h2>

            <div className="space-y-4">
              {/* Patient Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Patient Name"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:border-teal-700 focus:outline-none text-sm font-medium text-slate-900 placeholder:text-slate-400"
                  autoFocus
                />
              </div>

              {/* Age & Unit */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Age <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">
                    <input
                      type="number"
                      placeholder="Age"
                      min="0"
                      max="130"
                      value={age}
                      onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:border-teal-700 focus:outline-none text-sm font-medium text-slate-900"
                    />
                  </div>
                  <div className="col-span-6 flex gap-1 bg-slate-100 p-1 rounded-lg">
                    {(['Years', 'Months', 'Days'] as AgeUnit[]).map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => setAgeUnit(unit)}
                        className={`flex-1 py-1 text-xs font-semibold rounded transition-all ${
                          ageUnit === unit 
                            ? 'bg-white text-teal-900 shadow-xs' 
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {unit === 'Years' ? 'Yrs' : unit === 'Months' ? 'Mo' : 'Days'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Gender Selection (Clean Text Buttons, NO Emojis) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gender <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Male', 'Female', 'Other'] as Gender[]).map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`py-2 px-3 rounded-lg font-semibold text-xs border transition-all ${
                        gender === g
                          ? 'border-teal-700 bg-teal-50/80 text-teal-900 ring-1 ring-teal-600'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="Mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:border-teal-700 focus:outline-none text-sm font-medium text-slate-900 placeholder:text-slate-400"
                />

                {/* Returning Patient Autofill Prompt */}
                {matchedPatient && (!patientName || patientName.trim().toLowerCase() !== matchedPatient.name.trim().toLowerCase()) && (
                  <div className="mt-2 p-2.5 bg-teal-50/90 border border-teal-200 rounded-lg flex items-center justify-between gap-2">
                    <div className="text-xs text-teal-950 truncate">
                      <span className="font-bold">Returning Patient:</span> {matchedPatient.name} ({matchedPatient.age} {matchedPatient.ageUnit}, {matchedPatient.gender})
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPatientName(matchedPatient.name);
                        setAge(matchedPatient.age);
                        setAgeUnit(matchedPatient.ageUnit);
                        setGender(matchedPatient.gender);
                        if (matchedPatient.referralDoctor) {
                          if (quickDoctors.includes(matchedPatient.referralDoctor)) {
                            setReferralDoctor(matchedPatient.referralDoctor);
                          } else {
                            setReferralDoctor('Other');
                            setCustomDoctor(matchedPatient.referralDoctor);
                          }
                        }
                        if (matchedPatient.address) setAddress(matchedPatient.address);
                      }}
                      className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded text-xs font-bold transition-all shrink-0 shadow-xs"
                    >
                      Autofill
                    </button>
                  </div>
                )}
              </div>

              {/* Referred Doctor */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                  Referred By
                </label>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {quickDoctors.map(doc => (
                    <button
                      key={doc}
                      type="button"
                      onClick={() => setReferralDoctor(doc)}
                      className={`px-3 py-1 rounded-md text-xs font-medium border transition-all ${
                        referralDoctor === doc
                          ? 'border-teal-700 bg-teal-50 text-teal-900 ring-1 ring-teal-600'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {doc}
                    </button>
                  ))}
                </div>
                {referralDoctor === 'Other' && (
                  <input
                    type="text"
                    placeholder="Doctor or Hospital Name"
                    value={customDoctor}
                    onChange={(e) => setCustomDoctor(e.target.value)}
                    className="w-full px-3.5 py-1.5 rounded-lg border border-slate-300 focus:border-teal-700 focus:outline-none text-xs font-medium text-slate-900 mt-1"
                  />
                )}
              </div>

              {/* Place / Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Place / Address
                </label>
                <input
                  type="text"
                  placeholder="Town or Village"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:border-teal-700 focus:outline-none text-sm font-medium text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Billing Summary & Payment (With Discount Amount Option) */}
          <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 space-y-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Receipt className="w-4 h-4 text-teal-700" />
              Billing &amp; Payment
            </h2>

            {/* Price Breakdown with Discount Option */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
              {/* Subtotal */}
              <div className="flex justify-between items-center text-slate-600">
                <span>Subtotal ({selectedTests.length} tests):</span>
                <span className="font-semibold text-slate-900 text-sm">{currency}{totalAmount}</span>
              </div>

              {/* Discount Amount Input */}
              <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-200">
                <label className="font-semibold text-slate-700">Discount Amount ({currency}):</label>
                <div className="relative w-28">
                  <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">{currency}</span>
                  <input
                    type="number"
                    min="0"
                    max={totalAmount}
                    placeholder="0"
                    value={discount === 0 ? '' : discount}
                    onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full pl-6 pr-2.5 py-1 text-right font-bold text-sm bg-white border border-slate-300 rounded-md focus:border-teal-700 focus:outline-none text-slate-900"
                  />
                </div>
              </div>

              {/* Net Payable */}
              <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-2.5 border-t border-slate-200">
                <span>Net Total:</span>
                <span className="text-base text-teal-800 font-extrabold">{currency}{finalAmount}</span>
              </div>

              {/* Paid Amount Input */}
              <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-200">
                <label className="font-semibold text-slate-700">Paid Amount ({currency}):</label>
                <div className="relative w-28">
                  <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">{currency}</span>
                  <input
                    type="number"
                    min="0"
                    placeholder={String(finalAmount)}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-6 pr-2.5 py-1 text-right font-bold text-sm bg-white border border-slate-300 rounded-md focus:border-teal-700 focus:outline-none text-slate-900"
                  />
                </div>
              </div>

              {/* Balance / Due Alert */}
              {finalAmount - (Number(paidAmount) || 0) > 0 && (
                <div className="flex justify-between items-center font-bold text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                  <span>Balance Due:</span>
                  <span>{currency}{finalAmount - (Number(paidAmount) || 0)}</span>
                </div>
              )}
            </div>

            {/* Payment Mode Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Payment Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Cash', 'UPI / Online', 'Due'] as PaymentMode[]).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all ${
                      paymentMode === mode
                        ? 'border-teal-700 bg-teal-50 text-teal-900 ring-1 ring-teal-600'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting || selectedTests.length === 0}
                className="w-full py-3 px-4 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Save &amp; Enter Results</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>

              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting || selectedTests.length === 0}
                className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-50 text-slate-700 font-semibold text-xs rounded-xl transition-all"
              >
                Save Patient Only
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Test Selection (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200">
            <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-teal-700" />
                Select Diagnostic Tests
              </h2>
              <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                {selectedTests.length} Selected
              </span>
            </div>

            {/* Quick Add Tests Row */}
            <div className="mb-4">
              <span className="text-xs font-semibold text-slate-500 block mb-2">
                Quick Add:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {tests.slice(0, 8).map(test => {
                  const selected = isTestSelected(test.id);
                  return (
                    <button
                      key={test.id}
                      type="button"
                      onClick={() => toggleTest(test)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border ${
                        selected
                          ? 'bg-teal-700 border-teal-700 text-white shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {selected ? (
                        <Check className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <Plus className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span>{test.code}</span>
                      <span className={selected ? 'text-teal-100 text-[11px]' : 'text-slate-500 text-[11px]'}>
                        ({currency}{test.price})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search Bar & Category Filter */}
            <div className="space-y-2.5 mb-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search tests by name or code (e.g. Glucose, CBC, Lipid)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:border-teal-700 focus:outline-none text-xs font-medium text-slate-800 placeholder:text-slate-400"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Test Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredTests.map(test => {
                const selected = isTestSelected(test.id);
                return (
                  <div
                    key={test.id}
                    onClick={() => toggleTest(test)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between select-none ${
                      selected
                        ? 'border-teal-700 bg-teal-50/50 shadow-xs ring-1 ring-teal-600'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {test.code}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate">
                            {test.category}
                          </span>
                        </div>
                        <h3 className="font-semibold text-slate-900 text-xs mt-1 leading-snug">
                          {test.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          Sample: {test.sampleType}
                        </p>
                      </div>

                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 mt-0.5 ${
                        selected
                          ? 'bg-teal-700 border-teal-700 text-white'
                          : 'border-slate-300 bg-white'
                      }`}>
                        {selected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[11px]">{test.parameters.length} parameters</span>
                      <span className="font-bold text-teal-800 text-xs">{currency}{test.price}</span>
                    </div>
                  </div>
                );
              })}

              {filteredTests.length === 0 && (
                <div className="col-span-2 py-8 text-center text-slate-400">
                  <p className="text-xs font-medium">No diagnostic tests match your search.</p>
                  <button
                    onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                    className="mt-2 text-xs text-teal-700 font-semibold underline flex items-center gap-1 mx-auto"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
