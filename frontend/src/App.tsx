 
import React, { useState, useEffect, useCallback } from 'react';
import { useSDK } from '@tma.js/sdk-react';
import io from 'socket.io-client';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Gantt from 'frappe-gantt';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';

interface Task {
  id: string;
  title: string;
  description?: string;
  quadrant: number;
  assigneeName?: string;
  deadline?: string;
}

const quadrants = [
  { title: 'Срочно и важно', color: '#ff5555' },
  { title: 'Не срочно, но важно', color: '#ffff55' },
  { title: 'Срочно, но не важно', color: '#55ff55' },
  { title: 'Ни срочно, ни важно', color: '#5555ff' },
];

const TaskCard: React.FC<{ task: Task; chatId: string }> = ({ task, chatId }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'task',
    item: task,
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
  }));

  return (
    <div
      ref={drag}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="bg-white bg-opacity-10 p-3 rounded-lg mb-3 cursor-move text-white"
    >
      <h4 className="font-bold">{task.title}</h4>
      {task.description && <p className="text-sm opacity-80">{task.description}</p>}
      {task.assigneeName && <p className="text-xs">👤 {task.assigneeName}</p>}
      {task.deadline && <p className="text-xs">📅 {new Date(task.deadline).toLocaleDateString('ru')}</p>}
    </div>
  );
};

export default function App() {
  const { initData } = useSDK();
  const user = initData?.user;
  const chatId = initData?.chat?.id?.toString() || user?.id.toString() || 'private';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<'matrix' | 'gantt' | 'calendar'>('matrix');
  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000');
    setSocket(newSocket);

    newSocket.emit('join-project', chatId);

    newSocket.on('task-created', (task: Task) => setTasks(prev => [...prev, task]));
    newSocket.on('task-moved', (task: Task) => setTasks(prev => prev.map(t => t.id === task.id ? task : t)));
    newSocket.on('task-updated', (task: Task) => setTasks(prev => prev.map(t => t.id === task.id ? task : t)));
    newSocket.on('task-deleted', (id: string) => setTasks(prev => prev.filter(t => t.id !== id)));

    fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'}/project/${chatId}`)
      .then(r => r.json())
      .then(data => setTasks(data.tasks || []));

    return () => newSocket.close();
  }, [chatId]);

  const [, drop] = useDrop(() => ({
    accept: 'task',
    drop: (item: Task) => {
      if (item.quadrant !== quadrants.indexOf(quadrants.find((_, i) => i === quadrants.findIndex(q => q.title === quadrants[item.quadrant].title))!)) {
        socket.emit('task-move', { taskId: item.id, quadrant: quadrants.findIndex((_, i) => i === quadrants.findIndex(q => q.title === quadrants[item.quadrant].title)), chatId });
      }
    },
  }));

  const addTask = () => {
    const title = prompt('Название задачи');
    if (!title) return;
    const quadrant = parseInt(prompt('Квадрант (0-3)', '0') || '0');
    socket.emit('task-create', {
      title,
      description: prompt('Описание (необязательно)'),
      quadrant,
      assigneeName: user?.firstName,
      deadline: prompt('Дедлайн (YYYY-MM-DD)') || undefined,
      chatId,
    });
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-4">
        <h1 className="text-3xl font-bold mb-4">Таска</h1>
        <div className="flex gap-2 mb-4">
          <button onClick={() => setView('matrix')} className={`px-4 py-2 rounded ${view === 'matrix' ? 'bg-blue-600' : 'bg-gray-600'}`}>Матрица</button>
          <button onClick={() => setView('gantt')} className={`px-4 py-2 rounded ${view === 'gantt' ? 'bg-blue-600' : 'bg-gray-600'}`}>Гант</button>
          <button onClick={() => setView('calendar')} className={`px-4 py-2 rounded ${view === 'calendar' ? 'bg-blue-600' : 'bg-gray-600'}`}>Календарь</button>
        </div>

        {view === 'matrix' && (
          <div className="grid grid-cols-2 gap-4">
            {quadrants.map((q, i) => (
              <div key={i} ref={drop} className="bg-gray-900 rounded-xl p-4 min-h-96" style={{ borderTop: `8px solid ${q.color}` }}>
                <h2 className="text-xl font-bold mb-4">{q.title}</h2>
                {tasks.filter(t => t.quadrant === i).map(task => (
                  <TaskCard key={task.id} task={task} chatId={chatId} />
                ))}
              </div>
            ))}
          </div>
        )}

        {view === 'gantt' && tasks.length > 0 && (
          <div className="bg-white text-black p-4 rounded">
            {/* @ts-ignore */}
            <Gantt tasks={tasks.map(t => ({
              id: t.id,
              name: t.title,
              start: t.deadline || new Date().toISOString().split('T')[0],
              end: t.deadline || new Date(Date.now() + 86400000).toISOString().split('T')[0],
              progress: 0,
            }))} viewMode="Day" />
          </div>
        )}

        {view === 'calendar' && (
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin]}
            initialView="dayGridMonth"
            events={tasks.filter(t => t.deadline).map(t => ({
              title: t.title,
              date: t.deadline?.split('T')[0],
            }))}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek',
            }}
          />
        )}

        <button
          onClick={addTask}
          className="fixed bottom-6 right-6 bg-green-500 text-white w-16 h-16 rounded-full text-4xl shadow-lg"
        >
          +
        </button>
      </div>
    </DndProvider>
  );
}