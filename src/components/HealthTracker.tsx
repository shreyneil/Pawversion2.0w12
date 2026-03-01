
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Pet, HealthLog } from '../types';
import { 
  FileText, 
  PlusCircle, 
  Thermometer, 
  ShieldCheck, 
  MapPin, 
  Navigation, 
  Stethoscope, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Star, 
  X, 
  Activity, 
  Syringe, 
  Pill, 
  History, 
  Plus, 
  Upload, 
  File, 
  Zap, 
  Info, 
  Phone, 
  SlidersHorizontal, 
  Check,
  ArrowRight,
  Shield,
  ExternalLink,
  Calendar
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface Props {
  pets: Pet[];
  logs: HealthLog[];
  onAddLog: (log: HealthLog) => void;
}

interface VetInfo {
  name: string;
  address?: string;
  distance?: string;
  rating?: number;
  specialty?: string;
  uri: string;
  phone?: string;
  isOpen?: boolean;
}

const HealthTracker: React.FC<Props> = ({ pets, logs, onAddLog }) => {
  const [view, setView] = useState<'tracker' | 'vets' | 'history'>('tracker');
  const [activeSpecialty, setActiveSpecialty] = useState('General');
  
  // Pet Selection State
  const [selectedPetId, setSelectedPetId] = useState<string>(pets[0]?.id || '');

  // Vet Search State
  const [vetList, setVetList] = useState<VetInfo[]>([]);
  const [vetCache, setVetCache] = useState<Record<string, VetInfo[]>>({});
  const [isLoadingVets, setIsLoadingVets] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortOption, setSortOption] = useState<'distance' | 'rating'>('distance');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const listRef = useRef<HTMLDivElement>(null);

  // Modals & Selection
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);
  const [isAddTempOpen, setIsAddTempOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<HealthLog | null>(null);
  const [showVaxDetails, setShowVaxDetails] = useState(false);

  useEffect(() => {
    if (pets.length > 0 && !pets.find(p => p.id === selectedPetId)) {
        setSelectedPetId(pets[0].id);
    }
  }, [pets]);

  useEffect(() => {
    locateUser();
  }, []);

  const selectedPet = useMemo(() => pets.find(p => p.id === selectedPetId) || pets[0], [pets, selectedPetId]);

  // Filter logs for selected pet
  const petLogs = useMemo(() => {
      return logs.filter(l => l.petId === selectedPetId);
  }, [logs, selectedPetId]);

  // Calculate Average Temp from Logs (Selected Pet)
  const avgTemp = useMemo(() => {
    const tempLogs = petLogs.filter(l => l.type === 'Temperature' && l.value);
    if (tempLogs.length === 0) return 'N/A';
    
    const sum = tempLogs.reduce((acc, curr) => acc + parseFloat(curr.value || '0'), 0);
    return (sum / tempLogs.length).toFixed(1);
  }, [petLogs]);

  // Calculate Vaccine Status (Selected Pet)
  const vaxData = useMemo(() => {
    if (!selectedPet) return { status: '0/0', details: [] };

    const CORE_VACCINES: Record<string, string[]> = {
        'Dog': ['Rabies', 'DHPP', 'Bordetella', 'Leptospirosis'],
        'Cat': ['Rabies', 'FVRCP', 'FeLV'],
        'Rabbit': ['Myxomatosis', 'RHD'],
        'Bird': ['Polyomavirus'],
        'Other': ['Rabies']
    };

    const species = selectedPet.species || 'Other';
    const cores = CORE_VACCINES[species] || CORE_VACCINES['Other'];
    let satisfied = 0;
    
    const details = cores.map(vName => {
        const hasLog = petLogs.some(l => 
            l.type === 'Vaccination' && 
            (l.description.includes(vName) || (l.value && l.value.includes(vName)))
        );
        if (hasLog) satisfied++;
        return { 
            petName: selectedPet.name,
            vaccine: vName, 
            completed: hasLog 
        };
    });
    
    return {
        status: `${satisfied}/${cores.length}`,
        details
    };
  }, [selectedPet, petLogs]);

  const locateUser = async () => {
    setIsLocating(true);
    setLocationError(null);

    const fallbackToIp = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data.latitude && data.longitude) {
          setLocation({ lat: data.latitude, lng: data.longitude });
          setIsLocating(false);
        } else {
          throw new Error("Invalid IP data");
        }
      } catch (e) {
        console.warn("IP Geolocation failed:", e);
        setLocationError("Could not determine location.");
        setIsLocating(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setIsLocating(false);
        },
        async (err) => {
          console.warn("Native geolocation denied/failed, trying IP...", err);
          await fallbackToIp();
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    } else {
      await fallbackToIp();
    }
  };

  const getFallbackCard = (spec: string): VetInfo => ({
      name: `Find ${spec} Veterinarians`,
      address: "Tap to see results on Google Maps",
      distance: "Search",
      rating: 5.0,
      specialty: spec,
      uri: `https://www.google.com/maps/search/${spec}+veterinarian`,
      isOpen: true
  });

  const fetchVets = async (specialty: string, forceRefresh = false) => {
    if (!location && isLocating) return;

    setActiveSpecialty(specialty);

    if (!forceRefresh && vetCache[specialty] && vetCache[specialty].length > 0) {
        setVetList(vetCache[specialty]);
        setCurrentPage(1);
        return;
    }
    
    setIsLoadingVets(true);
    if (forceRefresh) setVetList([]); 
    setLocationError(null);

    try {
      if (!location) {
          setVetList([getFallbackCard(specialty)]);
          setIsLoadingVets(false);
          return;
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Find 5 ${specialty === 'General' ? 'veterinary clinics' : specialty + ' veterinarians'} near the provided location. Return using Google Maps tool.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            tools: [{ googleMaps: {} }],
            toolConfig: { 
                retrievalConfig: {
                    latLng: {
                        latitude: location.lat,
                        longitude: location.lng
                    }
                }
            } 
        }
      });
      
      let parsedVets: VetInfo[] = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      
      if (chunks.length > 0) {
          parsedVets = chunks.map((c: any) => {
            const src = c.maps || c.web;
            if (!src) return null;
            return {
                name: src.title,
                uri: src.googleMapsUri || src.uri,
                specialty: specialty,
                address: src.address || 'View details on map',
                distance: 'Nearby',
                rating: 4.8,
                isOpen: true
            };
        }).filter((v: any) => v && v.name && v.uri);
      }

      if (parsedVets.length === 0) {
          parsedVets = [getFallbackCard(specialty)];
      }

      const uniqueVets = Array.from(new Map(parsedVets.map(v => [v.name, v])).values());
      
      setVetList(uniqueVets);
      setVetCache(prev => ({ ...prev, [specialty]: uniqueVets }));
      setCurrentPage(1);

    } catch (e: any) {
      console.error("Error fetching vets:", e);
      setVetList([getFallbackCard(specialty)]);
    } finally {
      setIsLoadingVets(false);
    }
  };

  const handleDirections = (vet: VetInfo) => {
    if (vet.uri && vet.uri.startsWith('http')) {
        window.open(vet.uri, '_blank');
    } else {
        const query = encodeURIComponent(`${vet.name} ${vet.address || ''}`);
        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };

  useEffect(() => {
    if (view === 'vets' && !isLoadingVets) {
      const isPlaceholder = vetList.length === 1 && vetList[0].distance === "Search";
      
      if (location) {
         if (vetList.length === 0 || isPlaceholder) {
             fetchVets(activeSpecialty, true);
         }
      } else if (!isLocating && vetList.length === 0) {
         fetchVets(activeSpecialty);
      }
    }
  }, [view, location, isLocating]);

  const sortedVets = useMemo(() => {
      let sorted = [...vetList];
      if (sortOption === 'rating') {
          sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      }
      return sorted;
  }, [vetList, sortOption]);

  const totalPages = Math.ceil(sortedVets.length / itemsPerPage);
  const currentVets = sortedVets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (listRef.current) {
        listRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (view === 'history') {
    return (
      <div className="flex flex-col h-full bg-slate-50 animate-in slide-in-from-right duration-300">
         <div className="bg-white p-6 border-b border-slate-100 sticky top-0 z-20 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setView('tracker')}
                className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-600 active:scale-95 transition-all"
              >
                <ChevronLeft size={24} />
              </button>
              <div>
                  <h2 className="text-2xl font-black text-slate-900">Care Timeline</h2>
                  <p className="text-xs font-bold text-slate-400">{selectedPet?.name}</p>
              </div>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
            <div className="relative border-l-2 border-slate-200 ml-3 space-y-8 py-2 max-w-3xl mx-auto">
               {petLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((log, index) => {
                 const pet = pets.find(p => p.id === log.petId);
                 let Icon = FileText;
                 let colorClass = "bg-slate-500 border-slate-500";
                 let iconBg = "bg-slate-100 text-slate-500";

                 if (log.type === 'Vaccination') { Icon = Syringe; colorClass = "bg-green-500 border-green-500"; iconBg = "bg-green-100 text-green-600"; }
                 else if (log.type === 'Checkup') { Icon = Stethoscope; colorClass = "bg-blue-500 border-blue-500"; iconBg = "bg-blue-100 text-blue-600"; }
                 else if (log.type === 'Medication') { Icon = Pill; colorClass = "bg-purple-500 border-purple-500"; iconBg = "bg-purple-100 text-purple-600"; }
                 else if (log.type === 'Temperature') { Icon = Thermometer; colorClass = "bg-orange-500 border-orange-500"; iconBg = "bg-orange-100 text-orange-600"; }
                 else if (log.type === 'Weight') { Icon = Activity; colorClass = "bg-pink-500 border-pink-500"; iconBg = "bg-pink-100 text-pink-600"; }

                 return (
                   <div key={log.id} className="relative pl-8">
                      <div className={`absolute -left-[9px] top-6 w-4 h-4 rounded-full border-[3px] border-white ${colorClass} shadow-sm z-10`}></div>
                      <button 
                        onClick={() => setSelectedLog(log)}
                        className="w-full text-left bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100 active:scale-[0.98] transition-all hover:shadow-md group relative overflow-hidden"
                      >
                         <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-3">
                               <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                                  <Icon size={18} />
                               </div>
                               <div>
                                  <h4 className="font-bold text-slate-800 text-sm">{log.type}</h4>
                                  <span className="text-[10px] font-bold text-slate-400 block">{log.date}</span>
                               </div>
                            </div>
                            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg">
                               {pet && <img src={pet.image} alt={pet.name} className="w-4 h-4 rounded-full object-cover" />}
                               <span className="text-[10px] font-bold text-slate-600">{pet?.name}</span>
                            </div>
                         </div>
                         <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed pl-[3.25rem]">{log.description}</p>
                         {log.value && (
                            <div className="mt-2 pl-[3.25rem]">
                               <span className="inline-block px-2 py-1 bg-slate-100 rounded-md text-[10px] font-black text-slate-700">{log.value}</span>
                            </div>
                         )}
                         {log.attachments && log.attachments.length > 0 && (
                            <div className="flex items-center gap-1 mt-2 pl-[3.25rem] text-[10px] font-bold text-slate-400">
                               <File size={10} /> {log.attachments.length} Document{log.attachments.length > 1 ? 's' : ''}
                            </div>
                         )}
                         <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight size={20} />
                         </div>
                      </button>
                   </div>
                 );
               })}
               {petLogs.length === 0 && (
                 <div className="pl-8 text-slate-400 text-sm italic py-10">No records found for {selectedPet?.name}.</div>
               )}
            </div>
         </div>
         {selectedLog && (
            <LogDetailModal 
              log={selectedLog} 
              pets={pets}
              onClose={() => setSelectedLog(null)} 
            />
         )}
      </div>
    );
  }

  if (view === 'vets') {
    return (
      <div className="flex flex-col h-full bg-slate-50 animate-in slide-in-from-right duration-300">
        <div className="bg-white/95 backdrop-blur-md pt-6 pb-2 shadow-sm sticky top-0 z-30 border-b border-slate-100">
          <div className="flex items-center justify-between px-6 mb-4 max-w-5xl mx-auto w-full">
            <div className="flex items-center gap-4">
                <button 
                onClick={() => setView('tracker')}
                className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 active:scale-90 transition-all"
                >
                <ChevronLeft size={24} />
                </button>
                <div>
                    <h2 className="text-xl font-black text-slate-800 leading-none">Vet Connect</h2>
                    <div className="flex items-center gap-1 text-slate-400 mt-1">
                        <MapPin size={10} />
                        <span className="text-[10px] font-bold uppercase tracking-wider truncate max-w-[150px]">
                           {location ? "Nearby" : isLocating ? "Locating..." : "Online Mode"}
                        </span>
                    </div>
                </div>
            </div>
            <button 
                onClick={() => fetchVets(activeSpecialty, true)}
                className="p-2 bg-slate-50 text-slate-400 rounded-full hover:text-orange-500 active:rotate-180 transition-all"
            >
                <RefreshCw size={18} />
            </button>
          </div>
          
          <div className="flex items-center pl-6 gap-2 pb-2 max-w-5xl mx-auto w-full">
             <button 
               onClick={() => setIsFilterOpen(!isFilterOpen)}
               className={`h-10 px-4 rounded-xl border flex items-center gap-2 transition-all shrink-0 text-[10px] font-black uppercase tracking-wider ${isFilterOpen ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-600'}`}
             >
               <SlidersHorizontal size={14} /> Filter
             </button>

             <div className="flex-1 overflow-x-auto no-scrollbar flex gap-2 pr-6">
                {['General', 'Emergency', 'Dental', 'Surgeon', 'Dermatology'].map((spec) => (
                <button
                    key={spec}
                    onClick={() => fetchVets(spec)}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all active:scale-95 ${
                    activeSpecialty === spec
                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'
                    }`}
                >
                    {spec}
                </button>
                ))}
            </div>
          </div>

          {isFilterOpen && (
              <div className="px-6 pb-4 animate-in slide-in-from-top-2">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 max-w-lg mx-auto">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sort By</span>
                    </div>
                    <div className="flex gap-2">
                        <button 
                          onClick={() => setSortOption('distance')}
                          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 ${sortOption === 'distance' ? 'bg-white border-orange-500 text-orange-500 shadow-sm' : 'bg-white border-slate-200 text-slate-500'}`}
                        >
                            <Navigation size={14} /> Distance
                        </button>
                        <button 
                          onClick={() => setSortOption('rating')}
                          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 ${sortOption === 'rating' ? 'bg-white border-orange-500 text-orange-500 shadow-sm' : 'bg-white border-slate-200 text-slate-500'}`}
                        >
                            <Star size={14} /> Top Rated
                        </button>
                    </div>
                  </div>
              </div>
          )}
        </div>

        <div ref={listRef} className="p-6 space-y-4 pb-32 overflow-y-auto bg-slate-50 flex-1 scroll-smooth">
          {isLocating && !location && (
              <div className="flex flex-col items-center justify-center py-20 space-y-4 text-slate-400">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin"></div>
                  <span className="text-xs font-bold uppercase tracking-widest">Finding you...</span>
              </div>
          )}

          {locationError && !isLocating && (
             <div className="p-5 bg-red-50 text-red-600 rounded-2xl text-xs font-bold flex flex-col gap-3 border border-red-100 items-start max-w-lg mx-auto">
               <div className="flex items-center gap-2">
                 <AlertCircle size={18} /> 
                 <span>{locationError}</span>
               </div>
               <button onClick={locateUser} className="px-4 py-2 bg-white rounded-xl text-slate-900 shadow-sm text-[10px] uppercase border border-slate-100">Retry Location</button>
             </div>
          )}

          {!isLocating && !locationError && (
             <div className="max-w-5xl mx-auto">
               {isLoadingVets ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {[1, 2, 3].map(i => (
                     <div key={i} className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100 animate-pulse">
                        <div className="flex justify-between mb-4">
                            <div className="w-2/3 h-5 bg-slate-100 rounded-md"></div>
                            <div className="w-10 h-5 bg-slate-100 rounded-md"></div>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-md mb-2"></div>
                        <div className="w-1/2 h-3 bg-slate-100 rounded-md mb-6"></div>
                        <div className="flex gap-2">
                            <div className="flex-1 h-10 bg-slate-100 rounded-xl"></div>
                            <div className="flex-1 h-10 bg-slate-100 rounded-xl"></div>
                        </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="space-y-4">
                   {currentVets.length > 0 ? (
                     <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {currentVets.map((vet, idx) => (
                        <div key={idx} className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100 transition-all hover:shadow-lg group relative overflow-hidden animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                            <div className="flex justify-between items-start mb-3">
                            <div>
                                <h4 className="font-black text-slate-800 text-lg leading-tight mb-1">{vet.name}</h4>
                                <div className="flex items-center gap-2">
                                    {vet.isOpen !== undefined && (
                                        <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${vet.isOpen ? 'text-green-500' : 'text-red-500'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${vet.isOpen ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                            {vet.isOpen ? 'Open Now' : 'Closed'}
                                        </span>
                                    )}
                                    <span className="text-[10px] text-slate-300">•</span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{vet.specialty || activeSpecialty}</span>
                                </div>
                            </div>
                            {vet.rating && (
                                <div className="flex items-center gap-1 bg-yellow-50 px-2.5 py-1.5 rounded-xl text-yellow-600 text-xs font-black border border-yellow-100">
                                <Star size={12} fill="currentColor" /> 
                                <span>{vet.rating}</span>
                                </div>
                            )}
                            </div>
                            
                            <div className="flex items-start gap-2 mb-5 bg-slate-50 p-3 rounded-xl">
                            <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-slate-600 font-medium leading-relaxed">{vet.address || "Address available on map"}</p>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-2">
                                <button
                                    onClick={() => handleDirections(vet)}
                                    className="flex-1 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-blue-100"
                                >
                                    <Navigation size={14} /> Directions
                                </button>
                                <a 
                                    href={vet.phone ? `tel:${vet.phone}` : undefined}
                                    onClick={(e) => !vet.phone && handleDirections(vet)}
                                    className="flex-1 py-3 bg-slate-50 text-slate-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-slate-100"
                                >
                                    <Phone size={14} /> Call
                                </a>
                            </div>

                            {vet.distance && (
                                <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl">
                                    {vet.distance}
                                </div>
                            )}
                        </div>
                        ))}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-4 mt-6 pt-2 pb-6">
                                <button
                                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${currentPage === 1 ? 'text-slate-300 bg-slate-50 cursor-not-allowed' : 'bg-white text-slate-600 shadow-sm border border-slate-200 hover:border-orange-200 hover:text-orange-500'}`}
                                >
                                    <ChevronLeft size={16} /> Prev
                                </button>
                                
                                <span className="text-xs font-bold text-slate-400">
                                    {currentPage} / {totalPages}
                                </span>

                                <button
                                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${currentPage === totalPages ? 'text-slate-300 bg-slate-50 cursor-not-allowed' : 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800'}`}
                                >
                                    Next <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                     </>
                   ) : (
                     !locationError && (
                        <div className="text-center py-10 text-slate-400 text-sm font-medium">
                            <MapPin size={32} className="mx-auto mb-2 text-slate-200" />
                            <p>No veterinarians found nearby.</p>
                            <button onClick={() => fetchVets(activeSpecialty, true)} className="mt-4 text-orange-500 font-bold text-xs uppercase tracking-wide">Try Again</button>
                        </div>
                     )
                   )}
                 </div>
               )}
             </div>
          )}
        </div>
      </div>
    );
  }

  // Main Tracker View
  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500 pb-32">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Health Track</h2>
            <button 
            onClick={() => setView('history')}
            className="text-orange-500 font-black text-xs uppercase tracking-widest bg-orange-50 px-3 py-1.5 rounded-full hover:bg-orange-100 transition-colors flex items-center gap-1"
            >
            <History size={14} /> History
            </button>
        </div>

        {/* Pet Selector for Multiple Pets */}
        {pets.length > 1 && (
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                {pets.map(pet => (
                    <button
                        key={pet.id}
                        onClick={() => setSelectedPetId(pet.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all ${selectedPetId === pet.id ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}
                    >
                        <img src={pet.image} alt={pet.name} className="w-6 h-6 rounded-full object-cover border border-white/20" />
                        <span className="text-xs font-bold">{pet.name}</span>
                    </button>
                ))}
            </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="md:col-span-1 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
          <button 
            onClick={() => setIsAddTempOpen(true)}
            className="absolute top-3 right-3 w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-orange-50 hover:text-orange-500 transition-colors z-20"
          >
            <Plus size={16} />
          </button>
          <div className="absolute top-0 right-0 w-20 h-20 bg-orange-50 rounded-bl-[2.5rem] -mr-6 -mt-6 z-0"></div>
          <Thermometer className="text-orange-500 relative z-10" size={24} />
          <div>
             <span className="text-2xl font-black text-slate-800 relative z-10">{avgTemp}{avgTemp !== 'N/A' && '°C'}</span>
             <div className="flex items-center gap-1">
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest relative z-10">Avg. Temp</span>
             </div>
          </div>
        </div>

        <div 
          className="md:col-span-1 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-2 relative group"
          onMouseLeave={() => setShowVaxDetails(false)}
        >
          <div className="absolute inset-0 rounded-[2rem] overflow-hidden pointer-events-none">
             <div className="absolute top-0 right-0 w-20 h-20 bg-green-50 rounded-bl-[2.5rem] -mr-6 -mt-6 z-0"></div>
          </div>

          <button 
             onClick={(e) => { e.stopPropagation(); setShowVaxDetails(!showVaxDetails); }}
             onMouseEnter={() => setShowVaxDetails(true)}
             className="absolute top-3 right-3 w-8 h-8 bg-white/50 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-400 hover:bg-green-100 hover:text-green-600 transition-colors z-20"
          >
             <Info size={16} />
          </button>

          {showVaxDetails && (
             <div className="absolute top-12 right-0 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-30 animate-in fade-in zoom-in-95 duration-200">
                 <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-50">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Core Vaccines</h4>
                    <button onClick={(e) => { e.stopPropagation(); setShowVaxDetails(false); }} className="text-slate-300 hover:text-slate-500"><X size={14} /></button>
                 </div>
                 <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                    {vaxData.details.map((item, i) => (
                       <div key={i} className="flex items-center justify-between group/item">
                          <div className="flex items-center gap-2.5">
                             <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${item.completed ? 'bg-green-500 border-green-500 text-white' : 'bg-slate-50 border-slate-200 text-slate-300'}`}>
                                {item.completed && <Check size={10} strokeWidth={4} />}
                             </div>
                             <span className={`text-xs font-bold ${item.completed ? 'text-slate-700' : 'text-slate-400'}`}>{item.vaccine}</span>
                          </div>
                       </div>
                    ))}
                 </div>
             </div>
          )}

          <ShieldCheck className="text-green-500 relative z-10" size={24} />
          <div>
            <span className="text-2xl font-black text-slate-800 relative z-10">{vaxData.status}</span>
            <div className="flex items-center gap-1">
               <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest relative z-10">Vax Status</span>
            </div>
          </div>
        </div>

        <div className="col-span-2 md:col-span-2">
            <button 
              onClick={() => setView('vets')}
              className="w-full h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] p-6 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group active:scale-[0.98] transition-all text-left flex items-center justify-between"
            >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-8 -mb-8 blur-xl"></div>
            
            <div className="relative z-10 space-y-1">
                <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-md">
                    <Stethoscope size={16} className="text-white" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">Vet Connect</span>
                </div>
                <h3 className="text-xl font-black leading-tight">Find Nearby Veterinarians</h3>
                <p className="text-blue-100 text-xs font-medium">Locate clinics & specialists instantly.</p>
            </div>
            <div className="w-10 h-10 bg-white text-blue-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform relative z-10">
                <ArrowRight size={20} />
            </div>
            </button>
        </div>
      </div>

      <HealthSuggestions pet={selectedPet} />

      <section className="space-y-4 pt-4 border-t border-slate-100">
        <div className="flex justify-between items-center">
          <h3 className="font-black text-xl text-slate-800">Care Logs</h3>
          <button 
            onClick={() => setIsAddLogOpen(true)}
            className="text-orange-500 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest bg-orange-50 px-3 py-1.5 rounded-full hover:bg-orange-100 transition-colors"
          >
            <PlusCircle size={16} /> Add Record
          </button>
        </div>

        <div className="space-y-4 max-w-3xl">
          {petLogs.slice(0, 5).map(log => {
             const pet = pets.find(p => p.id === log.petId);
             let Icon = FileText;
             let colorClass = "bg-slate-100 text-slate-500";
             if (log.type === 'Vaccination') { Icon = Syringe; colorClass = "bg-green-100 text-green-600"; }
             else if (log.type === 'Temperature') { Icon = Thermometer; colorClass = "bg-orange-100 text-orange-600"; }
             else if (log.type === 'Checkup') { Icon = Stethoscope; colorClass = "bg-blue-100 text-blue-600"; }
             
             return (
              <button 
                key={log.id} 
                onClick={() => setSelectedLog(log)}
                className="w-full flex gap-4 p-4 bg-white rounded-[1.5rem] border border-slate-100 shadow-sm items-start text-left active:scale-[0.98] transition-all hover:shadow-md"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                     <div>
                        <h4 className="font-bold text-slate-800 text-sm truncate">{log.type}</h4>
                        <span className="text-[10px] font-bold text-slate-400">{pet?.name} • {log.date}</span>
                     </div>
                     {log.value && <span className="font-black text-slate-800 bg-slate-50 px-2 py-1 rounded-lg text-xs shrink-0">{log.value}</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed truncate">{log.description}</p>
                  {log.attachments && log.attachments.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5 text-[10px] text-slate-400 font-bold">
                          <File size={10} /> {log.attachments.length} Document(s)
                      </div>
                  )}
                </div>
              </button>
             );
          })}
          {petLogs.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-3xl">
              <FileText className="mx-auto text-slate-200 mb-3" size={32} />
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No records yet for {selectedPet?.name}</p>
            </div>
          )}
        </div>
      </section>

      {isAddLogOpen && (
        <AddLogModal 
          pets={pets} 
          initialPetId={selectedPetId}
          onClose={() => setIsAddLogOpen(false)} 
          onSubmit={(log: HealthLog) => { onAddLog(log); setIsAddLogOpen(false); }} 
        />
      )}

      {isAddTempOpen && (
        <AddTempModal 
          pets={pets} 
          initialPetId={selectedPetId}
          onClose={() => setIsAddTempOpen(false)} 
          onSubmit={(log: HealthLog) => { onAddLog(log); setIsAddTempOpen(false); }} 
        />
      )}

      {selectedLog && (
        <LogDetailModal 
          log={selectedLog} 
          pets={pets}
          onClose={() => setSelectedLog(null)} 
        />
      )}
    </div>
  );
};

// --- Sub-Components (Keep existing Helper Components) ---

const HealthSuggestions = ({ pet }: { pet?: Pet }) => {
  if (!pet) return null;
  const isDog = pet.species === 'Dog';
  const isCat = pet.species === 'Cat';
  
  const title = isDog ? 'Dog Care' : isCat ? 'Cat Care' : 'Pet Care';
  const vaccines = isDog 
    ? ['Rabies', 'DHPP (Distemper/Parvo)', 'Leptospirosis']
    : isCat
    ? ['Rabies', 'FVRCP', 'FeLV']
    : ['Annual Checkup'];
    
  const prevention = isDog
    ? ['Heartworm Prevention', 'Flea & Tick Control', 'Annual Dental Clean']
    : isCat
    ? ['Flea Control', 'Deworming', 'Dental Check']
    : ['Habitat Cleaning', 'Diet Review'];

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
         <h3 className="font-bold text-xl text-slate-800">Care Suggestions</h3>
         <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded-md text-[10px] font-black uppercase">{title}</span>
      </div>
      
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
         <div className="w-64 bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm shrink-0 flex flex-col gap-3">
            <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
               <Shield size={20} />
            </div>
            <div>
               <h4 className="font-black text-slate-800">Core Vaccines</h4>
               <p className="text-xs text-slate-400 mt-1">Essential protection for {pet.name}.</p>
            </div>
            <div className="space-y-1">
               {vaccines.map(v => (
                  <div key={v} className="flex items-center gap-2 text-xs font-bold text-slate-600">
                     <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> {v}
                  </div>
               ))}
            </div>
         </div>

         <div className="w-64 bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm shrink-0 flex flex-col gap-3">
            <div className="w-10 h-10 bg-pink-50 text-pink-500 rounded-xl flex items-center justify-center">
               <Zap size={20} />
            </div>
            <div>
               <h4 className="font-black text-slate-800">Preventative</h4>
               <p className="text-xs text-slate-400 mt-1">Monthly & seasonal treatments.</p>
            </div>
            <div className="space-y-1">
               {prevention.map(v => (
                  <div key={v} className="flex items-center gap-2 text-xs font-bold text-slate-600">
                     <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div> {v}
                  </div>
               ))}
            </div>
         </div>
      </div>
    </section>
  )
}

const LogDetailModal = ({ log, pets, onClose }: { log: HealthLog, pets: Pet[], onClose: () => void }) => {
   const pet = pets.find(p => p.id === log.petId);
   let Icon = FileText;
   let colorClass = "bg-slate-100 text-slate-500";
   
   if (log.type === 'Vaccination') { Icon = Syringe; colorClass = "bg-green-100 text-green-600"; }
   else if (log.type === 'Checkup') { Icon = Stethoscope; colorClass = "bg-blue-100 text-blue-600"; }
   else if (log.type === 'Medication') { Icon = Pill; colorClass = "bg-purple-100 text-purple-600"; }
   else if (log.type === 'Temperature') { Icon = Thermometer; colorClass = "bg-orange-100 text-orange-600"; }
   else if (log.type === 'Weight') { Icon = Activity; colorClass = "bg-pink-100 text-pink-600"; }

   return (
      <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6" onClick={onClose}>
         <div className="w-full max-w-sm bg-white rounded-[2rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 pb-0 flex justify-between items-start">
               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colorClass}`}>
                  <Icon size={28} />
               </div>
               <button onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:bg-slate-100">
                  <X size={20} />
               </button>
            </div>
            
            <div className="p-6 space-y-6">
               <div>
                  <h3 className="text-2xl font-black text-slate-900">{log.type}</h3>
                  <div className="flex items-center gap-2 mt-2">
                     {pet && <img src={pet.image} alt={pet.name} className="w-6 h-6 rounded-full object-cover border border-slate-100" />}
                     <span className="font-bold text-slate-600">{pet?.name}</span>
                     <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                     <span className="text-slate-400 font-medium text-sm">{log.date}</span>
                  </div>
               </div>
               
               {log.value && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recorded Value</span>
                     <span className="text-2xl font-black text-slate-800">{log.value}</span>
                  </div>
               )}

               <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Notes / Description</span>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-medium text-slate-700 leading-relaxed">
                     {log.description}
                  </div>
               </div>

               {log.attachments && log.attachments.length > 0 && (
                  <div className="space-y-2">
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Documents</span>
                     <div className="space-y-2">
                        {log.attachments.map((file, idx) => (
                           <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white">
                              <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center shrink-0">
                                 <File size={16} />
                              </div>
                              <span className="text-xs font-bold text-slate-700 truncate flex-1">{file}</span>
                              <ExternalLink size={14} className="text-slate-300" />
                           </div>
                        ))}
                     </div>
                  </div>
               )}
            </div>
         </div>
      </div>
   )
}

const AddLogModal = ({ pets, initialPetId, onClose, onSubmit }: any) => {
   const [type, setType] = useState<HealthLog['type']>('Checkup');
   const [petId, setPetId] = useState(initialPetId || pets[0]?.id || '');
   const [desc, setDesc] = useState('');
   const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
   const [vaccine, setVaccine] = useState('');
   const [documents, setDocuments] = useState<string[]>([]);
   const fileInputRef = useRef<HTMLInputElement>(null);

   const selectedPet = pets.find((p: Pet) => p.id === petId);
   const species = selectedPet?.species || 'Dog';

   const VACCINE_OPTIONS: Record<string, string[]> = {
     'Dog': ['Rabies', 'DHPP', 'Bordetella', 'Leptospirosis', 'Lyme Disease', 'Canine Influenza'],
     'Cat': ['Rabies', 'FVRCP', 'FeLV', 'FIV'],
     'Rabbit': ['Myxomatosis', 'RHD'],
     'Bird': ['Polyomavirus', 'Pacheco\'s'],
     'Other': ['Rabies', 'Distemper']
   };
   const currentVaccines = VACCINE_OPTIONS[species as keyof typeof VACCINE_OPTIONS] || VACCINE_OPTIONS['Other'];

   useEffect(() => { setVaccine(''); setDesc(''); }, [type, petId]);

   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
         setDocuments(prev => [...prev, e.target.files![0].name]);
      }
   };

   const removeDoc = (index: number) => setDocuments(prev => prev.filter((_, i) => i !== index));

   const handleSubmit = () => {
      let finalDesc = desc;
      if (type === 'Vaccination') {
          if (vaccine === 'Other') { if (!desc) return; finalDesc = desc; }
          else if (vaccine) { finalDesc = vaccine; }
          else { return; }
      } else { if (!desc) return; }
      onSubmit({ id: Math.random().toString(36).substr(2, 9), petId, type, date, description: finalDesc, attachments: documents });
   };

   return (
      <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4 sm:p-0">
         <div className="w-full sm:w-[500px] bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-black text-slate-800">Add Health Record</h3>
               <button onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-400"><X size={20}/></button>
            </div>
            <div className="space-y-4">
               <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {pets.map((p: Pet) => (
                     <button key={p.id} onClick={() => setPetId(p.id)} className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${petId === p.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-100'}`}>
                        <img src={p.image} className="w-6 h-6 rounded-full object-cover" alt="" />
                        <span className="text-xs font-bold">{p.name}</span>
                     </button>
                  ))}
               </div>
               <div className="grid grid-cols-2 gap-2">
                  {['Checkup', 'Vaccination', 'Medication', 'Note'].map(t => (
                     <button key={t} onClick={() => setType(t as any)} className={`py-3 rounded-xl text-xs font-black uppercase tracking-wide border ${type === t ? 'bg-orange-500 text-white border-orange-500' : 'bg-slate-50 border-slate-50 text-slate-500'}`}>
                        {t}
                     </button>
                  ))}
               </div>
               
               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                     <Calendar size={16} className="text-slate-400" />
                     <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent font-bold text-slate-800 text-sm outline-none" />
                  </div>
                  
                  {type === 'Vaccination' ? (
                     <div className="space-y-2">
                        <select value={vaccine} onChange={e => setVaccine(e.target.value)} className="w-full p-3 bg-white border border-slate-100 rounded-xl font-bold text-slate-700 text-sm outline-none">
                           <option value="" disabled>Select Vaccine</option>
                           {currentVaccines.map(v => <option key={v} value={v}>{v}</option>)}
                           <option value="Other">Other...</option>
                        </select>
                        {(vaccine === 'Other') && (
                           <input type="text" placeholder="Enter vaccine name..." value={desc} onChange={e => setDesc(e.target.value)} className="w-full p-3 bg-white border border-slate-100 rounded-xl font-bold text-slate-700 text-sm outline-none" />
                        )}
                     </div>
                  ) : (
                     <textarea rows={3} placeholder={type === 'Medication' ? "Medicine name, dosage & frequency..." : "Describe health event..."} value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-transparent font-medium text-slate-700 text-sm outline-none resize-none placeholder:text-slate-400" />
                  )}
               </div>

               <div>
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-orange-500 transition-colors mb-2">
                     <Upload size={14} /> Attach Documents
                  </button>
                  {documents.length > 0 && (
                     <div className="flex flex-wrap gap-2">
                        {documents.map((doc, i) => (
                           <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold flex items-center gap-1">
                              {doc} <button onClick={() => removeDoc(i)}><X size={10} /></button>
                           </span>
                        ))}
                     </div>
                  )}
               </div>

               <button onClick={handleSubmit} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg">Save Record</button>
            </div>
         </div>
      </div>
   );
};

const AddTempModal = ({ pets, initialPetId, onClose, onSubmit }: any) => {
   const [formData, setFormData] = useState({
     petId: initialPetId || pets[0]?.id || '',
     value: '',
     date: new Date().toISOString().split('T')[0],
     note: ''
   });

   const handleSubmit = () => {
      if(!formData.value) return;
      onSubmit({
          id: Math.random().toString(36).substr(2, 9),
          petId: formData.petId,
          type: 'Temperature',
          date: formData.date,
          value: formData.value,
          description: formData.note || 'Temperature recorded'
      });
   };

   return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6" onClick={onClose}>
        <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
                <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 mx-auto mb-4">
                    <Thermometer size={32} />
                </div>
                <h2 className="text-xl font-black text-slate-800">Log Temperature</h2>
                <p className="text-xs text-slate-400 font-bold mt-1">Keep track of vitals</p>
            </div>

            <div className="space-y-4">
                 <div className="flex justify-center gap-2 mb-4">
                    {pets.map((p: Pet) => (
                        <button 
                            key={p.id} 
                            onClick={() => setFormData({...formData, petId: p.id})}
                            className={`w-10 h-10 rounded-full border-2 overflow-hidden transition-all ${formData.petId === p.id ? 'border-orange-500 scale-110 shadow-md' : 'border-transparent opacity-50'}`}
                        >
                            <img src={p.image} className="w-full h-full object-cover" alt=""/>
                        </button>
                    ))}
                 </div>

                 <div className="relative">
                    <input
                        type="number"
                        placeholder="38.6"
                        value={formData.value}
                        onChange={e => setFormData({...formData, value: e.target.value})}
                        className="w-full p-4 text-center text-3xl font-black text-slate-800 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500/20"
                        autoFocus
                    />
                    <span className="absolute right-8 top-1/2 -translate-y-1/2 font-black text-slate-300">°C</span>
                 </div>

                 <input 
                    type="text" 
                    placeholder="Optional notes..."
                    value={formData.note}
                    onChange={e => setFormData({...formData, note: e.target.value})}
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-600 text-xs outline-none"
                 />

                 <div className="grid grid-cols-2 gap-3 pt-2">
                    <button onClick={onClose} className="py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-50 text-xs uppercase tracking-wider">Cancel</button>
                    <button onClick={handleSubmit} className="py-3 bg-orange-500 text-white rounded-xl font-bold shadow-lg shadow-orange-500/30 text-xs uppercase tracking-wider">Save</button>
                 </div>
            </div>
        </div>
    </div>
   );
}

export default HealthTracker;
