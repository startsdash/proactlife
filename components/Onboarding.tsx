import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, StickyNote, Box, Kanban, Dumbbell, Book, CheckCircle2, Check, Flame } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const steps = [
  {
    id: 'napkins',
    title: 'Заметки/Входящие',
    subtitle: 'Сырой материал',
    desc: 'Всё начинается здесь. Не фильтруй мысли. Записывай идеи, цитаты, инсайты или просто тревоги. Это твое хранилище сырого материала. Лучшее сохрани в «Библиотеке».',
    icon: <StickyNote size={48} className="text-blue-500" />,
    color: 'bg-blue-500'
  },
  {
    id: 'sandbox',
    title: 'Хаб',
    subtitle: 'Трансформация',
    desc: 'Выбери мысль из «Входящих заметок» и отправь её в «Хаб». Поработай над ней с ИИ-менторами. Лучшая команда поможет превратить хаотичные мысли и идеи в чёткий план действий или глубокий принцип.',
    icon: <Box size={48} className="text-amber-500" />,
    color: 'bg-amber-500'
  },
  {
    id: 'kanban',
    title: 'Спринты',
    subtitle: 'От слов к делу',
    desc: 'Мысли и идеи без действий мертвы. В «Спринтах» они становятся задачами. Используй «Челленджи», чтобы бросать себе вызовы, и ИИ-консультанта, если нужна поддержка.',
    icon: <Kanban size={48} className="text-emerald-500" />,
    color: 'bg-emerald-500'
  },
  {
    id: 'mentalgym',
    title: 'Скиллы',
    subtitle: 'Нейропластичность',
    desc: 'Важные принципы нужно помнить. В «Хабе» ты создаешь «навыки» (флеш-карточки). Здесь ты тренируешь свой мозг, чтобы новые знания стали частью тебя.',
    icon: <Dumbbell size={48} className="text-indigo-500" />,
    color: 'bg-indigo-500'
  },
  {
    id: 'tracker',
    title: 'Трекер',
    subtitle: 'Дисциплина',
    desc: 'Сила в системе. Заведи свои полезные привычки и отслеживай прогресс.',
    icon: <Flame size={48} className="text-orange-500" />,
    color: 'bg-orange-500'
  },
  {
    id: 'journal',
    title: 'Дневник',
    subtitle: 'Рефлексия',
    desc: 'Здесь можно порефлексировать. Свяжи запись в дневнике с конкретной задачей, или просто пиши. ИИ-наставник прокомментирует твой опыт, помогая извлечь уроки из каждой победы или поражения.',
    icon: <Book size={48} className="text-cyan-600" />,
    color: 'bg-cyan-600'
  }
];

const Onboarding: React.FC<Props> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem('live_act_onboarding_completed');
    // Only show if not completed
    if (completed !== 'true') {
      setIsVisible(true);
    }
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
        localStorage.setItem('live_act_onboarding_completed', 'true');
    }
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const next = () => {
    if (currentStep < steps.length - 1) setCurrentStep(c => c + 1);
    else handleClose();
  };

  const prev = () => {
    if (currentStep > 0) setCurrentStep(c => c - 1);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white dark:bg-[#1e293b] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative border border-slate-200 dark:border-slate-700 flex flex-col max-h-[85vh] md:max-h-auto"
        >
          {/* Progress Bar */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100 dark:bg-slate-800 z-10">
            <motion.div 
              className={`h-full ${steps[currentStep].color}`}
              initial={{ width: '0%' }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <button onClick={handleClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 z-20 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X size={20} />
          </button>

          {/* Scrollable Content */}
          <div className="p-6 md:p-10 flex flex-col items-center text-center overflow-y-auto custom-scrollbar-light flex-1 min-h-0">
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center w-full my-auto py-4"
              >
                <div className="mb-8 mt-2 scale-110">
                  {steps[currentStep].icon}
                </div>
                <div className="space-y-1 mb-4">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {steps[currentStep].title}
                    </h2>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">{steps[currentStep].subtitle}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed font-light">
                  {steps[currentStep].desc}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer (Fixed) */}
          <div className="p-6 md:p-10 pt-0 shrink-0 bg-white dark:bg-[#1e293b] z-10 border-t border-slate-50 dark:border-slate-800/50">
            <div className="w-full flex items-center justify-between mb-4 pt-4">
              <button 
                onClick={prev}
                disabled={currentStep === 0}
                className={`p-3 rounded-full transition-colors ${currentStep === 0 ? 'text-slate-200 dark:text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600'}`}
              >
                <ArrowLeft size={24} />
              </button>
              
              <div className="flex gap-1.5">
                {steps.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`w-2 h-2 rounded-full transition-colors ${idx === currentStep ? 'bg-slate-800 dark:bg-white' : 'bg-slate-200 dark:bg-slate-700'}`}
                  />
                ))}
              </div>

              <button 
                onClick={next}
                className="p-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                {currentStep === steps.length - 1 ? <CheckCircle2 size={24} /> : <ArrowRight size={24} />}
              </button>
            </div>

            <div 
                className="flex items-center justify-center gap-2 cursor-pointer group py-2 select-none"
                onClick={() => setDontShowAgain(!dontShowAgain)}
            >
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${dontShowAgain ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600 text-transparent group-hover:border-indigo-400 bg-slate-50 dark:bg-slate-800'}`}>
                    <Check size={12} strokeWidth={3} />
                </div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300">
                    Больше не показывать
                </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Onboarding;