import { useState, useEffect } from 'react';
import { ListTodo, Plus, Trash2, Save, Pencil, X, GripVertical, Repeat } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
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

interface Circuit {
  type: 'circuit';
  rounds: number;
  exercises: { name: string; reps: number }[];
}

type ProgramItem = Exercise | Circuit;

function isCircuit(item: ProgramItem): item is Circuit {
  return (item as Circuit).type === 'circuit';
}

function SortableExerciseRow({
  id, item, index, onUpdate, onRemove
}: {
  key?: string | number; id: string; item: Exercise; index: number;
  onUpdate: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : 'auto' as any };

  const cat = item.category || 'strength';

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1.5 bg-zinc-50 p-2 rounded-lg border border-zinc-100 flex-wrap">
      <button {...attributes} {...listeners} className="touch-none p-1 text-zinc-300 hover:text-zinc-500 cursor-grab active:cursor-grabbing shrink-0">
        <GripVertical className="w-4 h-4" />
      </button>
      <input
        type="text" value={item.name} onChange={(e) => onUpdate(index, 'name', e.target.value)}
        placeholder="Exercise" className="flex-1 bg-transparent text-sm font-medium outline-none min-w-0 min-w-[100px]"
      />
      <select
        value={cat} onChange={(e) => onUpdate(index, 'category', e.target.value)}
        className="text-[10px] bg-zinc-200 text-zinc-600 outline-none p-1 rounded font-medium uppercase"
      >
        <option value="strength">Strength</option>
        <option value="bodyweight">Bodywt</option>
        <option value="run">Run</option>
        <option value="sprint">Sprint</option>
        <option value="interval">Interval</option>
        <option value="timed">Timed</option>
      </select>
      <div className="flex items-center gap-1 text-sm text-zinc-500 shrink-0 select-none">
        {(cat === 'strength' || cat === 'bodyweight') && (
          <><input type="number" value={item.sets || 3} onChange={(e) => onUpdate(index, 'sets', parseInt(e.target.value) || 0)} className="w-6 text-center bg-transparent outline-none" />×<input type="number" value={item.reps || 10} onChange={(e) => onUpdate(index, 'reps', parseInt(e.target.value) || 0)} className="w-8 text-center bg-transparent outline-none" /></>
        )}
        {cat === 'run' && (
          <><input type="number" value={item.distance || 0} onChange={(e) => onUpdate(index, 'distance', parseFloat(e.target.value) || 0)} placeholder="mi" className="w-8 text-center bg-transparent outline-none placeholder:text-zinc-300" />mi <input type="number" value={item.duration || 0} onChange={(e) => onUpdate(index, 'duration', parseInt(e.target.value) || 0)} placeholder="m" className="w-8 text-center bg-transparent outline-none placeholder:text-zinc-300 ml-1" />min</>
        )}
        {(cat === 'sprint' || cat === 'interval') && (
          <><input type="number" value={item.sets || 4} onChange={(e) => onUpdate(index, 'sets', parseInt(e.target.value) || 0)} className="w-6 text-center bg-transparent outline-none" />×<input type="number" value={item.distance || 0} onChange={(e) => onUpdate(index, 'distance', parseFloat(e.target.value) || 0)} placeholder="dist" className="w-8 text-center bg-transparent outline-none ml-1 placeholder:text-zinc-300" /></>
        )}
        {cat === 'timed' && (
          <><input type="number" value={item.sets || 3} onChange={(e) => onUpdate(index, 'sets', parseInt(e.target.value) || 0)} className="w-6 text-center bg-transparent outline-none" />×<input type="number" value={item.duration || 60} onChange={(e) => onUpdate(index, 'duration', parseInt(e.target.value) || 0)} placeholder="s" className="w-8 text-center bg-transparent outline-none ml-1 placeholder:text-zinc-300" />s</>
        )}
      </div>
      <button onClick={() => onRemove(index)} className="p-1 text-zinc-400 hover:text-red-500 shrink-0">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// Sortable circuit block
function SortableCircuitBlock({
  id,
  item,
  index,
  onUpdate,
  onRemove,
}: {
  key?: string | number;
  id: string;
  item: Circuit;
  index: number;
  onUpdate: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto' as any,
  };

  const updateCircuitExercise = (exIdx: number, field: string, val: any) => {
    const newExercises = [...item.exercises];
    newExercises[exIdx] = { ...newExercises[exIdx], [field]: val };
    onUpdate(index, 'exercises', newExercises);
  };

  const addCircuitExercise = () => {
    onUpdate(index, 'exercises', [...item.exercises, { name: '', reps: 10 }]);
  };

  const removeCircuitExercise = (exIdx: number) => {
    const newExercises = [...item.exercises];
    newExercises.splice(exIdx, 1);
    onUpdate(index, 'exercises', newExercises);
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/30 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <button {...attributes} {...listeners} className="touch-none p-1 text-zinc-300 hover:text-zinc-500 cursor-grab active:cursor-grabbing shrink-0">
          <GripVertical className="w-4 h-4" />
        </button>
        <Repeat className="w-4 h-4 text-blue-500 shrink-0" />
        <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Circuit</span>
        <div className="flex items-center gap-1 ml-auto text-xs text-blue-600">
          <span>×</span>
          <input
            type="number"
            value={item.rounds}
            onChange={(e) => onUpdate(index, 'rounds', parseInt(e.target.value) || 1)}
            className="w-8 text-center bg-white/60 border border-blue-200 rounded outline-none"
          />
          <span>rounds</span>
        </div>
        <button onClick={() => onRemove(index)} className="p-1 text-zinc-400 hover:text-red-500 shrink-0">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {item.exercises.map((ex, exIdx) => (
        <div key={exIdx} className="flex items-center gap-2 bg-white/60 p-2 rounded border border-blue-100 ml-6">
          <input
            type="text"
            value={ex.name}
            onChange={(e) => updateCircuitExercise(exIdx, 'name', e.target.value)}
            placeholder="Exercise"
            className="flex-1 bg-transparent text-sm font-medium outline-none min-w-0"
          />
          <div className="flex items-center gap-1 text-sm text-zinc-500 shrink-0">
            <span>×</span>
            <input
              type="number"
              value={ex.reps}
              onChange={(e) => updateCircuitExercise(exIdx, 'reps', parseInt(e.target.value) || 0)}
              className="w-8 text-center bg-transparent outline-none"
            />
          </div>
          <button onClick={() => removeCircuitExercise(exIdx)} className="p-1 text-zinc-400 hover:text-red-500 shrink-0">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}
      <button
        onClick={addCircuitExercise}
        className="ml-6 flex items-center gap-1 text-xs font-medium text-blue-500 hover:text-blue-700 transition-colors"
      >
        <Plus className="w-3 h-3" /> Add to circuit
      </button>
    </div>
  );
}

// Day card component
function DayCard({
  day,
  saving,
  onSave,
  onUpdateProgram,
}: {
  key?: string | number;
  day: any;
  saving: boolean;
  onSave: (day: any) => void;
  onUpdateProgram: (weekday: number, updates: any) => void;
}) {
  const [editing, setEditing] = useState(false);
  const exercises: ProgramItem[] = day.exercises || [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Generate stable IDs for sortable
  const itemIds = exercises.map((_: any, i: number) => `item-${i}`);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = itemIds.indexOf(active.id as string);
      const newIndex = itemIds.indexOf(over.id as string);
      const newExercises = arrayMove([...exercises], oldIndex, newIndex);
      onUpdateProgram(day.weekday, { exercises: newExercises });
    }
  };

  const updateExercise = (index: number, field: string, value: any) => {
    const newExercises = [...exercises];
    newExercises[index] = { ...newExercises[index], [field]: value };
    onUpdateProgram(day.weekday, { exercises: newExercises });
  };

  const removeExercise = (index: number) => {
    const newExercises = [...exercises];
    newExercises.splice(index, 1);
    onUpdateProgram(day.weekday, { exercises: newExercises });
  };

  const addExercise = () => {
    onUpdateProgram(day.weekday, {
      exercises: [...exercises, { name: '', sets: 3, reps: 10 }],
    });
  };

  const addCircuit = () => {
    onUpdateProgram(day.weekday, {
      exercises: [...exercises, { type: 'circuit', rounds: 3, exercises: [{ name: '', reps: 10 }] }],
    });
  };

  const handleSave = () => {
    onSave(day);
    setEditing(false);
  };

  // Read-only view
  if (!editing) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-zinc-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold text-zinc-900">{WEEKDAYS[day.weekday]}</h2>
            <p className="text-xs font-medium text-zinc-500">{day.title || 'Rest'}</p>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 bg-zinc-100 px-2.5 py-1.5 rounded-full transition-colors"
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
        </div>
        {exercises.length > 0 && (
          <div className="space-y-1.5">
            {exercises.map((item: ProgramItem, i: number) => (
              <div key={i}>
                {isCircuit(item) ? (
                  <div className="rounded-lg border border-blue-100 bg-blue-50/30 p-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Repeat className="w-3 h-3 text-blue-500" />
                      <span className="text-[10px] font-bold text-blue-600 uppercase">Circuit × {item.rounds}</span>
                    </div>
                    {item.exercises.map((ex, j) => (
                      <p key={j} className="text-sm text-zinc-600 ml-5">{ex.name || '—'} <span className="text-zinc-400">× {ex.reps}</span></p>
                    ))}
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

  // Edit mode
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-zinc-900 space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
        <h2 className="font-bold text-zinc-900 w-24">{WEEKDAYS[day.weekday]}</h2>
        <input
          type="text"
          value={day.title}
          onChange={(e) => onUpdateProgram(day.weekday, { title: e.target.value })}
          placeholder="e.g., Upper Body, Rest"
          className="flex-1 bg-transparent text-sm text-right font-medium text-zinc-600 outline-none placeholder:text-zinc-300"
        />
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {exercises.map((item: ProgramItem, i: number) =>
              isCircuit(item) ? (
                <SortableCircuitBlock
                  key={itemIds[i]}
                  id={itemIds[i]}
                  item={item}
                  index={i}
                  onUpdate={updateExercise}
                  onRemove={removeExercise}
                />
              ) : (
                <SortableExerciseRow
                  key={itemIds[i]}
                  id={itemIds[i]}
                  item={item}
                  index={i}
                  onUpdate={updateExercise}
                  onRemove={removeExercise}
                />
              )
            )}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={addExercise}
          className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <Plus className="w-3 h-3" /> Exercise
        </button>
        <button
          onClick={addCircuit}
          className="flex items-center gap-1 text-xs font-medium text-blue-500 hover:text-blue-700 transition-colors"
        >
          <Repeat className="w-3 h-3" /> Circuit
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setEditing(false)}
            className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 px-3 py-1.5 transition-colors"
          >
            <X className="w-3 h-3" /> Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 text-xs font-medium bg-zinc-900 text-white px-3 py-1.5 rounded-full hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <Save className="w-3 h-3" /> Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProgramPage() {
  const [program, setProgram] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchProgram() {
      try {
        const res = await fetch('/api/program');
        const data = await res.json();
        const parsed = data.map((d: any) => ({
          ...d,
          exercises: JSON.parse(d.exercises || '[]'),
        }));
        setProgram(parsed);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchProgram();
  }, []);

  const handleSave = async (day: any) => {
    setSaving(true);
    try {
      await fetch(`/api/program?weekday=${day.weekday}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: day.title,
          exercises: day.exercises,
        }),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const updateProgram = (weekday: number, updates: any) => {
    setProgram((prev) =>
      prev.map((d) => (d.weekday === weekday ? { ...d, ...updates } : d))
    );
  };

  if (loading) return <div className="p-6 text-center text-zinc-500">Loading...</div>;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 pb-24">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-4 py-3">
        <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-zinc-400" />
          Weekly Program
        </h1>
      </header>

      <div className="flex-1 p-4 space-y-4">
        {program.map((day) => (
          <DayCard
            key={day.weekday}
            day={day}
            saving={saving}
            onSave={handleSave}
            onUpdateProgram={updateProgram}
          />
        ))}
      </div>
    </div>
  );
}
