import React, { useState } from 'react'

const Input = ({ label, value, onChange, placeholder }) => (
  <div className="w-full">
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    <input
      className="w-full rounded-xl border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  </div>
);

const ProviderRow = ({ name, price, href }) => (
  <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-slate-100">
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-sm">{name[0]}</div>
      <div>
        <div className="font-semibold text-slate-800">{name}</div>
        <div className="text-xs text-slate-500">Estimated fare</div>
      </div>
    </div>
    <div className="flex items-center gap-4">
      <div className="text-xl font-bold text-slate-900">₹{price}</div>
      <a target="_blank" href={href} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition">
        Open App
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h6m0 0v6m0-6L10 16" />
        </svg>
      </a>
    </div>
  </div>
);

export default function App() {
  const [origin, setOrigin] = useState('12.9352,77.6245')
  const [destination, setDestination] = useState('12.9716,77.5946')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const handleCompare = async () => {
    setError(''); setLoading(true); setData(null)
    try {
      const res = await fetch('/api/fare', {
        method: 'POST',
        headers: {'content-type':'application/json'},
        body: JSON.stringify({ origin, destination })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Request failed')
      setData(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">Local Mobility Compare</h1>
        <p className="text-slate-600 mt-2">Enter origin & destination to compare fares across Ola, Uber, Rapido, and Namma Yatri. Use <span className="font-mono">lat,lng</span> pairs for quick testing or set Google key in backend to use addresses.</p>
      </header>

      <div className="grid md:grid-cols-2 gap-4 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
        <Input label="Origin" value={origin} onChange={setOrigin} placeholder="12.9352,77.6245 or 'BTM Layout'" />
        <Input label="Destination" value={destination} onChange={setDestination} placeholder="12.9716,77.5946 or 'MG Road'" />
        <div className="md:col-span-2 flex gap-3">
          <button onClick={handleCompare} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition">
            {loading ? 'Comparing…' : 'Compare Prices'}
          </button>
          <button onClick={() => { setOrigin(''); setDestination(''); setData(null); setError(''); }} className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition">
            Reset
          </button>
        </div>
      </div>

      {error && <div className="mt-6 p-4 rounded-xl bg-red-50 text-red-700 border border-red-100">{error}</div>}

      {data && (
        <section className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-slate-700">Distance</div>
            <div className="font-semibold">{data.meta.distance_km} km</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-slate-700">Estimated Time</div>
            <div className="font-semibold">{data.meta.duration_min} min</div>
          </div>
          <div className="grid gap-3 mt-4">
            {data.fares.map(f => {
              const href = f.key.includes('ola') ? data.links.ola :
                           f.key.includes('uber') ? data.links.uber :
                           f.key.includes('rapido') ? data.links.rapido :
                           data.links.namma;
              return <ProviderRow key={f.key} name={f.label} price={f.price} href={href} />
            })}
          </div>
          <p className="text-xs text-slate-500 mt-3">Fares are rough estimates for MVP; actual prices may vary due to surge, time of day, or provider policies.</p>
        </section>
      )}
    </div>
  )
}
