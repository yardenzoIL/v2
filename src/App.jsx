import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar, Clock, AlertTriangle, Megaphone, Star, CheckCircle2, Loader2 } from 'lucide-react';

const App = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentView, setCurrentView] = useState('alerts');
  const [sheetData, setSheetData] = useState({ alerts: [], marquee: [], changes: [] });
  const [weeklyData, setWeeklyData] = useState({ rows: [], fullRange: "" });
  const [takeover, setTakeover] = useState({ active: false, url: "" });

  const lastRawTakeoverUrl = useRef("");
  const isFirstLoad = useRef(true);
  const schoolLogo = "https://i.ibb.co/vxVr4jPg/logo.png"; 

  // URLs for the different sheets
  const sheetUrls = {
    main: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSvAPCgpwTyuR_spSNF-dDeoSikh_C9Aq8RUbZ7w8qfmz9bGqcz3DG1usYiREOqFvSbqAqAKOW675i3/pub?gid=1798761539&single=true&output=csv",
    changes: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSvAPCgpwTyuR_spSNF-dDeoSikh_C9Aq8RUbZ7w8qfmz9bGqcz3DG1usYiREOqFvSbqAqAKOW675i3/pub?gid=0&single=true&output=csv",
    weekly: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSvAPCgpwTyuR_spSNF-dDeoSikh_C9Aq8RUbZ7w8qfmz9bGqcz3DG1usYiREOqFvSbqAqAKOW675i3/pub?gid=1122409961&single=true&output=csv",
    takeover: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSvAPCgpwTyuR_spSNF-dDeoSikh_C9Aq8RUbZ7w8qfmz9bGqcz3DG1usYiREOqFvSbqAqAKOW675i3/pub?gid=1493528419&single=true&output=csv"
  };

  // Helper to convert regular Google links to Embed links for clean display
  const formatUrlForIframe = (url) => {
    if (!url || url.length < 10) return "";
    let finalUrl = url.trim();
    if (finalUrl.includes("docs.google.com/presentation")) {
      finalUrl = finalUrl.replace(/\/edit.*$/, "/embed").replace(/\/pub\?/, "/embed?");
      finalUrl += (finalUrl.includes("?") ? "&" : "?") + `rm=minimal&start=true&loop=true&delayms=10000`;
    } else if (finalUrl.includes("docs.google.com/document")) {
      finalUrl = finalUrl.replace(/\/edit.*$/, "/preview").replace(/\/pub\?/, "/preview?");
    }
    return finalUrl;
  };

  const fetchWithNoCache = async (url) => {
    try {
      const noCacheUrl = `${url}${url.includes('?') ? '&' : '?' }nocache=${Date.now()}`;
      const response = await fetch(noCacheUrl, { cache: 'no-store' });
      if (!response.ok) return null;
      return await response.text();
    } catch (e) {
      return null;
    }
  };

  const parseCSV = (csv) => {
    if (!csv || typeof csv !== 'string') return [];
    return csv.split(/\r?\n/).map(row => 
      row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim())
    );
  };

  const loadAllData = useCallback(async () => {
    const [main, changes, weekly, take] = await Promise.all([
      fetchWithNoCache(sheetUrls.main),
      fetchWithNoCache(sheetUrls.changes),
      fetchWithNoCache(sheetUrls.weekly),
      fetchWithNoCache(sheetUrls.takeover)
    ]);

    // Check for Takeover/Presentation status
    if (take) {
      const rows = parseCSV(take);
      if (rows && rows[0]) {
        const statusValue = (rows[0][0] || "").toLowerCase();
        const rawUrl = (rows[0][1] || "").trim();
        
        // Logical check if takeover is ON
        const isOn = ["דלוק", "on", "true", "1", "yes", "כן"].some(v => statusValue.includes(v));
        
        if (!isOn || !rawUrl) {
          if (takeover.active) {
            setTakeover({ active: false, url: "" });
            lastRawTakeoverUrl.current = "";
          }
        } else if (rawUrl !== lastRawTakeoverUrl.current) {
          // If URL changed or just turned on
          lastRawTakeoverUrl.current = rawUrl;
          setTakeover({ active: true, url: formatUrlForIframe(rawUrl) });
        }
      }
    }

    if (main) {
      const mRows = parseCSV(main);
      if (mRows.length > 1) {
        setSheetData(prev => ({
          ...prev,
          alerts: mRows.slice(1, 25).filter(r => r[3] && r[3] !== "").map(r => ({
            title: r[3], content: r[2], media: r[4]?.match(/https?:\/\/[^\s)]+/)?.[0],
            type: r[1]?.includes('דחוף') ? 'red' : r[1]?.includes('אזהרה') ? 'orange' : 'emerald'
          })),
          marquee: mRows.slice(1, 15).map(r => r[5]).filter(v => v && v !== "")
        }));
      }
    }

    if (changes) {
      const cRows = parseCSV(changes);
      if (cRows.length > 2) setSheetData(prev => ({ 
        ...prev, 
        changes: cRows.slice(2).filter(r => r[0] && r[0] !== "").map(r => ({ k: r[0], h: r[1], s: r[2], n: r[3] })) 
      }));
    }

    if (weekly) {
      const wRows = parseCSV(weekly);
      if (wRows.length > 2) setWeeklyData({ 
        rows: wRows.slice(2).filter(r => r[0]).map(r => ({ k: r[0], d1: r[1], d2: r[2], d3: r[3], d4: r[4], d5: r[5] })),
        fullRange: wRows[0]?.[0] || "" 
      });
    }

    if (isFirstLoad.current) {
      setInitialLoading(false);
      isFirstLoad.current = false;
    }
  }, [takeover.active]);

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 30000); 
    const clock = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => { clearInterval(interval); clearInterval(clock); };
  }, [loadAllData]);

  useEffect(() => {
    if (takeover.active) return;
    const t = setInterval(() => setCurrentView(v => v === 'alerts' ? 'weekly' : 'alerts'), 45000);
    return () => clearInterval(t);
  }, [takeover.active]);

  if (initialLoading) return (
    <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center text-white">
      <Loader2 className="w-16 h-16 animate-spin text-emerald-500 mb-4" />
      <h2 className="text-2xl font-bold italic" dir="rtl">טוען את המנחיל LIVE... 🚀</h2>
    </div>
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 text-slate-900 overflow-hidden font-sans select-none" dir="rtl">
      
      {/* Header */}
      <header className="h-[12vh] flex items-center justify-between px-10 bg-white shadow-lg border-b-8 border-emerald-600 z-50 shrink-0">
        <div className="flex items-center gap-6">
          <div className="p-1 bg-white rounded-2xl shadow-md border border-slate-100 w-20 h-20 flex items-center justify-center overflow-hidden">
            <img src={schoolLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
          </div>
          <div>
            <h1 className="text-5xl font-black text-slate-800 tracking-tighter">המנחיל <span className="text-emerald-600">LIVE</span></h1>
            <p className="text-slate-500 font-bold text-sm tracking-widest text-right uppercase">Campus News Hub</p>
          </div>
        </div>
        <div className="bg-slate-800 text-emerald-400 px-8 py-2 rounded-3xl text-5xl font-mono font-black shadow-inner">
          {currentTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 relative bg-slate-200 overflow-hidden">
        {takeover.active && takeover.url ? (
          /* Presentation / Takeover Mode */
          <div className="h-full w-full bg-black rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white relative animate-in-fast">
            <div className="absolute top-4 right-4 bg-red-600 text-white px-6 py-2 rounded-full font-black z-20 animate-pulse text-xl shadow-xl flex items-center gap-3">
              <div className="w-3 h-3 bg-white rounded-full"></div> שידור מיוחד 📺
            </div>
            <iframe 
              src={takeover.url} 
              className="w-full h-full border-none bg-white" 
              title="Presentation View" 
              allow="autoplay; encrypted-media" 
            />
          </div>
        ) : (
          /* Regular Dashboard View */
          <div className="h-full w-full flex gap-6 overflow-hidden animate-in-fast">
             {currentView === 'alerts' ? (
               <>
                 {/* News Alerts - Infinite Scroll */}
                 <div className="flex-[2.5] bg-white rounded-[4rem] shadow-2xl overflow-hidden flex flex-col border-2 border-slate-200 h-full">
                   <div className="p-8 bg-emerald-600 text-white flex items-center gap-6 shrink-0 z-10 shadow-md">
                     <Megaphone size={45} />
                     <h2 className="text-5xl font-black italic">הודעות ועדכונים 📢</h2>
                   </div>
                   <div className="flex-1 relative overflow-hidden bg-slate-50">
                     <div className="p-8 space-y-8 animate-infinite-scroll">
                       {[...sheetData.alerts, ...sheetData.alerts].map((a, i) => (
                         <div key={i} className={`p-10 rounded-[3rem] border-r-[20px] shadow-xl transition-all duration-500 ${
                           a.type === 'red' ? 'bg-red-50 border-red-500' : 
                           a.type === 'orange' ? 'bg-orange-50 border-orange-500' : 'bg-white border-emerald-500'
                         }`}>
                           <h3 className="text-5xl font-black mb-4 text-slate-900 leading-tight">{a.title}</h3>
                           <p className="text-3xl font-bold text-slate-700 leading-snug whitespace-pre-wrap">{a.content}</p>
                           {a.media && <img src={a.media} className="mt-8 rounded-3xl max-h-[35vh] w-full object-cover shadow-2xl" alt="Media" />}
                         </div>
                       ))}
                       {sheetData.alerts.length === 0 && (
                          <div className="h-full flex flex-col items-center justify-center text-slate-300 py-40">
                            <Star size={100} className="mb-4 opacity-20" />
                            <p className="text-4xl font-black text-slate-400">אין הודעות חדשות כרגע ✨</p>
                          </div>
                       )}
                     </div>
                   </div>
                 </div>

                 {/* Daily Changes - Fast Scroll */}
                 <div className="flex-1 bg-slate-900 rounded-[4rem] shadow-2xl overflow-hidden flex flex-col border-8 border-slate-800 h-full">
                    <div className="p-8 bg-orange-600 text-white flex items-center gap-5 shrink-0 z-10 shadow-lg">
                      <AlertTriangle size={40} className="animate-pulse" />
                      <h2 className="text-4xl font-black italic">שינויים 🚨</h2>
                    </div>
                    <div className="flex-1 relative overflow-hidden">
                      <div className="p-6 space-y-6 animate-infinite-scroll-fast">
                        {[...sheetData.changes, ...sheetData.changes].map((c, i) => (
                          <div key={i} className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-sm">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-orange-400 font-black text-4xl italic tracking-tighter">כיתה {c.k}</span>
                              <span className="bg-slate-800 px-4 py-1 rounded-xl font-bold text-slate-300 text-xl">שעה {c.h}</span>
                            </div>
                            <p className="text-white text-3xl font-black">{c.s}</p>
                            <p className="text-slate-400 italic text-xl mt-1">{c.n}</p>
                          </div>
                        ))}
                        {sheetData.changes.length === 0 && (
                          <div className="h-full flex flex-col items-center justify-center opacity-20 text-white py-40 text-center px-4">
                             <CheckCircle2 size={100} className="text-emerald-500 mb-4" />
                             <p className="text-3xl font-black">הכל כרגיל היום! ✅</p>
                          </div>
                        )}
                      </div>
                    </div>
                 </div>
               </>
             ) : (
               /* Weekly Schedule View */
               <div className="w-full h-full bg-slate-900 rounded-[5rem] shadow-2xl overflow-hidden flex flex-col border-[12px] border-indigo-600/30">
                  <div className="p-10 bg-gradient-to-l from-indigo-700 via-indigo-800 text-white flex justify-between items-center shrink-0">
                    <h2 className="text-6xl font-black italic flex items-center gap-6">
                      <Calendar size={75} /> תכנון שבועי 📅
                    </h2>
                    <span className="text-4xl font-black bg-black/30 px-10 py-4 rounded-full border border-white/10">
                      {weeklyData.fullRange}
                    </span>
                  </div>
                  
                  <div className="flex-1 p-6 bg-slate-950 flex flex-col overflow-hidden">
                    <table className="w-full border-separate border-spacing-x-4 border-spacing-y-2 h-full">
                      <thead>
                        <tr className="text-4xl font-black text-indigo-400">
                          <th className="p-6 text-right w-[12%]">כיתה</th>
                          {['א', 'ב', 'ג', 'ד', 'ה'].map(d => (
                            <th key={d} className="p-6">יום {d}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {weeklyData.rows.map((row, i) => (
                          <tr key={i} className="h-full">
                            <td className="bg-indigo-600 p-4 rounded-2xl text-white font-black italic text-5xl text-center shadow-lg">
                              {row.k}
                            </td>
                            {[row.d1, row.d2, row.d3, row.d4, row.d5].map((cell, ci) => (
                              <td key={ci} className={`p-4 rounded-2xl text-center align-middle transition-all ${
                                cell ? 'bg-white/10 border-2 border-indigo-500/30 text-white font-black text-3xl' : 'bg-white/5 opacity-10'
                              }`}>
                                {cell || "-"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               </div>
             )}
          </div>
        )}
      </main>

      {/* Bottom Marquee */}
      <footer className="h-[10vh] bg-emerald-800 flex items-center border-t-8 border-emerald-600 overflow-hidden shadow-2xl shrink-0 z-50">
        <div className="flex whitespace-nowrap animate-marquee">
          {(sheetData.marquee.length > 0 ? [...sheetData.marquee, ...sheetData.marquee, ...sheetData.marquee] : ["ברוכים הבאים למנחיל Live! ✨"]).map((text, i) => (
            <div key={i} className="flex items-center mx-20 shrink-0">
              <Star className="text-yellow-300 fill-current" size={35} />
              <span className="text-white text-5xl font-black mr-12 italic">{text}</span>
            </div>
          ))}
        </div>
      </footer>

      <style>{`
        @keyframes infinite-scroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        
        .animate-infinite-scroll {
          animation: infinite-scroll 60s linear infinite;
        }
        
        .animate-infinite-scroll-fast {
          animation: infinite-scroll 40s linear infinite;
        }

        @keyframes marquee { 
          from { transform: translateX(0); } 
          to { transform: translateX(100%); } 
        }
        
        .animate-marquee { 
          animation: marquee 80s linear infinite; 
          display: flex; 
          width: max-content; 
        }

        .animate-in-fast {
          animation: fastIn 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        @keyframes fastIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default App;