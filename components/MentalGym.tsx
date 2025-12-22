import React, { useState } from 'react';
import { Flashcard, Task } from '../types';
import { Dumbbell, Trash2, Repeat, Check, X, RotateCw } from 'lucide-react';
import EmptyState from './EmptyState';

interface Props {
  flashcards: Flashcard[];
  tasks: Task[];
  deleteFlashcard: (id: string) => void;
}

const MentalGym: React.FC<Props> = ({ flashcards, deleteFlashcard }) => {
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const reviewQueue = flashcards; // Simplified: Review all for now

  const handleNext = () => {
      setIsFlipped(false);
      setCurrentCardIndex((prev) => (prev + 1) % reviewQueue.length);
  };

  const currentCard = reviewQueue[currentCardIndex];

  return (
    <div className="h-full flex flex-col p-4 md:p-8">
        <header className="mb-8 flex justify-between items-center">
             <div>
                <h1 className="text-2xl font-light text-slate-800 dark:text-slate-200">Mental Gym</h1>
                <p className="text-sm text-slate-500">Тренировка нейронных связей.</p>
             </div>
             {reviewQueue.length > 0 && (
                 <button 
                    onClick={() => setIsReviewMode(!isReviewMode)} 
                    className={`px-4 py-2 rounded-xl font-medium transition-all ${isReviewMode ? 'bg-slate-200 text-slate-800' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'}`}
                 >
                    {isReviewMode ? 'Список' : 'Начать тренировку'}
                 </button>
             )}
        </header>

        <div className="flex-1 overflow-y-auto min-h-0">
            {flashcards.length === 0 ? (
                <div className="py-10">
                    <EmptyState 
                        icon={Dumbbell} 
                        title="Пока пусто" 
                        description="Создай карточки в «Хабе», чтобы начать тренировку." 
                        color="violet"
                    />
                </div>
            ) : isReviewMode && currentCard ? (
                <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto pb-20">
                    <div 
                        className="w-full aspect-[3/2] perspective-1000 cursor-pointer group"
                        onClick={() => setIsFlipped(!isFlipped)}
                    >
                        <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                             {/* Front */}
                             <div className="absolute inset-0 backface-hidden bg-white dark:bg-[#1e293b] rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center p-8 text-center">
                                 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Вопрос</span>
                                 <h3 className="text-2xl md:text-3xl font-medium text-slate-800 dark:text-slate-200 leading-tight">{currentCard.front}</h3>
                                 <div className="mt-8 text-xs text-slate-400 flex items-center gap-1"><RotateCw size={12}/> Нажми, чтобы перевернуть</div>
                             </div>
                             
                             {/* Back */}
                             <div className="absolute inset-0 backface-hidden rotate-y-180 bg-indigo-600 text-white rounded-3xl shadow-xl flex flex-col items-center justify-center p-8 text-center">
                                 <span className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-4">Ответ</span>
                                 <h3 className="text-xl md:text-2xl leading-relaxed">{currentCard.back}</h3>
                             </div>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-8">
                        <button onClick={handleNext} className="p-4 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm">
                            <X size={24} />
                        </button>
                        <button onClick={handleNext} className="p-4 rounded-full bg-slate-900 dark:bg-emerald-600 text-white hover:scale-105 active:scale-95 transition-all shadow-lg">
                            <Check size={24} />
                        </button>
                    </div>
                    <div className="mt-4 text-sm text-slate-400">
                        {currentCardIndex + 1} / {reviewQueue.length}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {flashcards.map(card => (
                        <div key={card.id} className="bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 transition-all group relative">
                            <div className="font-medium text-slate-800 dark:text-slate-200 mb-2">{card.front}</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{card.back}</div>
                            <button 
                                onClick={() => deleteFlashcard(card.id)} 
                                className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};

export default MentalGym;