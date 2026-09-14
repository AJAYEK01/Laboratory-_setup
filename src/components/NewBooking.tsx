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
  Building2,
  CheckCircle2,
  Plus
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

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTests, setSelectedTests] = useState<TestTemplate[]>([]);

  const [discount, setDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number | ''>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quickDoctors = ['Self', 'Dr. PHC (Govt)', 'Dr. Clinic', 'Other'];

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

  useEffect(() => {
    if (paidAmount === '' || Number(paidAmount) === totalAmount) {
      setPaidAmount(finalAmount);
    }
  }, [finalAmount]);

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

      // Clear form
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
      {/* Top Welcome & Counter Bar */}
      <div className="mb-6 bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 text-white p-5 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-300 text-xs font-bold uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4 text-teal-400" />
            <span>DIVINE LABORATORY • [{currentBranch?.code || 'BR01'}] {currentBranch?.name || 'Koottummugham'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-teal-400" />
            Quick Patient Entry &amp; Lab Booking
          </h2>
          <p className="text-teal-200 text-xs sm:text-sm mt-0.5">
            Designed for fast, simple laboratory operations • 100% Offline Capable
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-teal-500/30 text-xs text-teal-200 font-medium flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-400" />
            <span>{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Patient Info (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm">1</div>
              <h3 className="text-base font-bold text-slate-800">
                Patient Details
              </h3>
            </div>

            <div className="space-y-4">
              {/* Patient Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Patient Full Name <span className="text-rose-600 font-bold">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar / Mary Mathew"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-teal-600 focus:outline-none text-base font-medium text-slate-900 placeholder:text-slate-400 shadow-sm"
                  autoFocus
                />
              </div>

              {/* Age & Unit */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Age &amp; Unit <span className="text-rose-600 font-bold">*</span>
                </label>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">
                    <input
                      type="number"
                      placeholder="e.g. 45"
                      min="0"
                      max="130"
                      value={age}
                      onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-teal-600 focus:outline-none text-base font-medium text-slate-900"
                    />
                  </div>
                  <div className="col-span-6 flex gap-1 bg-slate-100 p-1 rounded-xl">
                    {(['Years', 'Months', 'Days'] as AgeUnit[]).map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => setAgeUnit(unit)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          ageUnit === unit 
                            ? 'bg-teal-700 text-white shadow-sm' 
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {unit === 'Years' ? 'Yrs' : unit === 'Months' ? 'Mo' : 'Days'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Gender (1-Click Big Touch Buttons) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Gender <span className="text-rose-600 font-bold">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setGender('Male')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 border-2 transition-all ${
                      gender === 'Male'
                        ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-sm ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>👨 Male</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('Female')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 border-2 transition-all ${
                      gender === 'Female'
                        ? 'border-pink-600 bg-pink-50 text-pink-800 shadow-sm ring-2 ring-pink-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>👩 Female</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('Other')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 border-2 transition-all ${
                      gender === 'Other'
                        ? 'border-teal-600 bg-teal-50 text-teal-800 shadow-sm ring-2 ring-teal-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>Other</span>
                  </button>
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  Mobile / WhatsApp Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 94470 12345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-teal-600 focus:outline-none text-base font-medium text-slate-900 placeholder:text-slate-400"
                />
              </div>

              {/* Doctor Quick Chips */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
                  Referred By Doctor
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {quickDoctors.map(doc => (
                    <button
                      key={doc}
                      type="button"
                      onClick={() => setReferralDoctor(doc)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        referralDoctor === doc
                          ? 'border-teal-600 bg-teal-50 text-teal-800 ring-2 ring-teal-500/20'
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
                    placeholder="Enter Doctor or Hospital Name"
                    value={customDoctor}
                    onChange={(e) => setCustomDoctor(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border-2 border-slate-200 focus:border-teal-600 focus:outline-none text-sm font-medium text-slate-800 mt-1"
                  />
                )}
              </div>

              {/* Address / Location */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  Place / Address (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Koottummugham / Chandanakkampara"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border-2 border-slate-200 focus:border-teal-600 focus:outline-none text-sm font-medium text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Billing & Action Box */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">3</div>
              <h3 className="text-base font-bold text-slate-800">
                Payment &amp; Save
              </h3>
            </div>

            {/* Price Summary */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center text-sm font-medium text-slate-600 mb-1">
                <span>Selected Tests ({selectedTests.length}):</span>
                <span>{currency}{totalAmount}</span>
              </div>
              <div className="flex justify-between items-center text-lg font-extrabold text-slate-900 border-t border-slate-200/80 pt-2 mt-2">
                <span>Net Total Bill:</span>
                <span className="text-xl text-teal-700">{currency}{finalAmount}</span>
              </div>
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Cash', 'UPI / Online', 'Due'] as PaymentMode[]).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                      paymentMode === mode
                        ? 'border-teal-600 bg-teal-50 text-teal-800 ring-2 ring-teal-500/20'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {mode === 'Cash' ? '💵 Cash' : mode === 'UPI / Online' ? '📱 UPI / GPay' : '⏳ Due'}
                  </button>
                ))}
              </div>
            </div>

            {/* GIANT ACTION BUTTONS FOR TECHNICIAN */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting || selectedTests.length === 0}
                className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-extrabold text-base rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-center"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                <span>SAVE &amp; ENTER RESULTS NOW ➔</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting || selectedTests.length === 0}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-50 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Save Patient (Queue for Later)
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Test Selection (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm">2</div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Select Diagnostic Tests
                  </h3>
                  <p className="text-xs text-slate-500">Tap quick buttons or search tests below</p>
                </div>
              </div>
              <div className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                {selectedTests.length} Selected
              </div>
            </div>

            {/* 1-CLICK POPULAR TESTS ROW */}
            <div className="mb-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                ⚡ Most Popular Village Tests (1-Click Add):
              </span>
              <div className="flex flex-wrap gap-2">
                {tests.slice(0, 8).map(test => {
                  const selected = isTestSelected(test.id);
                  return (
                    <button
                      key={test.id}
                      type="button"
                      onClick={() => toggleTest(test)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                        selected
                          ? 'bg-teal-700 border-teal-700 text-white shadow-sm ring-2 ring-teal-600/30'
                          : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      {selected ? (
                        <Check className="w-3.5 h-3.5 text-teal-200 stroke-[3]" />
                      ) : (
                        <Plus className="w-3.5 h-3.5 text-slate-400 stroke-[3]" />
                      )}
                      <span>{test.code}</span>
                      <span className={selected ? 'text-teal-200 text-[11px]' : 'text-slate-400 text-[11px]'}>
                        ({currency}{test.price})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search Bar & Category Filter */}
            <div className="space-y-3 mb-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Type test name (e.g. Sugar, CBC, Lipid, Urine, Widal)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-teal-600 focus:outline-none text-sm font-medium text-slate-800 placeholder:text-slate-400"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Test Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[480px] overflow-y-auto pr-1">
              {filteredTests.map(test => {
                const selected = isTestSelected(test.id);
                return (
                  <div
                    key={test.id}
                    onClick={() => toggleTest(test)}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between select-none ${
                      selected
                        ? 'border-teal-600 bg-teal-50/60 shadow-sm ring-1 ring-teal-500/30'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">
                            {test.code}
                          </span>
                          <span className="text-xs font-medium text-slate-500">
                            {test.category}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm mt-1 leading-snug">
                          {test.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          Sample: {test.sampleType}
                        </p>
                      </div>

                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        selected
                          ? 'bg-teal-700 border-teal-700 text-white'
                          : 'border-slate-300 bg-white'
                      }`}>
                        {selected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500">{test.parameters.length} parameters</span>
                      <span className="font-extrabold text-teal-700 text-sm">{currency}{test.price}</span>
                    </div>
                  </div>
                );
              })}

              {filteredTests.length === 0 && (
                <div className="col-span-2 py-8 text-center text-slate-500">
                  <p className="font-medium text-sm">No diagnostic tests match your search.</p>
                  <button
                    onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                    className="mt-2 text-xs text-teal-600 font-bold underline"
                  >
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
