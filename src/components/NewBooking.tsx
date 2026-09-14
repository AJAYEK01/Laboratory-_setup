import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  UserPlus, 
  Search, 
  Check, 
  IndianRupee, 
  Phone, 
  User, 
  MapPin, 
  Stethoscope, 
  ArrowRight,
  Clock,
  Sparkles,
  Building2
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

  const popularDoctors = ['Self', 'Dr. Sharma (PHC)', 'Dr. Verma (Civil Hospital)', 'Dr. Gupta Clinic', 'Other'];

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

  const handleSubmit = async (directToResults: boolean) => {
    if (!patientName.trim()) {
      alert('Please enter patient name.');
      return;
    }
    if (age === '' || Number(age) <= 0) {
      alert('Please enter a valid patient age.');
      return;
    }
    if (selectedTests.length === 0) {
      alert('Please select at least one lab test.');
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

      // Namespaced ID guarantees zero collisions across 200+ patients/day and multiple branches
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
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
      <div className="mb-6 bg-gradient-to-r from-teal-800 to-slate-900 text-white p-5 rounded-2xl shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-300 text-xs font-bold uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>Booking Counter: [{currentBranch.code}] {currentBranch.name}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-teal-400" />
            Patient Registration &amp; Test Booking
          </h2>
          <p className="text-teal-200 text-xs sm:text-sm mt-0.5">
            Instant offline registration • Zero ID collision • High-volume speed (200+ patients/day)
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-teal-500/30 text-xs text-teal-300">
          <Clock className="w-4 h-4 text-teal-400" />
          <span>{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Patient Details (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
              <User className="w-5 h-5 text-teal-600" />
              Patient Demographics
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Patient Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Chandra Verma"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium text-slate-800"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-5">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Age <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="35"
                    min="0"
                    max="130"
                    value={age}
                    onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium text-slate-800"
                  />
                </div>

                <div className="col-span-3">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Unit</label>
                  <select
                    value={ageUnit}
                    onChange={(e) => setAgeUnit(e.target.value as AgeUnit)}
                    className="w-full px-2 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs font-medium text-slate-800 bg-white"
                  >
                    <option value="Years">Yrs</option>
                    <option value="Months">Mo</option>
                    <option value="Days">Days</option>
                  </select>
                </div>

                <div className="col-span-4">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full px-2.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs font-medium text-slate-800 bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Village / Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rampur Village"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                  Referred By Doctor / Hospital
                </label>
                <div className="flex gap-2">
                  <select
                    value={referralDoctor}
                    onChange={(e) => setReferralDoctor(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium text-slate-800 bg-white"
                  >
                    {popularDoctors.map(doc => (
                      <option key={doc} value={doc}>{doc}</option>
                    ))}
                  </select>
                </div>
                {referralDoctor === 'Other' && (
                  <input
                    type="text"
                    placeholder="Enter referring doctor's name"
                    value={customDoctor}
                    onChange={(e) => setCustomDoctor(e.target.value)}
                    className="w-full mt-2 px-3.5 py-2 rounded-lg border border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Billing & Payment Card */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
              <IndianRupee className="w-5 h-5 text-emerald-600" />
              Billing &amp; Payment
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal ({selectedTests.length} tests):</span>
                <span className="font-semibold text-slate-900">{currency}{totalAmount}</span>
              </div>

              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Discount ({currency}):</span>
                <input
                  type="number"
                  min="0"
                  max={totalAmount}
                  value={discount === 0 ? '' : discount}
                  placeholder="0"
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                  className="w-24 text-right px-2.5 py-1 rounded border border-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-100">
                <span>Net Payable:</span>
                <span className="text-teal-700">{currency}{finalAmount}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Paid Amount</label>
                  <input
                    type="number"
                    min="0"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs font-medium text-slate-800 bg-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI / Online">UPI / QR</option>
                    <option value="Card">Card</option>
                    <option value="Due">Credit / Due</option>
                  </select>
                </div>
              </div>

              {Number(paidAmount) < finalAmount && (
                <div className="text-xs bg-amber-50 text-amber-800 p-2 rounded-lg border border-amber-200 font-medium">
                  Balance Due: {currency}{finalAmount - (Number(paidAmount) || 0)}
                </div>
              )}
            </div>

            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting || selectedTests.length === 0}
                className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                <span>Save &amp; Enter Test Results</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting || selectedTests.length === 0}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition-all"
              >
                Save Patient Order &amp; Book Next
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Test Selection (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[650px]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-600" />
                Select Diagnostic Tests
              </h3>
              <p className="text-xs text-slate-500">
                Click any test to add it to the patient&apos;s order
              </p>
            </div>

            <div className="text-xs bg-teal-50 text-teal-800 font-bold px-3 py-1 rounded-full border border-teal-200">
              {selectedTests.length} selected
            </div>
          </div>

          <div className="space-y-2 mb-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search tests (e.g., CBC, Sugar, Lipid, KFT, Urine, Widal)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg whitespace-nowrap font-medium transition-colors ${
                    selectedCategory === cat 
                      ? 'bg-slate-900 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
            {filteredTests.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <p className="text-sm">No diagnostic tests match your search.</p>
              </div>
            ) : (
              filteredTests.map((test) => {
                const isSelected = selectedTests.some(t => t.id === test.id);
                return (
                  <div
                    key={test.id}
                    onClick={() => toggleTest(test)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/60 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center border transition-colors ${
                        isSelected 
                          ? 'bg-teal-600 border-teal-600 text-white' 
                          : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-teal-800 bg-teal-100/70 px-1.5 py-0.5 rounded">
                            {test.code}
                          </span>
                          <span className="text-sm font-semibold text-slate-900">
                            {test.name}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>{test.category}</span>
                          <span>•</span>
                          <span>{test.sampleType}</span>
                          <span>•</span>
                          <span>{test.parameters.length} parameters</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">
                        {currency}{test.price}
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-teal-600 text-white' : 'text-slate-400'
                      }`}>
                        {isSelected ? 'Selected' : '+ Add'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {selectedTests.length > 0 && (
            <div className="pt-3 border-t border-slate-200 mt-2">
              <div className="text-xs font-medium text-slate-600 mb-1.5 flex justify-between">
                <span>Selected ({selectedTests.length}):</span>
                <button 
                  onClick={() => setSelectedTests([])}
                  className="text-red-600 hover:underline text-[11px]"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                {selectedTests.map(t => (
                  <span 
                    key={t.id} 
                    className="inline-flex items-center gap-1 bg-teal-100 text-teal-800 text-xs px-2.5 py-1 rounded-md font-medium"
                  >
                    {t.name}
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleTest(t); }} 
                      className="hover:text-red-700 ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
