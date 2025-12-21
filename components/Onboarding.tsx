
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, StickyNote, Box, Kanban, Flame, CheckCircle2 } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const steps = [
  {
    id: 'intro',
    title: 'Лаборатория Личности',
    desc: 'Превращайте хаос мыслей в конкретные действия и привычки. Это не просто заметки, это конвейер по производству вашей лучшей версии.',
    icon: <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-slate-300 dark:shadow-none">L</div>,
    color: 'bg-slate-900'
  },
  {
    id: 'napkins',
    title: '1. Салфетки (Capture)',
    desc: 'Сбрасывайте всё, что приходит в голову. Не фильтруйте. Это ваше хранилище сырого материала. ИИ поможет найти нужные теги.',
    icon: <StickyNote size={48} className="text-blue-500" />,
    color: 'bg-blue-500'
  },
  {
    id: 'sandbox',
    title: '2. Песочница (Refine)',
    desc: 'Превращайте идеи в золото с помощью ИИ-менторов (Питерсон, Талеб и др.). Анализируйте мысли и создавайте из них Задачи или Навыки.',
    icon: <Box size={48} className="text-amber-500" />,
    color: 'bg-amber-500'
  },
  {
    id: 'kanban',
    title: '3. Действия (Act)',
    desc: 'Идеи становятся задачами. Используйте "Челленджи" для геймификации сложных дел и получайте советы от ИИ, если застряли.',
    icon: <Kanban size={48} className="text-emerald-500" />,
    color: 'bg-emerald-500'
  },
  {
    id: 'rituals',
    title: '4. Ритуалы (Sustain)',
    desc: 'Мы — это то, что мы делаем постоянно. Отслеживайте привычки, поддерживайте "огонь" стриков и следите за прогрессом на тепловой карте.',
    icon: <Flame size={48} className="text-orange-500" />,
    color: 'bg-orange-500'
  }
];

const Onboarding: React.FC<Props> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem('live_act_onboarding_completed');
    if (!hasSeen) {
      setIsVisible(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('live_act_onboarding_completed', 'true');
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
          className="bg-white dark:bg-[#1e293b] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative border border-slate-200 dark:border-slate-700"
        >
          {/* Progress Bar */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100 dark:bg-slate-800">
            <motion.div 
              className={`h-full ${steps[currentStep].color}`}
              initial={{ width: '0%' }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <button onClick={handleClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 z-10 p-2">
            <X size={20} />
          </button>

          <div className="p-8 md:p-10 flex flex-col items-center text-center h-[420px]">
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center w-full"
              >
                <div className="mb-8 mt-4 scale-110">
                  {steps[currentStep].icon}
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
                  {steps[currentStep].title}
                </h2>
                <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed font-light">
                  {steps[currentStep].desc}
                </p>
              </motion.div>
            </AnimatePresence>

            <div className="mt-auto w-full flex items-center justify-between pt-8">
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
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Onboarding;
