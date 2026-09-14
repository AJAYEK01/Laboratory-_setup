import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  X
} from 'lucide-react';
import { db } from '../db/index';
import type { TestOrder } from '../types/lab';

interface PatientTrendGraphProps {
  patientId?: string;
  patientPhone?: string;
  patientName?: string;
  compact?: boolean; // When rendered inline in print report
  selectedParamId?: string;
  onClose?: () => void;
}

interface DataPoint {
  date: string;
  orderId: string;
  value: number;
  unit: string;
  flag: 'normal' | 'high' | 'low' | 'abnormal' | 'none';
  doctor: string;
  normalMin?: number;
  normalMax?: number;
  normalText?: string;
}

export const PatientTrendGraph: React.FC<PatientTrendGraphProps> = ({
  patientId,
  patientPhone,
  patientName,
  compact = false,
  selectedParamId: initialParamId,
  onClose,
}) => {
  // Query all orders related to this patient either by patientId, phone, or name
  const allOrders = useLiveQuery(async () => {
    let orders: TestOrder[] = [];
    if (patientId) {
      orders = await db.orders.where('patientId').equals(patientId).toArray();
    }
    if (orders.length === 0 && patientPhone && patientPhone.length > 5) {
      orders = await db.orders.where('patientPhone').equals(patientPhone).toArray();
    }
    if (orders.length === 0 && patientName) {
      const all = await db.orders.toArray();
      orders = all.filter(o => o.patientName.toLowerCase() === patientName.toLowerCase());
    }
    // Sort chronologically ascending for trend
    return orders.sort((a, b) => a.orderDate.localeCompare(b.orderDate) || a.createdAt.localeCompare(b.createdAt));
  }, [patientId, patientPhone, patientName]) || [];

  // Extract all numeric parameters available across the patient's visits
  const availableParameters = useMemo(() => {
    const paramMap = new Map<string, { id: string; name: string; unit: string; testName: string }>();

    allOrders.forEach(order => {
      order.tests.forEach(test => {
        if (test.results) {
          Object.entries(test.results).forEach(([pId, res]) => {
            const num = parseFloat(res.value);
            if (!isNaN(num)) {
              if (!paramMap.has(pId)) {
                paramMap.set(pId, {
                  id: pId,
                  name: res.parameterName,
                  unit: res.unit || '',
                  testName: test.testName,
                });
              }
            }
          });
        }
      });
    });

    return Array.from(paramMap.values());
  }, [allOrders]);

  const [activeParamId, setActiveParamId] = useState<string>(() => {
    if (initialParamId && availableParameters.some(p => p.id === initialParamId)) {
      return initialParamId;
    }
    // Prefer common tests like Glucose, Hb, Creatinine, or first available
    const preferred = availableParameters.find(p => 
      p.id.includes('gluc') || p.id.includes('hb') || p.id.includes('creat') || p.name.includes('Glucose')
    );
    return preferred ? preferred.id : (availableParameters[0]?.id || '');
  });

  // Keep activeParamId synchronized if availableParameters changes
  React.useEffect(() => {
    if (!activeParamId && availableParameters.length > 0) {
      setActiveParamId(availableParameters[0].id);
    }
  }, [availableParameters, activeParamId]);

  // Extract data points for the currently selected parameter
  const dataPoints = useMemo<DataPoint[]>(() => {
    if (!activeParamId) return [];

    const points: DataPoint[] = [];

    allOrders.forEach(order => {
      order.tests.forEach(test => {
        if (test.results && test.results[activeParamId]) {
          const res = test.results[activeParamId];
          const val = parseFloat(res.value);
          if (!isNaN(val)) {
            // Extract numeric bounds from normalRange if possible
            let min: number | undefined;
            let max: number | undefined;

            if (res.normalRange) {
              const matches = res.normalRange.match(/([0-9.]+)\s*-\s*([0-9.]+)/);
              if (matches) {
                min = parseFloat(matches[1]);
                max = parseFloat(matches[2]);
              } else if (res.normalRange.includes('<')) {
                const lt = res.normalRange.match(/<\s*([0-9.]+)/);
                if (lt) max = parseFloat(lt[1]);
              } else if (res.normalRange.includes('>')) {
                const gt = res.normalRange.match(/>\s*([0-9.]+)/);
                if (gt) min = parseFloat(gt[1]);
              }
            }

            points.push({
              date: order.orderDate,
              orderId: order.id,
              value: val,
              unit: res.unit || '',
              flag: res.flag || 'normal',
              doctor: order.referralDoctor || 'Self',
              normalMin: min,
              normalMax: max,
              normalText: res.normalRange,
            });
          }
        }
      });
    });

    return points;
  }, [allOrders, activeParamId]);

  const activeParamInfo = availableParameters.find(p => p.id === activeParamId);

  // Statistics
  const stats = useMemo(() => {
    if (dataPoints.length === 0) return null;
    const values = dataPoints.map(p => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const latest = dataPoints[dataPoints.length - 1];
    const previous = dataPoints.length > 1 ? dataPoints[dataPoints.length - 2] : null;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (previous) {
      const diff = latest.value - previous.value;
      if (Math.abs(diff) > 0.05 * previous.value) {
        trend = diff > 0 ? 'up' : 'down';
      }
    }

    return { min, max, latest, previous, trend, count: dataPoints.length };
  }, [dataPoints]);

  // Graph SVG Dimensions
  const width = compact ? 500 : 700;
  const height = compact ? 180 : 260;
  const padLeft = compact ? 45 : 55;
  const padRight = 30;
  const padTop = compact ? 25 : 30;
  const padBottom = compact ? 35 : 45;

  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;

  // Calculate scales
  const { minVal, maxVal, normalMin, normalMax } = useMemo(() => {
    if (dataPoints.length === 0) {
      return { minVal: 0, maxVal: 100, normalMin: 0, normalMax: 100 };
    }

    const values = dataPoints.map(p => p.value);
    let nMin = dataPoints[0]?.normalMin;
    let nMax = dataPoints[0]?.normalMax;

    if (nMin !== undefined) values.push(nMin);
    if (nMax !== undefined) values.push(nMax);

    const actualMin = Math.min(...values);
    const actualMax = Math.max(...values);
    const spread = actualMax - actualMin || 10;

    return {
      minVal: Math.max(0, actualMin - spread * 0.15),
      maxVal: actualMax + spread * 0.15,
      normalMin: nMin,
      normalMax: nMax,
    };
  }, [dataPoints]);

  const getY = (val: number) => {
    if (maxVal === minVal) return height / 2;
    return padTop + chartHeight - ((val - minVal) / (maxVal - minVal)) * chartHeight;
  };

  const getX = (index: number) => {
    if (dataPoints.length <= 1) return padLeft + chartWidth / 2;
    return padLeft + (index / (dataPoints.length - 1)) * chartWidth;
  };

  // Build SVG Path
  const linePath = useMemo(() => {
    if (dataPoints.length === 0) return '';
    return dataPoints
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx).toFixed(1)} ${getY(p.value).toFixed(1)}`)
      .join(' ');
  }, [dataPoints, minVal, maxVal]);

  // Area Fill Path
  const areaPath = useMemo(() => {
    if (dataPoints.length <= 1) return '';
    const pointsStr = dataPoints
      .map((p, idx) => `L ${getX(idx).toFixed(1)} ${getY(p.value).toFixed(1)}`)
      .join(' ');
    const firstX = getX(0).toFixed(1);
    const lastX = getX(dataPoints.length - 1).toFixed(1);
    const baseline = (padTop + chartHeight).toFixed(1);

    return `M ${firstX} ${baseline} ${pointsStr} L ${lastX} ${baseline} Z`;
  }, [dataPoints, minVal, maxVal]);

  const normalRangeYTop = normalMax !== undefined ? getY(normalMax) : null;
  const normalRangeYBottom = normalMin !== undefined ? getY(normalMin) : null;

  if (availableParameters.length === 0) {
    return (
      <div className={`bg-white rounded-2xl border border-slate-200 p-6 text-center ${compact ? 'text-xs' : ''}`}>
        <p className="text-slate-500 font-medium">No numerical test results available for health trend plotting.</p>
        <p className="text-slate-400 text-xs mt-1">Once tests with numeric readings (CBC, Glucose, Lipid, etc.) are entered, health progression graphs will display here.</p>
        {onClose && (
          <button onClick={onClose} className="mt-4 px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg">
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl ${compact ? 'p-3 border border-slate-300' : 'p-6 border border-slate-200 shadow-xl'}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-800 text-base">
              {compact ? 'Historical Health Trend' : 'Patient Health Progression & Trend Analysis'}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Patient: <span className="font-semibold text-slate-700">{patientName || allOrders[0]?.patientName}</span>
            {patientPhone && <span> • Phone: {patientPhone}</span>}
          </p>
        </div>

        {onClose && (
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Parameter Selector Chips */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4 overflow-x-auto pb-1 no-print">
        <span className="text-xs font-semibold text-slate-500 mr-1">Select Parameter:</span>
        {availableParameters.map(param => (
          <button
            key={param.id}
            onClick={() => setActiveParamId(param.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              activeParamId === param.id
                ? 'bg-teal-700 text-white shadow-sm ring-2 ring-teal-600/30'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {param.name} {param.unit ? `(${param.unit})` : ''}
          </button>
        ))}
      </div>

      {/* KPI Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Latest Reading</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={`text-lg font-extrabold ${
                stats.latest.flag === 'high' ? 'text-rose-600' :
                stats.latest.flag === 'low' ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                {stats.latest.value}
              </span>
              <span className="text-xs text-slate-500 font-medium">{stats.latest.unit}</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">{stats.latest.date}</span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Reference Range</span>
            <span className="text-sm font-bold text-slate-700 mt-0.5 block">
              {dataPoints[0]?.normalText || (normalMin !== undefined && normalMax !== undefined ? `${normalMin} - ${normalMax}` : 'Standard')}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Biological Normal</span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Recorded Range</span>
            <div className="text-sm font-bold text-slate-700 mt-0.5">
              <span>{stats.min}</span>
              <span className="text-slate-400 mx-1">→</span>
              <span>{stats.max}</span>
              <span className="text-xs font-normal text-slate-500 ml-1">{dataPoints[0]?.unit}</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">{stats.count} record(s)</span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Trajectory</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {stats.trend === 'up' ? (
                <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  <TrendingUp className="w-3.5 h-3.5" /> Increasing
                </span>
              ) : stats.trend === 'down' ? (
                <span className="flex items-center gap-1 text-xs font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
                  <TrendingDown className="w-3.5 h-3.5" /> Decreasing
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-full">
                  <Minus className="w-3.5 h-3.5" /> Stable
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Vs prior visit</span>
          </div>
        </div>
      )}

      {/* Main SVG Graph */}
      <div className="relative overflow-hidden bg-slate-50/50 rounded-xl border border-slate-200 p-2">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-auto overflow-visible select-none"
          style={{ maxHeight: compact ? '200px' : '300px' }}
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d9488" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0d9488" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="normalRangeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.08" />
            </linearGradient>
          </defs>

          {/* Shaded Normal Range Corridor */}
          {normalRangeYTop !== null && normalRangeYBottom !== null && (
            <rect
              x={padLeft}
              y={normalRangeYTop}
              width={chartWidth}
              height={Math.max(4, normalRangeYBottom - normalRangeYTop)}
              fill="url(#normalRangeGrad)"
              stroke="#10b981"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.8"
            />
          )}

          {/* Horizontal Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = padTop + chartHeight * ratio;
            const val = maxVal - (maxVal - minVal) * ratio;
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <text
                  x={padLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="#64748b"
                  fontWeight="500"
                >
                  {val.toFixed(val > 10 ? 0 : 1)}
                </text>
              </g>
            );
          })}

          {/* Normal Corridor Labels */}
          {normalMax !== undefined && normalRangeYTop !== null && (
            <text
              x={width - padRight - 4}
              y={normalRangeYTop - 4}
              textAnchor="end"
              fontSize="9"
              fill="#059669"
              fontWeight="600"
            >
              Max: {normalMax}
            </text>
          )}

          {/* Area Under Curve */}
          {areaPath && (
            <path d={areaPath} fill="url(#areaGradient)" />
          )}

          {/* Trend Polyline */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#0d9488"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Interactive Data Points */}
          {dataPoints.map((p, idx) => {
            const cx = getX(idx);
            const cy = getY(p.value);
            const color = p.flag === 'high' ? '#e11d48' : p.flag === 'low' ? '#d97706' : '#059669';

            return (
              <g key={idx} className="transition-transform group cursor-pointer">
                {/* Glow ring */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={compact ? 5 : 6}
                  fill="white"
                  stroke={color}
                  strokeWidth="3"
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={compact ? 2 : 2.5}
                  fill={color}
                />

                {/* Point Value Tooltip Label */}
                <text
                  x={cx}
                  y={cy - 10}
                  textAnchor="middle"
                  fontSize={compact ? "10" : "11"}
                  fontWeight="bold"
                  fill={color}
                >
                  {p.value}
                </text>

                {/* Date on X Axis */}
                <text
                  x={cx}
                  y={height - 12}
                  textAnchor="middle"
                  fontSize={compact ? "9" : "10"}
                  fill="#64748b"
                  fontWeight="500"
                >
                  {p.date.substring(5)}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-2 px-2 border-t border-slate-100 mt-1">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span> Normal
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block"></span> High / Elevated
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Low
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-2 border border-emerald-400 bg-emerald-50 inline-block"></span> Normal Band
            </span>
          </div>

          <span className="font-semibold text-slate-700">
            {activeParamInfo?.name} ({activeParamInfo?.unit})
          </span>
        </div>
      </div>
    </div>
  );
};
