// src/App.jsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import LiveCallView from "./components/LiveCallView.jsx";
import PastEmergencies from "./components/PastEmergencies.jsx";
import StationPage from "./pages/Station.jsx";
import Home from "./pages/Home.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "";

/* ---------------- Top Nav (route-aware) ---------------- */
function TopNav() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const isLive = pathname.startsWith("/live");
  const isStation = pathname.startsWith("/station");

  return (
    <header className="app-nav sticky top-0 z-20">
      <div className="mx-auto max-w-[1500px] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl grid place-items-center font-black text-white" style={{ background: "#10b981" }}>
            E
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[#0f172a]">Emergency Console</h1>
            <p className="text-xs text-[#334155]">Real-time emergency response system</p>
          </div>
        </div>
        <nav className="flex items-center gap-2">
          <Link to="/" className={`chip ${isHome ? "border-emerald-500 bg-emerald-50 text-emerald-700" : ""}`}>Home</Link>
          <Link to="/live" className={`chip ${isLive ? "border-emerald-500 bg-emerald-50 text-emerald-700" : ""}`}>Operator</Link>
          <Link to="/station" className={`chip ${isStation ? "border-emerald-500 bg-emerald-50 text-emerald-700" : ""}`}>Station</Link>
        </nav>
      </div>
    </header>
  );
}

/* ---------------- Operator dashboard ---------------- */
function OperatorDashboard() {
  const [items, setItems] = useState([]);
  const [selectedCallId, setSelectedCallId] = useState(null);
  const esRef = useRef(null);

  async function fetchAll() {
    try {
      const res = await fetch(`${API_BASE}/api/emergencies`);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setItems(arr);
      if (!selectedCallId) {
        const firstLive = arr.find((x) => !!x.callSid) || null;
        if (firstLive?.callSid) setSelectedCallId(firstLive.callSid);
      }
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    fetchAll();
    try {
      const es = new EventSource(`${API_BASE}/api/stations/__all__/stream`);
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data || "{}");
          if (msg.type === "incoming" && msg.emergency) {
            setItems((prev) => upsert(prev, msg.emergency));
          } else if (msg.type === "status" && msg.callSid) {
            setItems((prev) =>
              prev.map((x) => (x.callSid === msg.callSid ? { ...x, status: msg.status } : x))
            );
          } else if (msg.type === "remove" && msg.callSid) {
            setItems((prev) => prev.filter((x) => x.callSid !== msg.callSid));
          }
        } catch {}
      };
      es.onerror = () => {};
      esRef.current = es;
    } catch (e) {
      console.warn("SSE not available:", e?.message);
    }

    const t = setInterval(fetchAll, 3000);
    return () => {
      clearInterval(t);
      try { esRef.current?.close(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const liveCalls = useMemo(
    () =>
      (items || [])
        .filter((x) => !!x.callSid)
        .sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt || 0) -
            new Date(a.updatedAt || a.createdAt || 0)
        ),
    [items]
  );

  const priLeftBorder = (p = "Low") => {
    const k = String(p).toLowerCase();
    if (k === "critical") return "border-l-4 border-l-red-500";
    if (k === "high") return "border-l-4 border-l-orange-500";
    if (k === "medium") return "border-l-4 border-l-amber-500";
    return "border-l-4 border-l-emerald-500";
  };

  return (
    <main className="mx-auto max-w-[1500px] px-6 py-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_420px] items-start">
        {/* LEFT: Main form/workspace */}
        <section className="panel p-6 min-h-[60vh]">
          {selectedCallId ? (
            <LiveCallView callId={selectedCallId} />
          ) : (
            <div className="h-[60vh] grid place-items-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-[#f1f5f9] grid place-items-center mx-auto mb-4 border border-[#e2e8f0]">
                  <span className="text-2xl text-[#334155]">📞</span>
                </div>
                <div className="text-[#334155]">Select a live call to begin</div>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT: Stacked rail */}
        <aside className="lg:sticky lg:top-[88px]">
          <div className="flex flex-col gap-4 h-[calc(100vh-100px)] overflow-y-auto scroll-slim">
            <div className="panel p-4">
              <h2 className="section-title">Live Calls</h2>
              <div className="space-y-3">
                {liveCalls.map((c) => {
                  const id = c.callSid || "";
                  const tail = id.slice(-6) || "—";
                  const active = selectedCallId === id;
                  const pr = (c.priority || c.extracted?.priority || "Low");
                  const prKey = String(pr).toLowerCase();
                  return (
                    <button
                      key={id}
                      className={`tile ${active ? "tile-active" : "tile-default"} ${priLeftBorder(pr)}`}
                      onClick={() => setSelectedCallId(id)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {c.callerNumber || c.phone || "Unknown"}{" "}
                          <span className="text-[#64748b]">· {tail}</span>
                        </span>
                        <span
                          className={`chip ${
                            prKey === "critical"
                              ? "chip-critical"
                              : prKey === "high"
                              ? "chip-high"
                              : prKey === "medium"
                              ? "chip-medium"
                              : "chip-low"
                          }`}
                        >
                          {pr || "Low"}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748b] mt-1 line-clamp-1">
                        {c.nature ||
                          c.extracted?.nature ||
                          c.extracted?.natureOfEmergency ||
                          "—"}
                      </p>
                    </button>
                  );
                })}
                {!liveCalls.length && (
                  <div className="text-[#64748b] text-sm">No active calls yet.</div>
                )}
              </div>
            </div>

            <div className="panel p-4">
              <h2 className="section-title">Past Emergencies</h2>
              <PastEmergencies />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

/* ---------------- Root App with Router ---------------- */
export default function App() {
  return (
    <BrowserRouter>
      <TopNav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/live" element={<OperatorDashboard />} />
        <Route path="/station" element={<StationPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

/* ---------------- utils ---------------- */
function upsert(list, item) {
  const idx = list.findIndex((x) => x.callSid === item.callSid);
  if (idx === -1) return [item, ...list];
  const next = [...list];
  next[idx] = { ...next[idx], ...item };
  return next;
}
