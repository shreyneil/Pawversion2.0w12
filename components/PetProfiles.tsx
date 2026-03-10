import React, { useState, useEffect, useRef } from 'react';
import { Pet, HealthLog } from '../types';
import { Plus, ChevronRight, Info, ArrowLeft, QrCode, MapPin, Weight, Calendar as CalendarIcon, Calendar, MoveVertical as MoreVertical, Activity, CircleAlert as AlertCircle, X, Share2, Trash2, CreditCard as Edit2, Download, Upload } from 'lucide-react';

interface Props {
  pets: Pet[];
  onAddPet: () => void;
  initialSelectedId: string | null;
  onClearSelection: () => void;
  onRemovePet: (id: string) => void;
  onEditPet: (pet: Pet) => void;
  logs: HealthLog[];
  onAddLog: (log: HealthLog) => void;
}

const PetProfiles: React.FC<Props> = ({ pets, onAddPet, initialSelectedId, onClearSelection, onRemovePet, onEditPet, logs, onAddLog }) => {
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [healthType, setHealthType] = useState<'Checkup' | 'Vaccination' | 'Medication' | 'Note'>('Checkup');
  const [healthDate, setHealthDate] = useState(new Date().toISOString().split('T')[0]);
  const [healthDesc, setHealthDesc] = useState('');
  const [healthDocs, setHealthDocs] = useState<string[]>([]);
  const healthFileRef = useRef<HTMLInputElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isGalleryExpanded, setIsGalleryExpanded] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (initialSelectedId) {
      const pet = pets.find(p => p.id === initialSelectedId);
      if (pet) setSelectedPet(pet);
    }
  }, [initialSelectedId, pets]);

  useEffect(() => {
    if (selectedPet) {
      const updated = pets.find(p => p.id === selectedPet.id);
      if (updated) setSelectedPet(updated);
    }
  }, [pets]);

  useEffect(() => {
    setIsGalleryExpanded(false);
  }, [selectedPet]);

  const handleBack = () => {
    setSelectedPet(null);
    onClearSelection();
    setIsMenuOpen(false);
  };

  const handleRemove = () => {
    setIsMenuOpen(false);
    if (!selectedPet) return;

    if (window.confirm(`Are you sure you want to remove ${selectedPet.name}? This action cannot be undone.`)) {
        const idToRemove = selectedPet.id;
        setSelectedPet(null);
        onClearSelection();
        onRemovePet(idToRemove);
    }
  };

  const handleEdit = () => {
      setIsMenuOpen(false);
      if (selectedPet) {
          onEditPet(selectedPet);
      }
  };

  const handleShare = async () => {
      setIsMenuOpen(false);
      if (!selectedPet) return;
      
      const shareData = {
          title: `PawPal: ${selectedPet.name}`,
          text: `Meet ${selectedPet.name}, my ${selectedPet.breed}! 🐾\nAge: ${selectedPet.age} yrs\nWeight: ${selectedPet.weight}kg`,
          url: window.location.href
      };

      try {
          if (navigator.share) {
            await navigator.share(shareData);
          } else {
            const clipboardText = `${shareData.title}\n${shareData.text}`;
            await navigator.clipboard.writeText(clipboardText);
            alert("Pet profile info copied to clipboard!");
          }
      } catch (err) {
          console.error("Share failed", err);
      }
  };

  const handleAddHealthIssue = () => {
    if (!selectedPet || !healthDesc.trim()) return;

    const newLog: HealthLog = {
      id: Math.random().toString(36).substr(2, 9),
      petId: selectedPet.id,
      type: healthType,
      date: healthDate,
      description: healthDesc,
      attachments: healthDocs
    };

    onAddLog(newLog);
    setHealthDesc('');
    setHealthDocs([]);
    setHealthType('Checkup');
    setHealthDate(new Date().toISOString().split('T')[0]);
    setShowHealthModal(false);
  };

  const handleHealthFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setHealthDocs(prev => [...prev, e.target.files![0].name]);
    }
  };

  const petLogs = selectedPet ? logs.filter(log => log.petId === selectedPet.id) : [];

  if (selectedPet) {
    return (
      <div className="animate-in slide-in-from-right duration-500 h-full bg-white flex flex-col relative md:rounded-[2.5rem] md:overflow-hidden md:border md:border-slate-100 md:shadow-xl max-w-4xl mx-auto my-0 md:my-6">
        
        {/* Passport Style QR Modal */}
        {showQrModal && (
          <div className="fixed inset-0 z-[60] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setShowQrModal(false)}>
             <div 
                className="w-full max-w-[340px] relative animate-in zoom-in-95 duration-300" 
                onClick={e => e.stopPropagation()}
             >
                <button 
                  onClick={() => setShowQrModal(false)}
                  className="absolute -top-12 right-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="bg-[#1e40af] text-white rounded-[1.5rem] overflow-hidden shadow-2xl relative">
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                  
                  <div className="relative z-10 p-6 space-y-6">
                    <div className="flex justify-between items-start">
                       <div>
                          <h4 className="text-[10px] font-bold tracking-[0.2em] text-blue-200 uppercase">Official Passport</h4>
                          <h2 className="text-3xl font-serif font-bold text-white mt-1 tracking-wide">PAWPAL</h2>
                       </div>
                       
                       <div className="bg-white p-2 rounded-xl shadow-lg transform rotate-3">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(JSON.stringify({
                              id: selectedPet.id,
                              name: selectedPet.name,
                              breed: selectedPet.breed,
                              species: selectedPet.species
                            }))}`}
                            alt="Pet QR"
                            className="w-12 h-12"
                          />
                       </div>
                    </div>

                    <div className="flex gap-4">
                       <img 
                         src={selectedPet.image} 
                         alt={selectedPet.name} 
                         className="w-28 h-36 object-cover rounded-xl border-2 border-blue-300/30 shadow-md shrink-0 bg-slate-200"
                       />
                       <div className="flex flex-col justify-center gap-3">
                          <div>
                             <p className="text-[9px] font-bold text-blue-200 uppercase tracking-widest mb-0.5">Name</p>
                             <p className="text-lg font-bold leading-none">{selectedPet.name}</p>
                          </div>
                          <div>
                             <p className="text-[9px] font-bold text-blue-200 uppercase tracking-widest mb-0.5">Breed</p>
                             <p className="text-sm font-medium leading-tight">{selectedPet.breed}</p>
                          </div>
                          <div>
                             <p className="text-[9px] font-bold text-blue-200 uppercase tracking-widest mb-0.5">Microchip ID</p>
                             <p className="text-xs font-mono tracking-wider opacity-90">985-120-{Math.floor(Math.random() * 900) + 100}</p>
                          </div>
                       </div>
                    </div>

                    <div className="h-px bg-blue-400/30 w-full"></div>

                    <div className="flex justify-between items-center px-1">
                       <div>
                          <p className="text-[9px] font-bold text-blue-200 uppercase tracking-widest mb-1">Born</p>
                          <p className="text-sm font-bold">{new Date().getFullYear() - selectedPet.age}</p>
                       </div>
                       <div>
                          <p className="text-[9px] font-bold text-blue-200 uppercase tracking-widest mb-1">Weight</p>
                          <p className="text-sm font-bold">{selectedPet.weight}kg</p>
                       </div>
                       <div className="text-right">
                          <p className="text-[9px] font-bold text-blue-200 uppercase tracking-widest mb-1">Origin</p>
                          <p className="text-sm font-bold truncate max-w-[80px]">{selectedPet.origin || 'Unknown'}</p>
                       </div>
                    </div>
                  </div>
                  
                  <div className="absolute -bottom-12 -right-12 w-48 h-48 border border-white/10 rounded-full"></div>
                  <div className="absolute -bottom-8 -right-8 w-48 h-48 border border-white/10 rounded-full"></div>
                </div>

                <button className="w-full mt-6 bg-white text-slate-900 py-4 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-transform">
                   <Download size={18} /> Save to Gallery
                </button>
             </div>
          </div>
        )}

        {/* Detail Header */}
        <div className="relative h-[40vh] md:h-[45vh] shrink-0">
          <img src={selectedPet.image} alt={selectedPet.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
          
          <button 
            onClick={handleBack}
            className="absolute top-6 left-6 w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white active:scale-90 transition-transform z-10"
          >
            <ArrowLeft size={24} />
          </button>
          
          <div className="absolute top-6 right-6 z-50">
             {isMenuOpen && (
                 <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
             )}

             <button 
               onClick={() => setIsMenuOpen(!isMenuOpen)}
               className="relative z-50 w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white active:scale-90 transition-transform"
             >
               <MoreVertical size={24} />
             </button>
             
             {isMenuOpen && (
               <div className="absolute right-0 top-14 w-48 bg-white rounded-2xl shadow-xl py-2 animate-in fade-in zoom-in-95 duration-200 border border-slate-100 z-50 overflow-hidden">
                 <button 
                    onClick={handleEdit}
                    type="button"
                    className="w-full px-4 py-3 text-left text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2 active:bg-slate-100 transition-colors"
                 >
                    <Edit2 size={16} /> Edit Profile
                 </button>
                 <button 
                    onClick={handleShare}
                    type="button"
                    className="w-full px-4 py-3 text-left text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2 active:bg-slate-100 transition-colors"
                 >
                    <Share2 size={16} /> Share
                 </button>
                 <div className="h-px bg-slate-100 my-1"></div>
                 <button 
                    onClick={handleRemove}
                    type="button"
                    className="w-full px-4 py-3 text-left text-sm font-bold text-red-500 hover:bg-red-50 flex items-center gap-2 active:bg-red-50 transition-colors"
                 >
                    <Trash2 size={16} /> Remove Pet
                 </button>
               </div>
             )}
          </div>

          <div className="absolute bottom-8 left-8 text-white z-10">
            <h2 className="text-4xl font-black">{selectedPet.name}</h2>
            <p className="text-white/80 font-medium">{selectedPet.breed} • {selectedPet.species}</p>
          </div>
        </div>

        {/* Pet Details Content */}
        <div className="flex-1 -mt-6 bg-slate-50 rounded-t-[3rem] p-8 space-y-8 overflow-y-auto no-scrollbar relative z-20">
          <div className="grid grid-cols-3 gap-4">
            <StatBox icon={<CalendarIcon size={18} />} value={`${selectedPet.age}y`} label="Age" />
            <StatBox icon={<Weight size={18} />} value={`${selectedPet.weight}kg`} label="Weight" />
            <StatBox icon={<MapPin size={18} />} value="Home" label="Location" />
          </div>

          {selectedPet.bio && (
             <section className="space-y-2">
                <h3 className="font-bold text-xl text-slate-800">About {selectedPet.name}</h3>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">{selectedPet.bio}</p>
             </section>
          )}

          {selectedPet.temperament && selectedPet.temperament.length > 0 && (
            <section className="space-y-4">
              <h3 className="font-bold text-xl text-slate-800">Temperament</h3>
              <div className="flex flex-wrap gap-2">
                {selectedPet.temperament.map(tag => (
                  <span key={tag} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wide border border-slate-200">
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h3 className="font-bold text-xl text-slate-800">Pet Passport</h3>
            <button 
              onClick={() => setShowQrModal(true)}
              className="w-full bg-white p-6 rounded-[2.5rem] border border-slate-100 flex items-center justify-between shadow-sm active:scale-[0.98] transition-all text-left group hover:border-orange-200"
            >
              <div className="space-y-1">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Digital ID Card</p>
                <h4 className="font-bold text-slate-800">Scan for Profile</h4>
                <p className="text-xs text-slate-500">Perfect for collar tags.</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-3xl text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                <QrCode size={48} />
              </div>
            </button>
          </section>

          <section className="space-y-4">
             <div className="flex justify-between items-center">
                <h3 className="font-bold text-xl text-slate-800">Health & Conditions</h3>
                <button 
                  onClick={() => setShowHealthModal(true)}
                  className="text-orange-500 text-xs font-black uppercase tracking-widest flex items-center gap-1"
                >
                  <Plus size={14} /> Add
                </button>
             </div>
             
             <div className="space-y-3">
               {petLogs.length > 0 ? (
                 petLogs.map(log => (
                   <div key={log.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-start gap-3 shadow-sm">
                      <div className={`p-2 rounded-xl shrink-0 ${log.description.toLowerCase().includes('allergy') ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                         <Activity size={18} />
                      </div>
                      <div className="flex-1">
                         <div className="flex justify-between items-start">
                            <h4 className="font-bold text-slate-800 text-sm">{log.type === 'Note' ? 'Condition' : log.type}</h4>
                            <span className="text-[10px] font-bold text-slate-400">{log.date}</span>
                         </div>
                         <p className="text-xs text-slate-500 mt-1">{log.description}</p>
                      </div>
                   </div>
                 ))
               ) : (
                 <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-3xl">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No health issues recorded</p>
                 </div>
               )}
             </div>
          </section>

          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-xl text-slate-800">Gallery</h3>
              <button 
                onClick={() => setIsGalleryExpanded(!isGalleryExpanded)}
                className="text-orange-500 text-xs font-black uppercase tracking-widest"
              >
                {isGalleryExpanded ? 'Show Less' : 'See All'}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[...Array(isGalleryExpanded ? 9 : 3)].map((_, i) => {
                const src = `https://picsum.photos/seed/${selectedPet.id}${i + 10}/800`;
                return (
                  <button 
                    key={i} 
                    onClick={() => setSelectedImage(src)}
                    className="aspect-square bg-slate-200 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-500 relative group"
                  >
                    <img src={src} alt="Gallery" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  </button>
                )
              })}
            </div>
          </section>
        </div>

        {showHealthModal && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4 sm:p-0">
            <div className="w-full sm:w-[500px] bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800">Add Health Record</h3>
                <button onClick={() => setShowHealthModal(false)} className="p-2 bg-slate-50 rounded-full text-slate-400"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {(['Checkup', 'Vaccination', 'Medication', 'Note'] as const).map(t => (
                    <button key={t} onClick={() => setHealthType(t)} className={`py-3 rounded-xl text-xs font-black uppercase tracking-wide border ${healthType === t ? 'bg-orange-500 text-white border-orange-500' : 'bg-slate-50 border-slate-50 text-slate-500'}`}>
                      {t}
                    </button>
                  ))}
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={16} className="text-slate-400" />
                    <input type="date" value={healthDate} onChange={e => setHealthDate(e.target.value)} className="bg-transparent font-bold text-slate-800 text-sm outline-none" />
                  </div>
                  <textarea
                    rows={3}
                    placeholder={healthType === 'Medication' ? "Medicine name, dosage & frequency..." : "Describe health event..."}
                    value={healthDesc}
                    onChange={e => setHealthDesc(e.target.value)}
                    className="w-full bg-transparent font-medium text-slate-700 text-sm outline-none resize-none placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <input type="file" ref={healthFileRef} className="hidden" onChange={handleHealthFileChange} />
                  <button onClick={() => healthFileRef.current?.click()} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-orange-500 transition-colors mb-2">
                    <Upload size={14} /> Attach Documents
                  </button>
                  {healthDocs.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {healthDocs.map((doc, i) => (
                        <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold flex items-center gap-1">
                          {doc} <button onClick={() => setHealthDocs(prev => prev.filter((_, idx) => idx !== i))}><X size={10} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={handleAddHealthIssue} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg active:scale-[0.98] transition-all">
                  Save Record
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedImage && (
            <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedImage(null)}>
                <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-6 right-6 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors z-50"
                >
                    <X size={24} />
                </button>
                <img 
                    src={selectedImage} 
                    alt="Full view" 
                    className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300"
                    onClick={(e) => e.stopPropagation()} 
                />
            </div>
        )}

      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500 pb-32">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Pets Family</h2>
          <p className="text-sm text-slate-400 font-medium">Manage your fuzzy roommates</p>
        </div>
        <button 
          onClick={onAddPet}
          className="w-14 h-14 bg-orange-500 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-orange-500/30 active:scale-95 transition-all"
        >
          <Plus size={28} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {pets.map(pet => (
          <button 
            key={pet.id} 
            onClick={() => setSelectedPet(pet)}
            className="bg-white rounded-[2.5rem] p-4 border border-slate-100 shadow-sm flex items-center gap-5 group active:scale-[0.98] transition-all text-left hover:shadow-lg hover:border-orange-100"
          >
            <div className="relative">
              <img src={pet.image} alt={pet.name} className="w-24 h-24 object-cover rounded-[1.8rem]" />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 border-4 border-white rounded-full"></div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-800 text-lg leading-none">{pet.name}</h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${pet.species === 'Dog' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                  {pet.species}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-tight">{pet.breed}</p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-300 uppercase leading-none">Weight</span>
                  <span className="text-sm font-bold text-slate-700">{pet.weight} kg</span>
                </div>
                <div className="w-[1px] h-6 bg-slate-100"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-300 uppercase leading-none">Age</span>
                  <span className="text-sm font-bold text-slate-700">{pet.age} yrs</span>
                </div>
              </div>
            </div>
            <div className="pr-2 text-slate-200 group-hover:text-orange-500 transition-colors">
              <ChevronRight size={24} />
            </div>
          </button>
        ))}
      </div>

      <div className="bg-orange-50/50 p-6 rounded-[2rem] border border-orange-100 flex gap-4">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-500 shadow-sm shrink-0">
          <Info size={24} />
        </div>
        <div>
          <h4 className="font-bold text-orange-900 text-sm">Did you know?</h4>
          <p className="text-xs text-orange-700/80 leading-relaxed mt-1">
            Updating your pet's weight monthly helps the AI accurately predict potential health issues before they become serious.
          </p>
        </div>
      </div>
    </div>
  );
};

const StatBox = ({ icon, value, label }: any) => (
  <div className="bg-white p-4 rounded-3xl flex flex-col items-center justify-center gap-1 shadow-sm border border-slate-100">
    <div className="text-orange-500 mb-1">{icon}</div>
    <span className="font-black text-slate-800 leading-none">{value}</span>
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
  </div>
);

export default PetProfiles;