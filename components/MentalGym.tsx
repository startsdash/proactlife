
import React, { useState, useEffect } from 'react';
import { Flashcard, Task } from '../types';
import { Dumbbell, RotateCw, Trash2, ChevronLeft, ChevronRight, BrainCircuit, Lightbulb } from 'lucide-react';
import EmptyState from './EmptyState';

interface Props {
  flashcards: Flashcard[];
  tasks: Task[];
  deleteFlashcard: (id: string) => void;
}

const MentalGym: React.FC<Props> = ({ flashcards, tasks, deleteFlashcard }) => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
      if (currentCardIndex >= flashcards.length && flashcards.length > 0) {
          setCurrentCardIndex(0);
      }
  }, [flashcards.length, currentCardIndex]);

  const changeCard = (direction: 'next' | 'prev') => {
    if (isFlipped) {
        setIsFlipped(false);
        setTimeout(() => {
            navigate(direction);
        }, 200);
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
      }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 md:p-8 space-y-6">
       <header className="flex justify-between items-end shrink-0">
        <div>
            <h1 className="text-2xl md:text-3xl font-light text-slate-800 dark:text-slate-200 tracking-tight">Скиллы <span className="text-violet-500 text-base md:text-lg">/ Level Up</span></h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Прокачай нейронные связи. Не дай инсайтам выветриться</p>
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
                    <button 
                        onClick={handleDelete}
                        className="absolute -top-3 -right-3 z-50 p-2 bg-white dark:bg-slate-800 text-slate-300 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 border border-slate-100 dark:border-slate-700 rounded-full shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Удалить карточку"
                    >
                        <Trash2 size={16} />
                    </button>

                    <div className={`relative w-full h-full transition-all duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                        
                        {/* FRONT SIDE (A) */}
                        <div className="absolute w-full h-full backface-hidden bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 shadow-xl rounded-3xl p-6 md:p-10 flex flex-col items-center text-center">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <BrainCircuit size={14} /> Исходная мысль
                            </div>
                            
                            <div className="flex-1 flex items-center justify-center overflow-y-auto w-full custom-scrollbar-light">
                                <p className="text-lg md:text-xl font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                                    {flashcards[currentCardIndex].front}
                                </p>
                            </div>
                            
                            <p className="mt-6 text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest animate-pulse">
                                Нажми, чтобы увидеть навык
                            </p>
                        </div>

                        {/* BACK SIDE (B) */}
                        <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-indigo-600 dark:bg-indigo-700 shadow-xl rounded-3xl p-6 md:p-10 flex flex-col items-center text-center text-white">
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
                        className="p-3 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-sm active:scale-95"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    <div className="text-sm font-medium text-slate-400 dark:text-slate-500 font-mono">
                        {currentCardIndex + 1} <span className="text-slate-200 dark:text-slate-700 mx-1">/</span> {flashcards.length}
                    </div>

                    <button 
                        onClick={(e) => { e.stopPropagation(); changeCard('next'); }}
                        className="p-3 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-sm active:scale-95"
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>

            </div>
        ) : (
            <div className="py-10">
                <EmptyState 
                    icon={Dumbbell} 
                    title="Спортзал пуст" 
                    description="Создайте карточки навыков в «Лабе» после анализа ИИ, чтобы начать тренировку." 
                    color="violet"
                />
            </div>
        )}
      </div>
    </div>
  );
};

export default MentalGym;
