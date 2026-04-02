import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Puzzle, BoardInfo, Solver, Solution } from './solver';
import { Plus, Trash2, Play, ChevronLeft, ChevronRight, Info, Copy, Globe } from 'lucide-react';
import { t, Lang } from './ui';

const DEFAULT_COLORS = [
  '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'
];

const DebouncedInput = ({ value, onChange, delay = 300, ...props }: any) => {
  const [localValue, setLocalValue] = useState(value);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localValue !== value) {
        onChangeRef.current(localValue);
      }
    }, delay);
    return () => clearTimeout(handler);
  }, [localValue, delay, value]);

  return (
    <input
      {...props}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
    />
  );
};

const ColorPickerDot = ({ id, color, onChange, delay = 300, title }: any) => {
  const [localColor, setLocalColor] = useState(color);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    setLocalColor(color);
  }, [color]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localColor !== color) {
        onChangeRef.current(localColor);
      }
    }, delay);
    return () => clearTimeout(handler);
  }, [localColor, delay, color]);

  return (
    <div 
      className="group relative w-7 h-7 rounded-full border-2 border-white shadow-md hover:z-10 hover:scale-110 transition-all cursor-pointer flex items-center justify-center" 
      style={{ backgroundColor: localColor }}
      title={title} 
    >
      <input
        type="color"
        value={localColor}
        onChange={(e) => setLocalColor(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4"
      />
      <div className="absolute inset-0 rounded-full ring-1 ring-black/10 pointer-events-none"></div>
    </div>
  );
};

type PuzzleState = { id: string; w: number; h: number; content: number[]; count: number };

export default function App() {
  const [lang, setLang] = useState<Lang>('en');
  const [customColors, setCustomColors] = useState<Record<number, string>>({});

  // --- State: Board Configuration ---
  const [boardWidth, setBoardWidth] = useState(5);
  const [boardHeight, setBoardHeight] = useState(5);
  const [targetXSum, setTargetXSum] = useState<number[]>([1, 5, 5, 5, 1]);
  const [targetYSum, setTargetYSum] = useState<number[]>([3, 3, 3, 5, 3]);
  const [fixedPos, setFixedPos] = useState<Record<string, number>>({
    '0,0': 0, '4,4': 0, '4,0': 0, '0,4': 0,'1,0': 1,'3,0': 1,
  });

  // --- State: Puzzles Configuration ---
  const [puzzles, setPuzzles] = useState<PuzzleState[]>([
    { id: '1', w: 3, h: 2, content: [0, 1, 1, 1, 1, 0], count: 3 },
    { id: '2', w: 2, h: 2, content: [1, 1, 1, 0], count: 1 }
  ]);

  // --- State: Solver Results ---
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [currentSolIdx, setCurrentSolIdx] = useState(0);
  const [isSolving, setIsSolving] = useState(false);
  const [timeTaken, setTimeTaken] = useState(0);
  const [hasSolved, setHasSolved] = useState(false);

  // --- Derived State ---
  const expandedIds = useMemo(() => {
    const ids: number[][] = [];
    let currentId = 1;
    for (const p of puzzles) {
      const pIds = [];
      for (let i = 0; i < p.count; i++) {
        pIds.push(currentId++);
      }
      ids.push(pIds);
    }
    return ids;
  }, [puzzles]);

  const getColor = (id: number) => customColors[id] || DEFAULT_COLORS[id % DEFAULT_COLORS.length];

  const handleColorChange = (id: number, color: string) => {
    setCustomColors(prev => ({ ...prev, [id]: color }));
  };

  // --- Handlers: Board ---
  const handleWidthChange = (w: number) => {
    const newW = Math.max(1, Math.min(10, w));
    setBoardWidth(newW);
    setTargetXSum(prev => {
      const next = [...prev];
      while (next.length < newW) next.push(0);
      return next.slice(0, newW);
    });
  };

  const handleHeightChange = (h: number) => {
    const newH = Math.max(1, Math.min(10, h));
    setBoardHeight(newH);
    setTargetYSum(prev => {
      const next = [...prev];
      while (next.length < newH) next.push(0);
      return next.slice(0, newH);
    });
  };

  const updateXSum = (index: number, val: number) => {
    const next = [...targetXSum];
    next[index] = Math.max(0, val);
    setTargetXSum(next);
  };

  const updateYSum = (index: number, val: number) => {
    const next = [...targetYSum];
    next[index] = Math.max(0, val);
    setTargetYSum(next);
  };

  const cycleFixedPos = (x: number, y: number) => {
    const key = `${x},${y}`;
    const current = fixedPos[key];
    const newFixedPos = { ...fixedPos };
    if (current === undefined) newFixedPos[key] = 0;
    else if (current === 0) newFixedPos[key] = 1;
    else delete newFixedPos[key];
    setFixedPos(newFixedPos);
  };

  // --- Handlers: Puzzles ---
  const addPuzzle = () => {
    setPuzzles([...puzzles, { id: Math.random().toString(36).slice(2), w: 2, h: 2, content: [1, 1, 1, 1], count: 1 }]);
  };

  const removePuzzle = (id: string) => {
    setPuzzles(puzzles.filter(p => p.id !== id));
  };

  const duplicatePuzzle = (id: string) => {
    const p = puzzles.find(p => p.id === id);
    if (p) {
      setPuzzles([...puzzles, { ...p, id: Math.random().toString(36).slice(2) }]);
    }
  };

  const updatePuzzle = (id: string, updates: Partial<PuzzleState>) => {
    setPuzzles(puzzles.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, ...updates };
      if (updates.count !== undefined) updated.count = Math.max(1, Math.min(8, updates.count));
      if (updates.w !== undefined) updated.w = Math.max(1, Math.min(10, updates.w));
      if (updates.h !== undefined) updated.h = Math.max(1, Math.min(10, updates.h));
      // Handle resize
      if (updates.w !== undefined || updates.h !== undefined) {
        const newW = updated.w;
        const newH = updated.h;
        const newContent = new Array(newW * newH).fill(0);
        for (let y = 0; y < Math.min(p.h, newH); y++) {
          for (let x = 0; x < Math.min(p.w, newW); x++) {
            newContent[y * newW + x] = p.content[y * p.w + x];
          }
        }
        updated.content = newContent;
      }
      return updated;
    }));
  };

  const togglePuzzleCell = (id: string, x: number, y: number) => {
    setPuzzles(puzzles.map(p => {
      if (p.id !== id) return p;
      const newContent = [...p.content];
      const idx = y * p.w + x;
      newContent[idx] = newContent[idx] === 0 ? 1 : 0;
      return { ...p, content: newContent };
    }));
  };

  // --- Handlers: Solver ---
  const handleSolve = () => {
    setIsSolving(true);
    setHasSolved(false);
    
    // Use setTimeout to allow UI to show "Solving..." state
    setTimeout(() => {
      const start = performance.now();
      
      const fixedPosMap = new Map<string, number>();
      Object.entries(fixedPos).forEach(([k, v]) => {
        const [x, y] = k.split(',').map(Number);
        if (x < boardWidth && y < boardHeight) {
          fixedPosMap.set(k, v);
        }
      });

      const info: BoardInfo = {
        colX: boardWidth,
        rowY: boardHeight,
        targetXSum: targetXSum,
        targetYSum: targetYSum,
        fixedPos: fixedPosMap,
      };

      // Expand puzzles based on their count
      const puzzleInstances: Puzzle[] = [];
      puzzles.forEach(p => {
        for (let i = 0; i < p.count; i++) {
          puzzleInstances.push(new Puzzle(p.w, p.h, p.content));
        }
      });
      
      const solver = new Solver(puzzleInstances, info);
      const sols = solver.solveAllUnique();
      
      const end = performance.now();

      setSolutions(sols);
      setCurrentSolIdx(0);
      setTimeTaken(end - start);
      setIsSolving(false);
      setHasSolved(true);
    }, 50);
  };

  const currentSolution = solutions[currentSolIdx];

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-8 font-sans text-neutral-900">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">{t[lang].title}</h1>
            <p className="text-neutral-500">{t[lang].subtitle}</p>
          </div>
          <button
            onClick={() => setLang(l => l === 'en' ? 'zh' : 'en')}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors text-sm font-medium shadow-sm"
          >
            <Globe className="w-4 h-4" />
            {lang === 'en' ? '中文' : 'English'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Configuration */}
          <div className="lg:col-span-6 xl:col-span-5 space-y-6">
            
            {/* Board Configuration */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">{t[lang].boardSetup}</h2>
                <button onClick={() => setFixedPos({})} className="text-xs text-neutral-400 hover:text-red-500">
                  {t[lang].clearFixed}
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-700">{t[lang].width}</label>
                  <DebouncedInput 
                    type="number" min="1" max="10"
                    value={boardWidth} 
                    onChange={(val: string) => handleWidthChange(parseInt(val) || 1)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-700">{t[lang].height}</label>
                  <DebouncedInput 
                    type="number" min="1" max="10"
                    value={boardHeight} 
                    onChange={(val: string) => handleHeightChange(parseInt(val) || 1)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-sm font-medium text-neutral-700 flex items-center gap-2">
                  {t[lang].targetSums}
                  <span className="text-xs font-normal text-neutral-400 flex items-center gap-1">
                    <Info size={14} /> {t[lang].instructions}
                  </span>
                </label>
                
                <div className="overflow-auto p-4 bg-neutral-50 border border-neutral-200 rounded-lg flex justify-center">
                  <div className="flex flex-col gap-1">
                    {/* Top X Sums Row */}
                    <div className="flex gap-1 ml-10 mb-1">
                      {targetXSum.map((sum, x) => (
                        <DebouncedInput
                          key={`xsum-${x}`}
                          type="number"
                          min="0"
                          value={sum}
                          onChange={(val: string) => updateXSum(x, parseInt(val) || 0)}
                          className="w-8 h-8 text-center border border-neutral-300 rounded-sm text-sm font-bold text-neutral-600 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                          title={`Target sum for column ${x + 1}`}
                        />
                      ))}
                    </div>

                    {/* Grid Rows with Y Sums */}
                    {Array.from({ length: boardHeight }).map((_, y) => (
                      <div key={`row-${y}`} className="flex gap-1 items-center">
                        <DebouncedInput
                          type="number"
                          min="0"
                          value={targetYSum[y]}
                          onChange={(val: string) => updateYSum(y, parseInt(val) || 0)}
                          className="w-9 h-8 text-center border border-neutral-300 rounded-sm text-sm font-bold text-neutral-600 focus:ring-2 focus:ring-blue-500 outline-none bg-white mr-1"
                          title={`Target sum for row ${y + 1}`}
                        />
                        {Array.from({ length: boardWidth }).map((_, x) => {
                          const key = `${x},${y}`;
                          const val = fixedPos[key];
                          let display = '';
                          let bg = 'bg-white';
                          if (val === 0) { display = 'X'; bg = 'bg-neutral-800 text-white'; }
                          if (val === 1) { display = 'O'; bg = 'bg-blue-500 text-white'; }

                          return (
                            <div
                              key={`cell-${x}`}
                              onClick={() => cycleFixedPos(x, y)}
                              className={`w-8 h-8 flex items-center justify-center border border-neutral-300 cursor-pointer select-none text-xs font-bold rounded-sm transition-colors ${bg}`}
                            >
                              {display}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Puzzles Configuration */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">{t[lang].puzzlePieces}</h2>
                <button 
                  onClick={addPuzzle} 
                  className="flex items-center gap-1 text-sm px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-md transition-colors"
                >
                  <Plus size={16} /> {t[lang].addPiece}
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2">
                {puzzles.map((p, i) => (
                  <div key={p.id} className="border border-neutral-200 rounded-lg p-4 space-y-4 relative bg-neutral-50 group">
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => duplicatePuzzle(p.id)}
                        className="p-1 text-neutral-400 hover:text-blue-500 bg-white rounded shadow-sm border border-neutral-200"
                        title="Duplicate Puzzle"
                      >
                        <Copy size={14} />
                      </button>
                      <button 
                        onClick={() => removePuzzle(p.id)}
                        className="p-1 text-neutral-400 hover:text-red-500 bg-white rounded shadow-sm border border-neutral-200"
                        title="Remove Puzzle"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-3 flex-wrap pr-16">
                      <div className="flex -space-x-2 p-1">
                        {expandedIds[i].map(id => (
                          <ColorPickerDot
                            key={id}
                            id={id}
                            color={getColor(id)}
                            onChange={(color: string) => handleColorChange(id, color)}
                            title={`${t[lang].changeColor} (Piece ${id})`}
                          />
                        ))}
                      </div>
                      <div className="font-medium text-sm text-neutral-700">{t[lang].pieceType} {i + 1}</div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-neutral-500 font-medium">{t[lang].width}:</span>
                        <DebouncedInput 
                          type="number" min="1" max="10" 
                          value={p.w} 
                          onChange={(val: string) => updatePuzzle(p.id, { w: parseInt(val) || 1 })}
                          className="w-10 px-1 py-0.5 border border-neutral-300 rounded text-xs outline-none focus:border-blue-500 text-center" 
                          title="Width"
                        />
                        <span className="text-neutral-400 text-xs">x</span>
                        <DebouncedInput 
                          type="number" min="1" max="10" 
                          value={p.h} 
                          onChange={(val: string) => updatePuzzle(p.id, { h: parseInt(val) || 1 })}
                          className="w-10 px-1 py-0.5 border border-neutral-300 rounded text-xs outline-none focus:border-blue-500 text-center"
                          title="Height"
                        />
                      </div>
                      
                      <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-neutral-200">
                        <span className="text-xs text-neutral-500 font-medium">{t[lang].qty}:</span>
                        <DebouncedInput 
                          type="number" min="1" max="6" 
                          value={p.count} 
                          onChange={(val: string) => updatePuzzle(p.id, { count: parseInt(val) || 1 })}
                          className="w-10 px-1 py-0.5 text-xs outline-none text-center font-bold text-blue-600"
                          title="Quantity of this piece"
                        />
                      </div>
                    </div>
                    
                    <div className="overflow-auto flex justify-start pt-1">
                      <div className="flex flex-col gap-1">
                        {Array.from({ length: p.h }).map((_, py) => (
                          <div key={py} className="flex gap-1">
                            {Array.from({ length: p.w }).map((_, px) => {
                              const idx = py * p.w + px;
                              const isActive = p.content[idx] === 1;
                              const firstColor = getColor(expandedIds[i][0]);
                              return (
                                <div
                                  key={px}
                                  onClick={() => togglePuzzleCell(p.id, px, py)}
                                  className={`w-6 h-6 border cursor-pointer rounded-sm transition-colors ${isActive ? '' : 'bg-white border-neutral-300'}`}
                                  style={isActive ? { backgroundColor: firstColor, borderColor: firstColor } : {}}
                                />
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {puzzles.length === 0 && (
                  <div className="col-span-full text-center py-8 text-neutral-400 text-sm border-2 border-dashed border-neutral-200 rounded-lg">
                    No puzzles added yet.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Solver & Results */}
          <div className="lg:col-span-6 xl:col-span-7 space-y-6">
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold">{t[lang].solve}</h2>
                  <p className="text-sm text-neutral-500">{t[lang].findPlacements}</p>
                </div>
                <button
                  onClick={handleSolve}
                  disabled={isSolving || puzzles.length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition-colors cursor-pointer font-medium w-full sm:w-auto justify-center"
                >
                  <Play size={18} fill="currentColor" />
                  {isSolving ? t[lang].solving : t[lang].solve}
                </button>
              </div>

              {hasSolved && (
                <div className="p-4 bg-blue-50 text-blue-800 rounded-lg border border-blue-100 flex justify-between items-center">
                  <span className="font-medium">
                    {t[lang].solutionsFound}: {solutions.length}
                  </span>
                  <span className="text-sm opacity-80">
                    {t[lang].timeTaken}: {timeTaken.toFixed(1)}{t[lang].ms}
                  </span>
                </div>
              )}
            </div>

            {solutions.length > 0 && currentSolution && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200 flex flex-col items-center space-y-8 overflow-hidden">
                <div className="flex items-center space-x-4 w-full justify-center">
                  <button
                    onClick={() => setCurrentSolIdx(i => Math.max(0, i - 1))}
                    disabled={currentSolIdx === 0}
                    className="p-2 border border-neutral-300 rounded-md hover:bg-neutral-50 disabled:opacity-50 cursor-pointer transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="font-medium min-w-[120px] text-center">
                    {currentSolIdx + 1} {t[lang].of} {solutions.length}
                  </span>
                  <button
                    onClick={() => setCurrentSolIdx(i => Math.min(solutions.length - 1, i + 1))}
                    disabled={currentSolIdx === solutions.length - 1}
                    className="p-2 border border-neutral-300 rounded-md hover:bg-neutral-50 disabled:opacity-50 cursor-pointer transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>

                <div className="overflow-auto max-w-full pb-4">
                  <div className="inline-flex flex-col">
                    {/* Top X Sums */}
                    <div className="flex ml-10 mb-2">
                      {targetXSum.map((sum, i) => (
                        <div key={`xsum-${i}`} className="w-10 h-8 flex items-center justify-center font-bold text-neutral-500 text-sm">
                          {sum}
                        </div>
                      ))}
                    </div>

                    {currentSolution.boardID.map((row, y) => (
                      <div key={`row-${y}`} className="flex">
                        {/* Left Y Sums */}
                        <div className="w-10 h-10 flex items-center justify-center font-bold text-neutral-500 mr-0 text-sm">
                          {targetYSum[y]}
                        </div>
                        
                        {row.map((cellId, x) => {
                          const isFixed0 = fixedPos[`${x},${y}`] === 0;
                          const isFixed1 = fixedPos[`${x},${y}`] === 1;
                          let bgColor = 'bg-white';
                          let customStyle = {};
                          
                          if (isFixed0) {
                            bgColor = 'bg-neutral-800';
                          } else if (cellId > 0) {
                            customStyle = { backgroundColor: getColor(cellId) };
                          } else if (cellId === -1 || isFixed1) {
                            bgColor = 'bg-neutral-300';
                          }

                          return (
                            <div
                              key={`cell-${x}-${y}`}
                              className={`w-10 h-10 border border-neutral-200 flex items-center justify-center ${bgColor} transition-colors duration-300 rounded-sm m-[1px]`}
                              style={customStyle}
                            >
                              {isFixed0 && <span className="text-white text-xs opacity-50">X</span>}
                              {isFixed1 && cellId <= 0 && <span className="text-neutral-600 text-xs font-bold">O</span>}
                              {cellId > 0 && <span className="text-white/90 font-bold drop-shadow-sm">{cellId}</span>}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {hasSolved && solutions.length === 0 && (
              <div className="bg-white p-12 rounded-xl shadow-sm border border-neutral-200 text-center space-y-4">
                <div className="text-neutral-400 text-5xl mb-4">🧩</div>
                <h3 className="text-xl font-bold text-neutral-700">{t[lang].noSolutions}</h3>
                <p className="text-neutral-500 max-w-md mx-auto">
                  {t[lang].noSolutionsDesc}
                </p>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
