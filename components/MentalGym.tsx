import React, { useState, useEffect } from 'react';
import { Flashcard, Task } from '../types';
import { Dumbbell, RotateCw, Trash2, ChevronLeft, ChevronRight, BrainCircuit, Lightbulb } from 'lucide-react';

interface Props {
  flashcards: Flashcard[];
  tasks: Task[];
  deleteFlashcard: (id: string) => void;
}

const MentalGym: React.FC<Props> = ({ flashcards, tasks, deleteFlashcard }) => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Safety check: if index exceeds length (after delete), reset
  useEffect(() => {
      if (currentCardIndex >= flashcards.length && flashcards.length > 0) {
          setCurrentCardIndex(0);
      }
  }, [flashcards.length, currentCardIndex]);

  const changeCard = (direction: 'next' | 'prev') => {
    // Flip back first for smooth transition
    if (isFlipped) {
        setIsFlipped(false);
        setTimeout(() => {
            navigate(direction);
        }, 200); // Wait for half-flip
    } else {
        navigate(direction);
    }
  };

  const navigate = (direction: 'next' | 'prev') => {
      if (flashcards.length === 0) return;
      
      setCurrentCardIndex((prev) => {
          if (direction === 'next') {
              return (prev + 1) % flashcards.length;
          } else {
              return (prev - 1 + flashcards.length) % flashcards.length;
          }
      });
  };

  const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (flashcards.length === 0) return;

      if (window.confirm("Удалить карточку навсегда?")) {
        const cardId = flashcards[currentCardIndex].id;
        setIsFlipped(false);
        deleteFlashcard(cardId);
        // Index adjustment handles automatically via useEffect
      }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 md:p-8 space-y-6">
       <header className="flex justify-between items-end shrink-0">
        <div>
            <h1 className="text-2xl md:text-3xl font-light text-slate-800 tracking-tight">Mental Gym <span className="text-violet-500 text-base md:text-lg">/ Тонус разума</span></h1>
            <p className="text-slate-500 mt-2 text-sm">Закрепляй знания и тренируй гибкость ума.</p>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 relative">
        {flashcards.length > 0 && flashcards[currentCardIndex] ? (
            <div className="w-full max-w-md flex flex-col gap-6">
                
                {/* CARD CONTAINER */}
                <div 
                    className="perspective-1000 w-full aspect-[3/4] cursor-pointer group relative" 
                    onClick={() => setIsFlipped(!isFlipped)}
                >
                    {/* Delete Button (Visible on hover or always on mobile) */}
                    <button 
                        onClick={handleDelete}
                        className="absolute -top-3 -right-3 z-50 p-2 bg-white text-slate-300 hover:text-red-500 border border-slate-100 rounded-full shadow-sm hover:bg-red-50 transition-colors"
                        title="Удалить карточку"
                    >
                        <Trash2 size={16} />
                    </button>

                    <div className={`relative w-full h-full transition-all duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                        
                        {/* FRONT SIDE (A) - ИСХОДНАЯ МЫСЛЬ */}
                        <div className="absolute w-full h-full backface-hidden bg-white border border-slate-200 shadow-xl rounded-3xl p-6 md:p-10 flex flex-col items-center text-center">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <BrainCircuit size={14} /> Исходная мысль
                            </div>
                            
                            <div className="flex-1 flex items-center justify-center overflow-y-auto w-full custom-scrollbar-light">
                                <p className="text-lg md:text-xl font-medium text-slate-800 leading-relaxed">
                                    {flashcards[currentCardIndex].front}
                                </p>
                            </div>
                            
                            <p className="mt-6 text-[10px] font-bold text-slate-300 uppercase tracking-widest animate-pulse">
                                Нажми, чтобы увидеть навык
                            </p>
                        </div>

                        {/* BACK SIDE (B) - ФОРМИРУЕМЫЙ НАВЫК */}
                        <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-indigo-600 shadow-xl rounded-3xl p-6 md:p-10 flex flex-col items-center text-center text-white">
                            <div className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Lightbulb size={14} /> Формируемый навык
                            </div>

                            <div className="flex-1 flex items-center justify-center w-full overflow-hidden">
                                 <div className="w-full overflow-y-auto max-h-full pr-1 custom-scrollbar-light">
                                    <p className="text-lg md:text-xl leading-relaxed font-light">
                                        {flashcards[currentCardIndex].back}
                                    </p>
                                 </div>
                            </div>
                            
                            <div className="mt-6">
                                <RotateCw size={16} className="text-indigo-300 opacity-50" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* CONTROLS */}
                <div className="flex items-center justify-between px-4">
                    <button 
                        onClick={(e) => { e.stopPropagation(); changeCard('prev'); }}
                        className="p-3 rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm active:scale-95"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    <div className="text-sm font-medium text-slate-400 font-mono">
                        {currentCardIndex + 1} <span className="text-slate-200 mx-1">/</span> {flashcards.length}
                    </div>

                    <button 
                        onClick={(e) => { e.stopPropagation(); changeCard('next'); }}
                        className="p-3 rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm active:scale-95"
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>

            </div>
        ) : (
            <div className="text-center text-slate-400 p-10 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                <Dumbbell size={48} className="mx-auto mb-4 opacity-30" />
                <p className="font-medium text-slate-500">Спортзал пуст</p>
                <p className="text-sm mt-2 opacity-60 max-w-xs mx-auto">Создайте карточки навыков в Песочнице, чтобы начать тренировку.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default MentalGym;