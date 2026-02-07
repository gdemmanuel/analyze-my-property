// Saved Properties Tab Component
{
    activeTab === 'saved' && (
        <div className="space-y-6 animate-in fade-in duration-700 max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black tracking-tighter text-slate-900">Saved Properties</h2>
                {savedAssessments.length > 1 && (
                    <button
                        onClick={toggleComparisonMode}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${comparisonMode
                                ? 'bg-[#f43f5e] text-white shadow-lg'
                                : 'bg-white border border-slate-200 text-slate-700 hover:border-[#f43f5e]'
                            }`}
                    >
                        <ArrowLeftRight size={14} />
                        {comparisonMode ? 'Exit Compare' : 'Compare Properties'}
                    </button>
                )}
            </div>

            {comparisonMode && selectedForComparison.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Check size={16} className="text-indigo-600" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-indigo-900">
                            {selectedForComparison.length} {selectedForComparison.length === 1 ? 'Property' : 'Properties'} Selected
                        </span>
                    </div>
                    {selectedForComparison.length >= 2 && (
                        <button
                            onClick={() => {
                                // Show comparison view
                                const compareProps = savedAssessments.filter(a => selectedForComparison.includes(a.id));
                                console.log('Comparing:', compareProps);
                                // You can add a modal or new view here
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest"
                        >
                            View Comparison
                        </button>
                    )}
                </div>
            )}

            {savedAssessments.length === 0 ? (
                <div className="py-32 px-10 bg-white rounded-[3rem] border border-slate-100 shadow-xl flex flex-col items-center justify-center">
                    <div className="w-24 h-24 bg-[#0f172a] rounded-[2.5rem] flex items-center justify-center text-white mb-10">
                        <Save size={40} className="text-[#f43f5e]" />
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">No Saved Properties</h3>
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-[0.3em] max-w-2xl text-center">
                        Analyze a property and click "SAVE" to build your portfolio comparison list.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {savedAssessments.map((assessment) => (
                        <div
                            key={assessment.id}
                            className={`bg-white rounded-2xl border-2 transition-all overflow-hidden ${comparisonMode && selectedForComparison.includes(assessment.id)
                                    ? 'border-[#f43f5e] shadow-lg'
                                    : 'border-slate-100 hover:border-slate-200'
                                }`}
                        >
                            {comparisonMode && (
                                <div className="bg-slate-50 border-b border-slate-100 p-3 flex items-center justify-between">
                                    <button
                                        onClick={() => togglePropertyForComparison(assessment.id)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${selectedForComparison.includes(assessment.id)
                                                ? 'bg-[#f43f5e] text-white'
                                                : 'bg-white border border-slate-200 text-slate-600'
                                            }`}
                                    >
                                        {selectedForComparison.includes(assessment.id) ? (
                                            <>
                                                <Check size={12} /> Selected
                                            </>
                                        ) : (
                                            <>
                                                <PlusCircle size={12} /> Select
                                            </>
                                        )}
                                    </button>
                                    {selectedForComparison.length >= 4 && !selectedForComparison.includes(assessment.id) && (
                                        <span className="text-[8px] font-bold text-slate-400 uppercase">Max 4</span>
                                    )}
                                </div>
                            )}

                            <div className="p-5">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-sm font-black text-slate-900 mb-1 leading-tight">
                                            {assessment.address}
                                        </h3>
                                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                            <span>{assessment.strategy}</span>
                                            <span>•</span>
                                            <span>{new Date(assessment.timestamp).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    {!comparisonMode && (
                                        <button
                                            onClick={() => deleteSaved(assessment.id)}
                                            className="p-2 hover:bg-rose-50 rounded-lg transition-colors"
                                        >
                                            <Trash size={14} className="text-slate-400 hover:text-rose-500" />
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <div className="bg-slate-50 rounded-lg p-3">
                                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Cap Rate</div>
                                        <div className="text-lg font-black text-slate-900">{assessment.capRate.toFixed(2)}%</div>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-3">
                                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">CoC</div>
                                        <div className="text-lg font-black text-slate-900">
                                            {assessment.cashOnCash >= 1000 ? '∞' : `${assessment.cashOnCash.toFixed(2)}%`}
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-3">
                                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Price</div>
                                        <div className="text-sm font-black text-slate-900">${(assessment.price / 1000).toFixed(0)}k</div>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-3">
                                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">NOI</div>
                                        <div className="text-sm font-black text-slate-900">${(assessment.annualNoi / 1000).toFixed(1)}k</div>
                                    </div>
                                </div>

                                {!comparisonMode && (
                                    <button
                                        onClick={() => {
                                            setPropertyInput(assessment.address);
                                            setDisplayedAddress(assessment.address);
                                            setStrategy(assessment.strategy);
                                            setActiveTab('dashboard');
                                            runAnalysis();
                                        }}
                                        className="w-full px-4 py-2 bg-[#0f172a] hover:bg-black text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                    >
                                        View Analysis
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
