import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  FlaskConical, 
  Plus, 
  Search, 
  Edit3, 
  Trash2
} from 'lucide-react';
import { db } from '../db/index';
import type { TestTemplate, TestParameter } from '../types/lab';

export const TestCatalog: React.FC = () => {
  const tests = useLiveQuery(() => db.testTemplates.toArray(), []) || [];
  const settings = useLiveQuery(() => db.settings.get('lab_profile'), []);

  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingTest, setEditingTest] = useState<Partial<TestTemplate> | null>(null);

  const [newParamName, setNewParamName] = useState('');
  const [newParamUnit, setNewParamUnit] = useState('');
  const [newParamRange, setNewParamRange] = useState('');

  const currency = settings?.currencySymbol || '₹';

  const filtered = tests.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddNew = () => {
    setEditingTest({
      id: `test-custom-${Date.now()}`,
      code: '',
      name: '',
      category: 'Biochemistry',
      price: 200,
      sampleType: 'Serum / Whole Blood',
      parameters: [],
      interpretationNotes: '',
      isActive: true,
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending',
    });
    setIsEditing(true);
  };

  const handleEdit = (test: TestTemplate) => {
    setEditingTest(JSON.parse(JSON.stringify(test)));
    setIsEditing(true);
  };

  const handleDelete = async (testId: string) => {
    if (confirm('Delete this diagnostic test from catalog?')) {
      await db.testTemplates.delete(testId);
    }
  };

  const handleAddParameter = () => {
    if (!newParamName.trim() || !editingTest) return;

    const param: TestParameter = {
      id: `param-${Date.now()}`,
      name: newParamName.trim(),
      unit: newParamUnit.trim(),
      normalRangeText: newParamRange.trim(),
    };

    setEditingTest({
      ...editingTest,
      parameters: [...(editingTest.parameters || []), param],
    });

    setNewParamName('');
    setNewParamUnit('');
    setNewParamRange('');
  };

  const handleRemoveParameter = (paramId: string) => {
    if (!editingTest) return;
    setEditingTest({
      ...editingTest,
      parameters: (editingTest.parameters || []).filter(p => p.id !== paramId),
    });
  };

  const handleSave = async () => {
    if (!editingTest?.name || !editingTest?.code) {
      alert('Test Name and Short Code are required.');
      return;
    }

    const completeTest: TestTemplate = {
      id: editingTest.id || `test-${Date.now()}`,
      code: editingTest.code.toUpperCase().trim(),
      name: editingTest.name.trim(),
      category: editingTest.category || 'General',
      price: Number(editingTest.price) || 0,
      sampleType: editingTest.sampleType || 'Blood',
      parameters: editingTest.parameters || [],
      interpretationNotes: editingTest.interpretationNotes || '',
      isActive: editingTest.isActive ?? true,
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending',
    };

    await db.testTemplates.put(completeTest);
    setIsEditing(false);
    setEditingTest(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-teal-600" />
            Diagnostic Test Catalog & Rates
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Configure village lab test packages, fees, units, and biological reference ranges
          </p>
        </div>

        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Lab Test</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6 max-w-md relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Search test name, code or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
        />
      </div>

      {/* Test List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(test => (
          <div 
            key={test.id} 
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className="bg-teal-100 text-teal-900 text-xs font-bold px-2 py-0.5 rounded">
                  {test.code}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {test.category}
                </span>
              </div>

              <h3 className="font-bold text-slate-900 text-base mb-1">
                {test.name}
              </h3>

              <p className="text-xs text-slate-500 mb-3">
                Sample: <strong className="text-slate-700">{test.sampleType}</strong>
              </p>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-600 mb-3">
                <span className="font-semibold text-slate-800">{test.parameters.length} Parameters</span>: {test.parameters.slice(0, 4).map(p => p.name).join(', ')}{test.parameters.length > 4 ? '...' : ''}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
              <div className="text-base font-bold text-teal-800">
                {currency}{test.price}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleEdit(test)}
                  className="p-1.5 text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                  title="Edit test"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(test.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete test"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Test Add/Edit Modal */}
      {isEditing && editingTest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 my-8">
            <h3 className="text-lg font-bold text-slate-900 pb-2 border-b border-slate-100">
              {editingTest.id?.includes('custom') ? 'Create New Diagnostic Test' : 'Edit Diagnostic Test'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Test Code (e.g. CBC, RBS)</label>
                <input
                  type="text"
                  value={editingTest.code || ''}
                  onChange={(e) => setEditingTest({ ...editingTest, code: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Department / Category</label>
                <select
                  value={editingTest.category || 'Hematology'}
                  onChange={(e) => setEditingTest({ ...editingTest, category: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="Hematology">Hematology</option>
                  <option value="Biochemistry">Biochemistry</option>
                  <option value="Clinical Pathology">Clinical Pathology</option>
                  <option value="Serology">Serology</option>
                  <option value="Microbiology">Microbiology</option>
                  <option value="Endocrinology">Endocrinology</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Full Test Name</label>
                <input
                  type="text"
                  value={editingTest.name || ''}
                  onChange={(e) => setEditingTest({ ...editingTest, name: e.target.value })}
                  placeholder="e.g. Serum Creatinine and Urea"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Price ({currency})</label>
                <input
                  type="number"
                  value={editingTest.price ?? ''}
                  onChange={(e) => setEditingTest({ ...editingTest, price: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Sample Specimen Type</label>
                <input
                  type="text"
                  value={editingTest.sampleType || ''}
                  placeholder="e.g. EDTA Whole Blood, Serum"
                  onChange={(e) => setEditingTest({ ...editingTest, sampleType: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Test Parameters Editor */}
            <div className="pt-3 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Parameters / Line Items ({editingTest.parameters?.length || 0})
              </h4>

              {/* Add Parameter Row */}
              <div className="grid grid-cols-12 gap-2 mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <input
                  type="text"
                  placeholder="Param name (e.g. Hemoglobin)"
                  value={newParamName}
                  onChange={(e) => setNewParamName(e.target.value)}
                  className="col-span-5 px-2.5 py-1.5 text-xs rounded border border-slate-300"
                />
                <input
                  type="text"
                  placeholder="Unit (e.g. g/dL)"
                  value={newParamUnit}
                  onChange={(e) => setNewParamUnit(e.target.value)}
                  className="col-span-3 px-2.5 py-1.5 text-xs rounded border border-slate-300"
                />
                <input
                  type="text"
                  placeholder="Ref Range (e.g. 13.0 - 17.0)"
                  value={newParamRange}
                  onChange={(e) => setNewParamRange(e.target.value)}
                  className="col-span-3 px-2.5 py-1.5 text-xs rounded border border-slate-300"
                />
                <button
                  type="button"
                  onClick={handleAddParameter}
                  className="col-span-1 bg-teal-600 hover:bg-teal-700 text-white rounded flex items-center justify-center font-bold text-sm"
                >
                  +
                </button>
              </div>

              {/* Existing parameters list */}
              <div className="max-h-40 overflow-y-auto space-y-1.5">
                {editingTest.parameters?.map((p) => (
                  <div key={p.id} className="flex justify-between items-center p-2 rounded bg-slate-100 text-xs text-slate-700">
                    <span className="font-semibold text-slate-900">{p.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-500">{p.unit || 'No unit'}</span>
                      <span className="text-slate-600">[{p.normalRangeText || 'No range'}]</span>
                      <button
                        onClick={() => handleRemoveParameter(p.id)}
                        className="text-red-500 hover:text-red-700 font-bold ml-1"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setIsEditing(false); setEditingTest(null); }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
              >
                Save Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
