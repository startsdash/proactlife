                    {activeModal.type === 'details' && (() => {
                        const task = getTaskForModal();
                        if (!task) return null;
                        
                        const isDone = task.column === 'done';
                        const subtasksTotal = task.subtasks?.length || 0;
                        const subtasksDone = task.subtasks?.filter(s => s.isCompleted).length || 0;
                        const firstSphere = task.spheres && task.spheres.length > 0 ? task.spheres[0] : null;
                        const sphereColorClass = firstSphere && NEON_COLORS[firstSphere] ? `text-[${NEON_COLORS[firstSphere]}]` : 'text-indigo-500';

                        return (
                            <div className="space-y-6">
                                {/* TEXT EDITING */}
                                {isEditingTask ? (
                                    <div className="flex flex-col animate-in fade-in duration-200 relative z-10">
                                        <div className="mb-4">
                                            <input 
                                                type="text" 
                                                placeholder="Название" 
                                                value={editTaskTitle} 
                                                onChange={(e) => setEditTaskTitle(e.target.value)} 
                                                className="w-full bg-slate-50 dark:bg-black/20 rounded-xl p-3 text-xl font-sans font-bold text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 focus:border-indigo-300 dark:focus:border-indigo-500 outline-none placeholder:text-slate-300 transition-colors" 
                                            />
                                        </div>
                                        
                                        {/* Editor Toolbar */}
                                        <div className="flex items-center justify-between mb-2 gap-2">
                                            <div className="flex items-center gap-1 pb-1 overflow-x-auto scrollbar-none flex-1 mask-fade-right">
                                                <Tooltip content="Отменить"><button onMouseDown={(e) => { e.preventDefault(); execEditUndo(); }} disabled={editHistoryIndex <= 0} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors disabled:opacity-30"><RotateCcw size={16} /></button></Tooltip>
                                                <Tooltip content="Повторить"><button onMouseDown={(e) => { e.preventDefault(); execEditRedo(); }} disabled={editHistoryIndex >= editHistory.length - 1} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors disabled:opacity-30"><RotateCw size={16} /></button></Tooltip>
                                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                                <Tooltip content="Жирный"><button onMouseDown={(e) => { e.preventDefault(); execEditCmd('bold'); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"><Bold size={16} /></button></Tooltip>
                                                <Tooltip content="Курсив"><button onMouseDown={(e) => { e.preventDefault(); execEditCmd('italic'); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"><Italic size={16} /></button></Tooltip>
                                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0"></div>
                                                <Tooltip content="Очистить"><button onMouseDown={handleClearEditStyle} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"><Eraser size={16} /></button></Tooltip>
                                            </div>
                                        </div>

                                        <div 
                                            ref={editContentEditableRef} 
                                            contentEditable 
                                            onInput={handleEditInput} 
                                            className="w-full h-64 bg-slate-50 dark:bg-black/20 rounded-xl p-4 text-base text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 focus:border-indigo-300 dark:focus:border-indigo-500 outline-none overflow-y-auto font-sans [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1"
                                            style={{ whiteSpace: 'pre-wrap' }} 
                                            data-placeholder="Описание задачи..." 
                                        />

                                        {/* SPHERES IN EDIT MODE ONLY */}
                                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Сферы</label>
                                            <SphereSelector selected={task.spheres || []} onChange={(s) => updateTask({...task, spheres: s})} />
                                        </div>

                                        <div className="flex flex-col-reverse md:flex-row justify-end items-stretch md:items-center gap-3 pt-6 border-t border-slate-100 dark:border-slate-700 mt-4">
                                            <button onClick={() => setIsEditingTask(false)} className="px-5 py-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 w-full md:w-auto text-center font-medium">Отмена</button>
                                            <button onClick={handleSaveTaskContent} className="px-8 py-2.5 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl hover:bg-slate-800 dark:hover:bg-indigo-700 font-bold text-sm flex items-center justify-center gap-2 w-full md:w-auto shadow-lg shadow-indigo-500/20"><Check size={18} /> Сохранить</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="group relative pr-1">
                                        {/* 1. Context (Description) */}
                                        {task.description && (
                                            <CollapsibleSection title="Контекст" icon={<FileText size={12}/>}>
                                                <div className="text-xs text-[#6B6E70] dark:text-slate-400 leading-relaxed font-sans">
                                                    <ReactMarkdown components={markdownComponents}>{applyTypography(task.description)}</ReactMarkdown>
                                                </div>
                                            </CollapsibleSection>
                                        )}

                                        {/* Main Content */}
                                        <div className="text-[#2F3437] dark:text-slate-300 text-sm font-normal leading-relaxed font-sans mb-4">
                                            <ReactMarkdown components={markdownComponents}>{applyTypography(task.content)}</ReactMarkdown>
                                        </div>

                                        {/* 2. Checklist */}
                                        {(task.subtasks && task.subtasks.length > 0 || !isDone) && (
                                            <CollapsibleSection
                                                title="Чек-лист"
                                                icon={<ListTodo size={14}/>}
                                            >
                                                {/* SEGMENTED PROGRESS BAR */}
                                                {subtasksTotal > 0 && (
                                                    <SegmentedProgressBar total={subtasksTotal} current={subtasksDone} color={sphereColorClass} />
                                                )}

                                                <div className="space-y-1">
                                                    {task.subtasks?.map(s => (
                                                        <div 
                                                            key={s.id} 
                                                            className="group flex items-start gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-all duration-200 hover:translate-x-0.5 cursor-pointer relative"
                                                            draggable={!isDone}
                                                            onDragStart={!isDone ? (e) => handleSubtaskDragStart(e, s.id, task.id) : undefined}
                                                            onDragOver={handleDragOver}
                                                            onDrop={!isDone ? (e) => handleSubtaskDrop(e, s.id, task) : undefined}
                                                            onClick={() => !isDone && handleToggleSubtask(s.id)}
                                                        >
                                                            {/* Custom Checkbox */}
                                                            <div className={`
                                                                w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all duration-300 mt-0.5
                                                                ${s.isCompleted 
                                                                    ? 'bg-indigo-500 border-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' 
                                                                    : 'border-slate-300 dark:border-slate-600 group-hover:border-indigo-400 bg-white dark:bg-transparent'
                                                                }
                                                            `}>
                                                                {s.isCompleted && <Check size={12} className="text-white" strokeWidth={3} />}
                                                            </div>
                                                            
                                                            <span className={`text-sm flex-1 break-words leading-relaxed transition-all duration-300 ${s.isCompleted ? "text-slate-400 line-through opacity-50" : "text-[#2F3437] dark:text-slate-200"}`}>{s.text}</span>
                                                            
                                                            {!isDone && (
                                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteSubtask(s.id); }} className="text-slate-300 dark:text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"><X size={14}/></button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {!isDone && (
                                                        <div className="flex gap-2 mt-3 pl-2">
                                                            <input 
                                                                type="text" 
                                                                className="flex-1 bg-transparent border-b border-slate-200 dark:border-slate-700 py-1 text-sm outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:border-indigo-400 transition-colors"
                                                                placeholder="Новый пункт..."
                                                                value={newSubtaskText}
                                                                onChange={(e) => setNewSubtaskText(e.target.value)}
                                                                onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                                                            />
                                                            <button onClick={handleAddSubtask} disabled={!newSubtaskText.trim()} className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 p-1.5 rounded-lg disabled:opacity-50 transition-colors"><Plus size={18}/></button>
                                                        </div>
                                                    )}
                                                </div>
                                            </CollapsibleSection>
                                        )}

                                        {/* 3. Challenge */}
                                        {task.activeChallenge && (
                                            <CollapsibleSection
                                                title={task.isChallengeCompleted ? "Финальный челлендж" : "Активный челлендж"}
                                                icon={
                                                    task.isChallengeCompleted 
                                                    ? <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" /> 
                                                    : <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                                                }
                                                actions={!isDone ? (
                                                    <div className="flex items-center gap-3">
                                                        <Tooltip content={task.isChallengeCompleted ? "Вернуть в активные" : "Завершить челлендж"}>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); toggleChallengeComplete(); }}
                                                                className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${task.isChallengeCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-emerald-500 hover:text-emerald-500 text-transparent'}`}
                                                            >
                                                                <Check size={12} strokeWidth={3} />
                                                            </button>
                                                        </Tooltip>
                                                        
                                                        <div className="w-px h-3 bg-slate-300 dark:bg-slate-600"></div>

                                                        <Tooltip content="Удалить челлендж">
                                                            <button onClick={(e) => deleteActiveChallenge(e)} className="text-slate-300 hover:text-red-500 transition-colors">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </Tooltip>
                                                    </div>
                                                ) : null}
                                            >
                                                <div className="font-serif text-sm italic text-slate-800 dark:text-slate-100 leading-relaxed pl-1 pt-1">
                                                    {task.isChallengeCompleted ? (
                                                        <StaticChallengeRenderer content={task.activeChallenge} mode="history" />
                                                    ) : (
                                                        <InteractiveChallenge 
                                                            content={task.activeChallenge} 
                                                            onToggle={(i) => !isDone && toggleChallengeCheckbox(i, task)} 
                                                            onPin={!isDone ? (i) => handleToggleChallengeStepPin(i) : undefined}
                                                            pinnedIndices={task.pinnedChallengeIndices}
                                                        />
                                                    )}
                                                </div>
                                            </CollapsibleSection>
                                        )}

                                        {/* 4. History (Collapsible) */}
                                        {((task.challengeHistory && task.challengeHistory.length > 0) || (task.consultationHistory && task.consultationHistory.length > 0)) && (
                                            <CollapsibleSection title="История" icon={<History size={14}/>}>
                                                <div className="space-y-4">
                                                    {task.challengeHistory?.map((h, i) => (
                                                        <div key={`ch-${i}`} className="text-sm bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 relative group">
                                                            <div className="text-[9px] font-bold text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-1"><Zap size={10}/> Архивный челлендж</div>
                                                            <div className="opacity-70"><StaticChallengeRenderer content={h} mode="history" /></div>
                                                            {!isDone && (
                                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Tooltip content="Удалить">
                                                                        <button onClick={() => deleteChallengeFromHistory(i)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={12}/></button>
                                                                    </Tooltip>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {task.consultationHistory?.map((h, i) => (
                                                        <div key={`cons-${i}`} className="text-sm bg-violet-50/30 dark:bg-violet-900/10 p-4 rounded-xl border border-violet-100/50 dark:border-violet-800/30 relative group">
                                                            <div className="text-[9px] font-bold text-violet-400 mb-2 uppercase tracking-wider flex items-center gap-1"><Bot size={10}/> Консультация</div>
                                                            <div className="text-[#2F3437] dark:text-slate-300 leading-relaxed opacity-80"><ReactMarkdown components={markdownComponents}>{applyTypography(h)}</ReactMarkdown></div>
                                                            {!isDone && (
                                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Tooltip content="Удалить">
                                                                        <button onClick={() => deleteConsultation(i)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={12}/></button>
                                                                    </Tooltip>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </CollapsibleSection>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })()}