import { useState, useEffect } from 'react';
import { ListTodo, Plus, Trash2, Save, Pencil, X, GripVertical, Repeat, Copy, Settings2, CheckCircle2 } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface Exercise {
  name: string;
  category?: 'strength' | 'bodyweight' | 'run' | 'interval' | 'sprint' | 'timed';
  sets?: number;
  reps?: number;
  distance?: number;
  duration?: number;
}
interface Circuit { type: 'circuit'; rounds: number; exercises: { name: string; reps: number }[]; }
type ProgramItem = Exercise | Circuit;
function isCircuit(item: ProgramItem): item is Circuit { return (item as Circuit).type === 'circuit'; }

// Sortable Row
function SortableExerciseRow({ id, item, index, onUpdate, onRemove }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, data: { type: 'exercise' } });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : ('auto' as any) };
  const cat = item.category || 'strength';
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1.5 bg-zinc-50 p-2 rounded-lg border border-zinc-100 flex-wrap">
      <button {...attributes} {...listeners} className="touch-none p-1 text-zinc-300 hover:text-zinc-500 cursor-grab active:cursor-grabbing shrink-0">
        <GripVertical className="w-4 h-4" />
      </button>
      <input type="text" value={item.name} onChange={(e) => onUpdate(index, 'name', e.target.value)} placeholder="Exercise" className="flex-1 bg-transparent text-sm font-medium outline-none min-w-0 min-w-[100px]" />
      <select value={cat} onChange={(e) => onUpdate(index, 'category', e.target.value)} className="text-[10px] bg-zinc-200 text-zinc-600 outline-none p-1 rounded font-medium uppercase">
        <option value="strength">Strength</option>
        <option value="bodyweight">Bodywt</option>
        <option value="run">Run</option>
        <option value="sprint">Sprint</option>
        <option value="interval">Interval</option>
        <option value="timed">Timed</option>
      </select>
      <div className="flex items-center gap-1 text-sm text-zinc-500 shrink-0 select-none">
        {(cat === 'strength' || cat === 'bodyweight') && (<><input type="number" value={item.sets || 3} onChange={(e) => onUpdate(index, 'sets', parseInt(e.target.value) || 0)} className="w-6 text-center bg-transparent outline-none" />×<input type="number" value={item.reps || 10} onChange={(e) => onUpdate(index, 'reps', parseInt(e.target.value) || 0)} className="w-8 text-center bg-transparent outline-none" /></>)}
        {cat === 'run' && (<><input type="number" value={item.distance || 0} onChange={(e) => onUpdate(index, 'distance', parseFloat(e.target.value) || 0)} placeholder="mi" className="w-8 text-center bg-transparent outline-none placeholder:text-zinc-300" />mi <input type="number" value={item.duration || 0} onChange={(e) => onUpdate(index, 'duration', parseInt(e.target.value) || 0)} placeholder="m" className="w-8 text-center bg-transparent outline-none placeholder:text-zinc-300 ml-1" />min</>)}
        {(cat === 'sprint' || cat === 'interval') && (<><input type="number" value={item.sets || 4} onChange={(e) => onUpdate(index, 'sets', parseInt(e.target.value) || 0)} className="w-6 text-center bg-transparent outline-none" />×<input type="number" value={item.distance || 0} onChange={(e) => onUpdate(index, 'distance', parseFloat(e.target.value) || 0)} placeholder="dist" className="w-8 text-center bg-transparent outline-none ml-1 placeholder:text-zinc-300" /></>)}
        {cat === 'timed' && (<><input type="number" value={item.sets || 3} onChange={(e) => onUpdate(index, 'sets', parseInt(e.target.value) || 0)} className="w-6 text-center bg-transparent outline-none" />×<input type="number" value={item.duration || 60} onChange={(e) => onUpdate(index, 'duration', parseInt(e.target.value) || 0)} placeholder="s" className="w-8 text-center bg-transparent outline-none ml-1 placeholder:text-zinc-300" />s</>)}
      </div>
      <button onClick={() => onRemove(index)} className="p-1 text-zinc-400 hover:text-red-500 shrink-0"><Trash2 className="w-4 h-4" /></button>
    </div>
  );
}

// Sortable Circuit
function SortableCircuitBlock({ id, item, index, onUpdate, onRemove }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, data: { type: 'exercise' } });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : ('auto' as any) };
  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/30 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <button {...attributes} {...listeners} className="touch-none p-1 text-zinc-300 hover:text-zinc-500 cursor-grab active:cursor-grabbing shrink-0"><GripVertical className="w-4 h-4" /></button>
        <Repeat className="w-4 h-4 text-blue-500 shrink-0" />
        <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Circuit</span>
        <div className="flex items-center gap-1 ml-auto text-xs text-blue-600">
          <span>×</span>
          <input type="number" value={item.rounds} onChange={(e) => onUpdate(index, 'rounds', parseInt(e.target.value) || 1)} className="w-8 text-center bg-white/60 border border-blue-200 rounded outline-none" /><span>rounds</span>
        </div>
        <button onClick={() => onRemove(index)} className="p-1 text-zinc-400 hover:text-red-500 shrink-0"><Trash2 className="w-4 h-4" /></button>
      </div>
      {item.exercises.map((ex: any, exIdx: number) => (
        <div key={exIdx} className="flex items-center gap-2 bg-white/60 p-2 rounded border border-blue-100 ml-6">
          <input type="text" value={ex.name} onChange={(e) => { const n = [...item.exercises]; n[exIdx] = { ...n[exIdx], name: e.target.value }; onUpdate(index, 'exercises', n); }} placeholder="Exercise" className="flex-1 bg-transparent text-sm font-medium outline-none min-w-0" />
          <div className="flex items-center gap-1 text-sm text-zinc-500 shrink-0">
            <span>×</span><input type="number" value={ex.reps} onChange={(e) => { const n = [...item.exercises]; n[exIdx] = { ...n[exIdx], reps: parseInt(e.target.value) || 0 }; onUpdate(index, 'exercises', n); }} className="w-8 text-center bg-transparent outline-none" />
          </div>
          <button onClick={() => { const n = [...item.exercises]; n.splice(exIdx, 1); onUpdate(index, 'exercises', n); }} className="p-1 text-zinc-400 hover:text-red-500 shrink-0"><Trash2 className="w-3 h-3" /></button>
        </div>
      ))}
      <button onClick={() => onUpdate(index, 'exercises', [...item.exercises, { name: '', reps: 10 }])} className="ml-6 flex items-center gap-1 text-xs font-medium text-blue-500 hover:text-blue-700 transition-colors">
        <Plus className="w-3 h-3" /> Add to circuit
      </button>
    </div>
  );
}

// Day Card representing a single program cycle day
function DayCard({ day, dayIndex, onUpdateProgram, onSaveAsTemplate }: any) {
  const [editing, setEditing] = useState(false);
  const exercises: ProgramItem[] = day.exercises || [];

  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dayIndex}`,
    data: { type: 'day', dayIndex }
  });

  const itemIds = exercises.map((_, i) => `item-${dayIndex}-${i}`);

  const updateExercise = (index: number, field: string, value: any) => {
    const next = [...exercises];
    next[index] = { ...next[index], [field]: value };
    onUpdateProgram(dayIndex, { exercises: next });
  };
  const removeExercise = (index: number) => {
    const next = [...exercises];
    next.splice(index, 1);
    onUpdateProgram(dayIndex, { exercises: next });
  };

  const titleText = `Day ${dayIndex + 1} - ${WEEKDAYS[dayIndex % 7]}`;

  if (!editing) {
    return (
      <div ref={setNodeRef} className={`bg-white rounded-2xl p-5 shadow-sm border transition-colors ${isOver ? 'border-blue-400 bg-blue-50/20' : 'border-zinc-100'}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold text-zinc-900">{titleText}</h2>
            <p className="text-xs font-medium text-zinc-500">{day.title || 'Rest'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onSaveAsTemplate({ title: day.title || titleText, exercises })} className="text-zinc-400 hover:text-blue-600 p-1.5 transition-colors" title="Save as Template"><Copy className="w-4 h-4" /></button>
            <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 bg-zinc-100 px-2.5 py-1.5 rounded-full transition-colors"><Pencil className="w-3 h-3" /> Edit</button>
          </div>
        </div>
        {exercises.length > 0 && (
          <div className="space-y-1.5">
            {exercises.map((item, i) => (
              <div key={i}>
                {isCircuit(item) ? (
                  <div className="rounded-lg border border-blue-100 bg-blue-50/30 p-2 text-sm">
                    <span className="font-bold text-blue-600 uppercase text-[10px]">Circuit × {item.rounds}</span>
                    {item.exercises.map((ex, j) => <p key={j} className="text-zinc-600 ml-4">{ex.name || '—'} <span className="text-zinc-400">× {ex.reps}</span></p>)}
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-600 font-medium">{item.name || '—'}</span>
                    <span className="text-zinc-400 text-xs text-right whitespace-nowrap">
                      {(!item.category || item.category === 'strength' || item.category === 'bodyweight') && `${item.sets || 3}×${item.reps || 10}`}
                      {item.category === 'run' && `${item.distance || 0}mi / ${item.duration || 0}m`}
                      {(item.category === 'sprint' || item.category === 'interval') && `${item.sets || 4}×${item.distance || 0}`}
                      {item.category === 'timed' && `${item.sets || 3}×${item.duration || 60}s`}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Edit Mode
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-zinc-900 space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
        <h2 className="font-bold text-zinc-900 w-32">{titleText}</h2>
        <input type="text" value={day.title || ''} onChange={(e) => onUpdateProgram(dayIndex, { title: e.target.value })} placeholder="e.g., Upper Body, Rest" className="flex-1 bg-transparent text-sm text-right font-medium text-zinc-600 outline-none placeholder:text-zinc-300" />
      </div>

      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {exercises.map((item, i) => isCircuit(item) ? (
            <SortableCircuitBlock key={itemIds[i]} id={itemIds[i]} item={item} index={i} onUpdate={updateExercise} onRemove={removeExercise} />
          ) : (
            <SortableExerciseRow key={itemIds[i]} id={itemIds[i]} item={item} index={i} onUpdate={updateExercise} onRemove={removeExercise} />
          ))}
        </div>
      </SortableContext>

      <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
        <button onClick={() => onUpdateProgram(dayIndex, { exercises: [...exercises, { name: '', sets: 3, reps: 10 }] })} className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"><Plus className="w-3 h-3" /> Exercise</button>
        <button onClick={() => onUpdateProgram(dayIndex, { exercises: [...exercises, { type: 'circuit', rounds: 3, exercises: [{ name: '', reps: 10 }] }] })} className="flex items-center gap-1 text-xs font-medium text-blue-500 hover:text-blue-700 transition-colors"><Repeat className="w-3 h-3" /> Circuit</button>
        <button onClick={() => setEditing(false)} className="ml-auto flex items-center gap-1 text-xs font-medium bg-zinc-900 text-white px-3 py-1.5 rounded-full hover:bg-zinc-800 transition-colors"><CheckCircle2 className="w-3 h-3" /> Done</button>
      </div>
    </div>
  );
}

// Draggable Sidebar Template Block
function DraggableTemplateBlock({ template }: { key?: any, template: any }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `template-${template.id}`,
    data: { type: 'template', template }
  });
  
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 9999 } : undefined;
  
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={`bg-white border rounded-xl p-3 shadow-sm cursor-grab active:cursor-grabbing text-left hover:border-blue-300 transition-colors ${isDragging ? 'opacity-80 ring-2 ring-blue-500 scale-105' : 'border-zinc-200'}`}>
      <div className="flex items-center gap-2 mb-1">
        <GripVertical className="w-4 h-4 text-zinc-300 shrink-0" />
        <h4 className="font-bold text-sm text-zinc-800 line-clamp-1">{template.title}</h4>
      </div>
      <p className="text-xs text-zinc-500 pl-6 line-clamp-2">{(template.exercises || []).map((e: any) => e.name || 'Circuit').join(', ')}</p>
    </div>
  );
}

export default function ProgramPage() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [activeProgId, setActiveProgId] = useState<number | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Sync data on mount
  useEffect(() => {
    async function init() {
      try {
        const [progRes, tempRes] = await Promise.all([ fetch('/api/programs'), fetch('/api/templates') ]);
        const progs = await progRes.json();
        const temps = await tempRes.json();
        setPrograms(progs);
        setTemplates(temps);
        const active = progs.find((p: any) => p.is_active);
        if (active) setActiveProgId(active.id);
        else if (progs.length > 0) setActiveProgId(progs[0].id);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    }
    init();
  }, []);

  const currentProg = programs.find(p => p.id === activeProgId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !currentProg) return;

    // 1. Template Dropped onto a DayCard
    if (active.data.current?.type === 'template' && over.data.current?.type === 'day') {
      const dayIndex = over.data.current.dayIndex;
      const tpl = active.data.current.template;
      handleUpdateProgramDay(dayIndex, { title: tpl.title, exercises: tpl.exercises });
      return;
    }

    // 2. Exercise sorted inside a DayCard
    if (active.data.current?.type === 'exercise' && over.data.current?.type === 'exercise') {
      // Find which day we are in
      const activeIdParts = String(active.id).split('-');
      const overIdParts = String(over.id).split('-');
      if (activeIdParts[0] === 'item' && activeIdParts[1] === overIdParts[1]) {
        const dayIndex = parseInt(activeIdParts[1]);
        const day = currentProg.days.find((d: any) => d.day_index === dayIndex);
        if (day) {
          const oldIndex = day.exercises.findIndex((_: any, i: number) => `item-${dayIndex}-${i}` === active.id);
          const newIndex = day.exercises.findIndex((_: any, i: number) => `item-${dayIndex}-${i}` === over.id);
          const nextEx = arrayMove([...day.exercises], oldIndex, newIndex);
          handleUpdateProgramDay(dayIndex, { exercises: nextEx });
        }
      }
    }
  };

  const handleUpdateProgramDay = (dayIndex: number, updates: any) => {
    setPrograms(prev => prev.map(p => {
      if (p.id !== activeProgId) return p;
      return {
        ...p,
        days: p.days.map((d: any) => d.day_index === dayIndex ? { ...d, ...updates } : d)
      };
    }));
  };

  const syncProgramToDb = async () => {
    if (!currentProg) return;
    setSaving(true);
    try {
      await fetch(`/api/programs?id=${currentProg.id}&sync=true`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: currentProg.days })
      });
      // Also update top level attributes if they changed
      await fetch(`/api/programs?id=${currentProg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: currentProg.title, cycle_weeks: currentProg.cycle_weeks })
      });
      alert('Saved successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to save program');
    } finally {
      setSaving(false);
    }
  };

  const saveAsTemplate = async (data: { title: string, exercises: any }) => {
    try {
      const res = await fetch('/api/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const newTemplate = await res.json();
      setTemplates([...templates, newTemplate]);
    } catch (e) { console.error('Failed to create template', e); }
  };

  const createNewProgram = async () => {
    const title = window.prompt('Program Name:');
    if (!title) return;
    try {
      const res = await fetch('/api/programs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, cycle_weeks: 1 }) });
      const newProg = await res.json();
      
      const refreshRes = await fetch('/api/programs');
      const progs = await refreshRes.json();
      setPrograms(progs);
      setActiveProgId(newProg.id);
    } catch (e) { console.error(e); }
  };

  const setActiveInDb = async () => {
    if (!currentProg || currentProg.is_active) return;
    if (!window.confirm("Setting this program as Active will start your new 1/2-week cycle from TODAY. Are you sure?")) return;
    
    try {
      await fetch(`/api/programs?id=${currentProg.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true })
      });
      setPrograms(prev => prev.map(p => ({ ...p, is_active: p.id === currentProg.id })));
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="p-6 text-center text-zinc-500">Loading...</div>;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 pb-24">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-zinc-400" />
            Routines
          </h1>
          <button onClick={syncProgramToDb} disabled={saving} className="bg-zinc-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row max-w-6xl mx-auto w-full p-4 gap-6">
        
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-1 w-full sm:max-w-xs">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Select Program</label>
              <select value={activeProgId || ''} onChange={(e) => setActiveProgId(Number(e.target.value))} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-2 text-sm font-semibold outline-none">
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.title} {p.is_active ? '(Active)' : ''}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={createNewProgram} className="flex items-center gap-1 bg-zinc-100 hover:bg-zinc-200 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-700 transition-colors"><Plus className="w-4 h-4"/> New</button>
              {currentProg && !currentProg.is_active && (
                <button onClick={setActiveInDb} className="flex items-center gap-1 bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg text-xs font-bold transition-colors">Set as Active</button>
              )}
            </div>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="grid gap-4 lg:grid-cols-2">
              {currentProg?.days.map((day: any) => (
                <DayCard
                  key={day.day_index}
                  dayIndex={day.day_index}
                  day={day}
                  onUpdateProgram={handleUpdateProgramDay}
                  onSaveAsTemplate={saveAsTemplate}
                />
              ))}
            </div>
            
            {/* Sidebar / Template Library */}
            <div className="border border-zinc-200 rounded-2xl bg-zinc-100 p-4 mt-8">
              <h3 className="font-bold text-zinc-800 mb-1">Template Library</h3>
              <p className="text-xs text-zinc-500 mb-4">Drag these onto any day to instantly apply the routine.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {templates.map(tpl => (
                  <DraggableTemplateBlock key={tpl.id} template={tpl} />
                ))}
                {templates.length === 0 && (
                  <p className="text-sm text-zinc-400 p-4 text-center border-2 border-dashed border-zinc-200 rounded-xl col-span-full">No templates saved. Use the copy button on a day above to save one!</p>
                )}
              </div>
            </div>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
