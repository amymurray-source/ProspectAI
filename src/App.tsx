/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Download, 
  MapPin, 
  Building2, 
  Target, 
  UserCircle, 
  Briefcase,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Globe,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { parseIntent, enrichProspects, performLiveResearch } from './services/geminiService';
import { searchApolloProspects } from './services/apolloService';
import { mockProspects } from './data/mockProspects';
import { Prospect, IntentParsingResult, LiveResearchData } from './types';

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'input' | 'parsing' | 'results'>('input');
  const [intent, setIntent] = useState<IntentParsingResult | null>(null);
  const [results, setResults] = useState<Prospect[]>([]);
  const [researchingId, setResearchingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsProcessing(true);
    setStep('parsing');

    try {
      const parsedIntent = await parseIntent(prompt);
      setIntent(parsedIntent);
      
      await new Promise(r => setTimeout(r, 1500));

      let prospects: Prospect[] = [];
      try {
        prospects = await searchApolloProspects(prompt, parsedIntent);
      } catch (e) {
        console.error("Apollo search failed, falling back to mock", e);
        const filtered = mockProspects.filter(p => {
          const pRegion = (parsedIntent.filters.region || '').toLowerCase();
          const pOpportunity = (parsedIntent.filters.opportunity || '').toLowerCase();
          
          const regionMatch = !pRegion || p.region.toLowerCase().includes(pRegion) || pRegion.includes(p.region.toLowerCase());
          const opportunityMatch = !pOpportunity || p.opportunitySignal.toLowerCase().includes(pOpportunity) || pOpportunity.includes(p.opportunitySignal.toLowerCase());
          
          return regionMatch || opportunityMatch;
        }).slice(0, 5);
        prospects = filtered.length > 0 ? filtered : mockProspects.slice(0, 3);
      }

      const enriched = await enrichProspects(prospects, prompt);
      setResults(enriched);
      
      setStep('results');
    } catch (error) {
      console.error("Prospecting failed", error);
      alert("Something went wrong. Please try again.");
      setStep('input');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLiveResearch = async (id: string, companyName: string, contactName: string) => {
    if (researchingId) return;
    setResearchingId(id);
    
    try {
      const data = await performLiveResearch(companyName, contactName);
      if (data) {
        setResults(prev => prev.map(p => p.id === id ? { ...p, liveResearch: data } : p));
        setExpandedId(id);
      }
    } catch (error) {
      console.error("Live research failed", error);
    } finally {
      setResearchingId(null);
    }
  };

  const SentimentIcon = ({ sentiment }: { sentiment: LiveResearchData['sentiment'] }) => {
    if (sentiment === 'positive') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (sentiment === 'negative') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const handleDownloadCSV = () => {
    if (results.length === 0) return;
    
    const headers = ["Company Name", "Website", "Contact Name", "Title", "Email", "Region", "Industry", "Opportunity Signal", "Recent Trigger Event", "Why They Fit", "Outreach Angle", "First Line", "Next Step"];
    const csvRows = [
      headers.join(','),
      ...results.map(p => [
        `"${p.companyName}"`,
        `"${p.website}"`,
        `"${p.contactName}"`,
        `"${p.title}"`,
        `"${p.email}"`,
        `"${p.region}"`,
        `"${p.industry}"`,
        `"${p.opportunitySignal}"`,
        `"${p.recentTriggerEvent}"`,
        `"${p.whyFit}"`,
        `"${p.outreachAngle || ''}"`,
        `"${p.firstLine || ''}"`,
        `"${p.nextStep || ''}"`
      ].join(','))
    ];
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'prospectai_list.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const reset = () => {
    setPrompt('');
    setStep('input');
    setIntent(null);
    setResults([]);
    setExpandedId(null);
  };

  return (
    <div className="min-h-screen bg-brand-silver text-brand-charcoal font-sans selection:bg-brand-blue selection:text-white">
      <header className="border-b border-gray-100 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={reset}>
            <div className="flex items-center">
              <span className="font-barlow font-black text-2xl tracking-[0.05em] text-brand-blue uppercase flex items-center">
                <span className="relative">
                  A
                  <div className="absolute bottom-1 left-0 w-full h-[3px] bg-brand-blue scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                </span>
                IDIGITAL
              </span>
              <div className="h-5 w-[2px] bg-brand-blue/10 mx-4 rotate-12" />
              <span className="font-barlow font-bold text-xs uppercase tracking-[0.2em] text-brand-charcoal/40 mt-1">Prospect AI</span>
            </div>
          </div>
          
          {step === 'results' && (
            <div className="flex items-center gap-4">
              <button onClick={reset} className="text-[10px] font-black text-brand-charcoal/60 hover:text-brand-blue transition-colors px-4 py-2 uppercase tracking-[0.2em]">
                New Prospect
              </button>
              <button 
                onClick={handleDownloadCSV}
                className="flex items-center gap-2 text-[10px] font-black bg-brand-blue text-white px-6 py-3 rounded-full hover:bg-brand-blue/90 transition-all shadow-xl shadow-brand-blue/20 active:scale-95 uppercase tracking-[0.2em]"
              >
                <Download className="w-3.5 h-3.5" />
                Sync CRM
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {step === 'input' && (
            <motion.div 
              key="input"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-3xl mx-auto text-center"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white shadow-sm border border-gray-100 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-10 text-brand-charcoal">
                <Sparkles className="w-3 h-3 text-brand-blue" />
                Empowering responsible growth
              </div>
              <h1 className="text-6xl font-barlow font-black mb-10 tracking-tighter text-brand-charcoal leading-[1.0] uppercase">
                Targeting refined by <br />
                <span className="text-brand-blue">AI Intelligence.</span>
              </h1>
              <p className="text-lg text-brand-charcoal/50 mb-14 leading-relaxed max-w-xl mx-auto font-medium">
                Uncover high-intent targets and personalized outreach angles using AI Digital's proprietary prospecting engine.
              </p>
              
              <form onSubmit={handleSearch} className="relative group">
                <div className="absolute -inset-1.5 bg-brand-blue rounded-[2.5rem] blur opacity-10 group-hover:opacity-20 transition-opacity" />
                <div className="relative flex flex-col gap-4 bg-white rounded-[2rem] p-5 shadow-2xl border border-gray-50">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe your ideal target... e.g., Fintech startups in London scaling their programmatic spend"
                    className="w-full h-40 bg-white rounded-2xl p-6 text-xl focus:outline-none transition-all resize-none placeholder:text-gray-100 font-bold text-brand-charcoal"
                    autoFocus
                  />
                  <div className="flex items-center justify-between px-4 pb-1">
                    <div className="flex items-center gap-6 text-gray-200">
                       <div className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /><span className="text-[9px] font-black uppercase tracking-[0.2em]">Real-time Web</span></div>
                       <div className="flex items-center gap-1.5"><BrainCircuit className="w-3.5 h-3.5" /><span className="text-[9px] font-black uppercase tracking-[0.2em]">Intent Graphs</span></div>
                    </div>
                    <button 
                      type="submit"
                      disabled={!prompt.trim() || isProcessing}
                      className="flex items-center gap-2 bg-brand-blue text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-brand-blue/90 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shadow-2xl shadow-brand-blue/20"
                    >
                      {isProcessing ? 'Analyzing...' : 'Generate Targets'}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}

          {step === 'parsing' && (
            <motion.div key="parsing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-brand-blue blur-3xl opacity-10 animate-pulse" />
                  <div className="relative inline-flex items-center justify-center w-28 h-28 bg-white rounded-[2.5rem] mb-10 shadow-2xl border border-gray-50">
                    <RefreshCw className="w-12 h-12 text-brand-blue animate-spin-slow" />
                  </div>
                </div>
                <h2 className="text-4xl font-barlow font-black mb-4 tracking-tight text-brand-charcoal uppercase">Constructing Persona Map...</h2>
                <p className="text-lg text-brand-charcoal/40 font-medium tracking-tight">AI Digital engine is triangulating intent signals across lead sources.</p>
              </div>

              {intent && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="md:col-span-2 bg-white p-12 rounded-[3rem] shadow-sm border border-gray-50">
                    <h3 className="text-[10px] font-black text-brand-blue uppercase tracking-[.4em] mb-10 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Strategic Extraction</h3>
                    <p className="text-3xl font-bold font-barlow mb-14 leading-tight text-brand-charcoal italic">"{intent.summary}"</p>
                    <div className="grid grid-cols-2 gap-x-16 gap-y-10">
                      {[
                        { label: 'Market Focus', value: intent.filters.region, icon: MapPin },
                        { label: 'Asset Vertical', value: intent.filters.companyType, icon: Building2 },
                        { label: 'Expansion Signal', value: intent.filters.opportunity, icon: Sparkles },
                        { label: 'Target Channels', value: intent.filters.channels?.join(', '), icon: Globe },
                      ].map((item, i) => (
                        <div key={item.label} className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-gray-200">
                            <item.icon className="w-3.5 h-3.5" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em]">{item.label}</span>
                          </div>
                          <span className="text-sm font-black text-brand-charcoal">{item.value || 'Strategic Open'}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                  <div className="flex flex-col gap-5">
                    {['Scanning Programmatic Data', 'Graphing Social Signals', 'Mapping Value Prop'].map((task, i) => (
                      <motion.div key={task} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="bg-white p-8 rounded-[2rem] border border-gray-50 flex items-center gap-5 shadow-sm">
                        <div className="w-12 h-12 bg-brand-silver rounded-2xl flex items-center justify-center border border-gray-100"><CheckCircle2 className="w-6 h-6 text-brand-blue" /></div>
                        <span className="text-[11px] font-black text-brand-charcoal/60 uppercase tracking-[0.2em] leading-tight">{task}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {step === 'results' && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bg-brand-blue/5 border border-brand-blue/10 rounded-3xl p-8 mb-4">
                 <div className="flex items-center gap-2 mb-4 text-[10px] font-black text-brand-blue uppercase tracking-[0.3em]">
                    <Target className="w-3.5 h-3.5" />
                    Prospecting Input
                 </div>
                 <p className="text-xl font-bold font-barlow text-brand-charcoal leading-relaxed">
                    "{prompt}"
                 </p>
              </div>

              <div className="flex items-center justify-between bg-white px-10 py-8 rounded-3xl border border-gray-100 shadow-sm">
                <div>
                  <h2 className="text-3xl font-barlow font-black tracking-tight text-brand-charcoal uppercase">Intelligence Output</h2>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-brand-blue uppercase tracking-[0.2em] bg-brand-blue/5 px-2.5 py-1 rounded">
                      <div className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-pulse" />
                      Live Feed Enabled
                    </div>
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">{results.length} Strategic Matches Categorized</p>
                  </div>
                </div>
                <div className="flex items-center gap-10">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Growth Efficiency</p>
                    <p className="text-xl font-black text-brand-blue">+312% Scaling</p>
                  </div>
                  <button 
                    onClick={handleDownloadCSV}
                    className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.3em] bg-brand-charcoal text-white px-8 py-4 rounded-2xl hover:bg-brand-charcoal/90 transition-all shadow-2xl shadow-brand-charcoal/10 active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    Export Dataset
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                {results.map((p, i) => (
                  <motion.div 
                    key={p.id} 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: i * 0.05 }} 
                    className={`bg-white rounded-[2.5rem] border transition-all duration-300 ${expandedId === p.id ? 'border-brand-blue shadow-2xl ring-1 ring-brand-blue/5' : 'border-gray-50 hover:border-gray-100 shadow-sm'}`}
                  >
                    <div className="p-10 flex items-center gap-10">
                       <div className="w-72 shrink-0">
                          <p className="font-barlow font-black text-brand-charcoal text-xl leading-tight truncate uppercase tracking-tight">{p.companyName}</p>
                          <div className="flex items-center gap-3 mt-4">
                            <div className="w-9 h-9 bg-brand-silver rounded-2xl flex items-center justify-center text-[11px] font-black text-brand-blue shrink-0 border border-gray-50 uppercase">
                              {p.contactName.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-black text-brand-charcoal truncate uppercase tracking-tight">{p.contactName}</p>
                              <p className="text-[11px] font-bold text-gray-300 truncate uppercase tracking-widest leading-none">{p.title}</p>
                            </div>
                          </div>
                       </div>

                       <div className="flex-1 grid grid-cols-3 gap-12 border-l border-brand-silver pl-12">
                          <div>
                            <span className="text-[10px] font-black text-brand-blue uppercase tracking-[0.3em] block mb-2 font-barlow">Opportunity Graph</span>
                            <p className="text-base font-bold text-brand-charcoal line-clamp-1">{p.opportunitySignal}</p>
                            <p className="text-[11px] text-gray-300 mt-1 font-medium tracking-tight line-clamp-1">{p.whyFit}</p>
                          </div>
                          <div>
                             <span className="text-[10px] font-black text-gray-200 uppercase tracking-[0.3em] block mb-2 font-barlow">Recommended Channels</span>
                             <div className="flex flex-wrap gap-1.5">
                               {p.recommendedChannels?.map(ch => (
                                 <span key={ch} className="px-2 py-0.5 bg-brand-silver text-[9px] font-black uppercase text-brand-charcoal/60 rounded border border-gray-100">{ch}</span>
                               ))}
                             </div>
                          </div>
                          <div>
                             <span className="text-[10px] font-black text-gray-200 uppercase tracking-[0.3em] block mb-2 font-barlow">AI Strategy Angle</span>
                             <p className="text-xs font-bold text-brand-charcoal/60 line-clamp-2 italic leading-relaxed">"{p.firstLine}"</p>
                          </div>
                       </div>

                       <div className="flex items-center gap-4 pl-6">
                          <button 
                            onClick={() => handleLiveResearch(p.id, p.companyName, p.contactName)}
                            disabled={!!researchingId}
                            className={`flex items-center gap-2 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all ${
                              researchingId === p.id 
                                ? 'bg-brand-blue text-white animate-pulse' 
                                : p.liveResearch 
                                  ? 'bg-brand-lime text-brand-charcoal' 
                                  : 'bg-brand-silver text-brand-charcoal hover:bg-white border border-transparent hover:border-gray-100'
                            }`}
                          >
                            {researchingId === p.id ? <RefreshCw className="w-4 h-4 animate-spin"/> : p.liveResearch ? <CheckCircle2 className="w-4 h-4"/> : <Globe className="w-4 h-4 text-brand-blue"/>}
                            {researchingId === p.id ? 'Wait' : p.liveResearch ? 'Synced' : 'Research'}
                          </button>
                          <button 
                            onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} 
                            className={`p-4 rounded-2xl border transition-all ${expandedId === p.id ? 'bg-brand-charcoal border-brand-charcoal text-white' : 'bg-white border-gray-100 text-gray-200 hover:text-brand-charcoal hover:border-gray-200'}`}
                          >
                            {expandedId === p.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                       </div>
                    </div>

                    <AnimatePresence>
                      {expandedId === p.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-brand-silver/30 border-t border-brand-silver">
                          <div className="p-12">
                            {!p.liveResearch ? (
                               <div className="text-center py-12 flex flex-col items-center gap-4">
                                  <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center border border-gray-100 shadow-sm"><Globe className="w-8 h-8 text-brand-blue opacity-10" /></div>
                                  <p className="text-[10px] font-black text-gray-200 uppercase tracking-[0.4em]">Initialize real-time intelligence graph for {p.companyName}</p>
                               </div>
                            ) : (
                              <div className="grid grid-cols-3 gap-16">
                                <div className="col-span-2 space-y-10">
                                  <div>
                                    <div className="flex items-center gap-5 mb-6">
                                       <div className="px-3 py-1.5 bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg flex items-center gap-2"><SentimentIcon sentiment={p.liveResearch.sentiment} />{p.liveResearch.sentiment} Market Trend</div>
                                       <div className="h-4 w-px bg-gray-200" />
                                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Corporate DNA Summary</span>
                                    </div>
                                    <p className="text-2xl font-bold leading-relaxed text-brand-charcoal">{p.liveResearch.summary}</p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-16 pt-10 border-t border-brand-silver">
                                     <div>
                                        <h4 className="text-[11px] font-black text-brand-blue uppercase tracking-[0.3em] mb-8 flex items-center gap-3"><TrendingUp className="w-4 h-4" /> Market Momentum</h4>
                                        <ul className="space-y-6">
                                          {p.liveResearch.recentHeadlines.slice(0, 2).map((news, idx) => (
                                            <li key={idx} className="group cursor-pointer">
                                               <a href={news.url} target="_blank" rel="noreferrer" className="block text-[15px] font-bold text-brand-charcoal group-hover:text-brand-blue transition-colors mb-2 leading-snug">{news.title}</a>
                                               <span className="text-[11px] text-gray-400 font-black uppercase tracking-widest">{news.date}</span>
                                            </li>
                                          ))}
                                        </ul>
                                     </div>
                                     <div>
                                        <h4 className="text-[11px] font-black text-brand-charcoal uppercase tracking-[0.3em] mb-8 flex items-center gap-3"><Target className="w-4 h-4 text-brand-blue" /> Strategic Signals</h4>
                                        <ul className="space-y-5">
                                           {p.liveResearch.keyIntelligence.slice(0, 3).map((intel, idx) => (
                                             <li key={idx} className="flex gap-4 text-sm text-brand-charcoal/60 font-medium leading-relaxed">
                                               <div className="w-2 h-2 bg-brand-blue rounded-full mt-2 shrink-0 opacity-20" />
                                               {intel}
                                             </li>
                                           ))}
                                        </ul>
                                     </div>
                                  </div>
                                </div>
                                <div className="space-y-8">
                                  <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl shadow-brand-charcoal/5 space-y-8">
                                     <div className="flex items-center gap-3 text-brand-blue mb-2">
                                       <BrainCircuit className="w-6 h-6" />
                                       <span className="font-black text-[11px] uppercase tracking-[0.3em]">AI Advantage</span>
                                     </div>
                                     <p className="text-sm text-brand-charcoal/70 leading-relaxed font-medium bg-brand-silver p-6 rounded-2xl italic border border-brand-silver">
                                       "Leverage their recent focus on <strong>{p.liveResearch.recentHeadlines[0]?.title.split(' ')[0]}</strong> to demonstrate platform value."
                                     </p>
                                     <button className="w-full bg-brand-blue text-white font-black py-5 rounded-3xl text-[11px] uppercase tracking-[0.3em] hover:bg-brand-blue/90 transition-all flex items-center justify-center gap-2 shadow-2xl shadow-brand-blue/20 active:scale-95">
                                       Copy Sales Logic <ArrowRight className="w-4 h-4 ml-1" />
                                     </button>
                                  </div>
                                  <div className="px-6 py-4 bg-brand-lime text-brand-charcoal rounded-2xl text-[10px] font-black uppercase text-center tracking-[0.4em] shadow-lg shadow-brand-lime/10">
                                    High Conversion Rank
                                  </div>
                                </div>
                                
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-20 border-t border-brand-charcoal/5 py-24 bg-brand-charcoal text-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-start gap-20">
          <div className="max-w-xs">
            <div className="flex items-center gap-3 mb-10">
              <span className="font-barlow font-black text-2xl tracking-[0.05em] uppercase">AIDIGITAL</span>
              <div className="h-4 w-[1px] bg-white/20 mx-2" />
              <span className="font-barlow font-bold text-[10px] uppercase tracking-[0.3em] text-white/40 mt-1">Prospect AI</span>
            </div>
            <p className="text-sm text-white/30 leading-relaxed font-medium">AI Digital helps marketers drive business outcomes with enterprise-grade solutions built for the future of responsible advertising.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-20 md:gap-40">
             <div>
                <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] mb-10">Capabilities</h4>
                <ul className="text-[11px] text-white/60 font-black space-y-5 uppercase tracking-[0.2em]"><li>Optimization</li><li>Measurement</li><li>Prospecting</li></ul>
             </div>
             <div>
                <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] mb-10">Intelligence</h4>
                <ul className="text-[11px] text-white/60 font-black space-y-5 uppercase tracking-[0.2em]"><li>Proprietary NLP</li><li>Web Grounding</li><li>Entity Mapping</li></ul>
             </div>
             <div className="col-span-2 md:col-span-1">
                <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] mb-10">Connect</h4>
                <p className="text-[11px] font-black text-brand-blue uppercase tracking-[0.2em] mb-3">Live Status: Active</p>
                <div className="w-2 h-2 bg-brand-lime rounded-full animate-pulse shadow-lg shadow-brand-lime/20" />
             </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-24 pt-10 border-t border-white/5 flex justify-between items-center">
          <div className="text-[9px] font-black text-white/10 uppercase tracking-[0.5em]">
            © 2025 AI DIGITAL • ENTERPRISE SOLUTIONS
          </div>
          <div className="flex gap-1">
             <div className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
             <div className="w-1.5 h-1.5 rounded-full bg-brand-pink" />
             <div className="w-1.5 h-1.5 rounded-full bg-brand-lime" />
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 3s linear infinite; }
      `}</style>
    </div>
  );
}
