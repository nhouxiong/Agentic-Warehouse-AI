import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const usePipelineStore = create(
  persist(
    (set, get) => ({
      acceptedDock: [],
      acceptedTask: [],
      rejectedDock: [],
      rejectedTask: [],
      feedbackLog: [],
      undoStack: [],
      selectedAppointment: null,

      acceptDock: (idx) => {
        const action = { type: 'accept_dock', idx, ts: Date.now() };
        set((s) => ({
          acceptedDock: [...s.acceptedDock, idx],
          rejectedDock: s.rejectedDock.filter(i => i !== idx),
          undoStack: [...s.undoStack, action],
        }));
      },
      rejectDock: (idx, reason) => {
        const action = { type: 'reject_dock', idx, reason, ts: Date.now() };
        set((s) => ({
          rejectedDock: [...s.rejectedDock, idx],
          acceptedDock: s.acceptedDock.filter(i => i !== idx),
          feedbackLog: [...s.feedbackLog, { idx, reason, ts: Date.now(), entity: 'dock' }],
          undoStack: [...s.undoStack, action],
        }));
      },
      acceptTask: (idx) => {
        const action = { type: 'accept_task', idx, ts: Date.now() };
        set((s) => ({
          acceptedTask: [...s.acceptedTask, idx],
          rejectedTask: s.rejectedTask.filter(i => i !== idx),
          undoStack: [...s.undoStack, action],
        }));
      },
      rejectTask: (idx, reason) => {
        const action = { type: 'reject_task', idx, reason, ts: Date.now() };
        set((s) => ({
          rejectedTask: [...s.rejectedTask, idx],
          acceptedTask: s.acceptedTask.filter(i => i !== idx),
          feedbackLog: [...s.feedbackLog, { idx, reason, ts: Date.now(), entity: 'task' }],
          undoStack: [...s.undoStack, action],
        }));
      },
      acceptAllDock: (count) => set({ acceptedDock: Array.from({ length: count }, (_, i) => i), rejectedDock: [] }),
      acceptAllTask: (count) => set({ acceptedTask: Array.from({ length: count }, (_, i) => i), rejectedTask: [] }),

      undo: () => {
        const stack = get().undoStack;
        if (!stack.length) return;
        const last = stack[stack.length - 1];
        const UNDO_WINDOW = 5 * 60 * 1000;
        if (Date.now() - last.ts > UNDO_WINDOW) return;
        set((s) => {
          const newStack = s.undoStack.slice(0, -1);
          if (last.type === 'accept_dock') return { acceptedDock: s.acceptedDock.filter(i => i !== last.idx), undoStack: newStack };
          if (last.type === 'reject_dock') return { rejectedDock: s.rejectedDock.filter(i => i !== last.idx), undoStack: newStack };
          if (last.type === 'accept_task') return { acceptedTask: s.acceptedTask.filter(i => i !== last.idx), undoStack: newStack };
          if (last.type === 'reject_task') return { rejectedTask: s.rejectedTask.filter(i => i !== last.idx), undoStack: newStack };
          return { undoStack: newStack };
        });
      },
      canUndo: () => {
        const stack = get().undoStack;
        if (!stack.length) return false;
        return Date.now() - stack[stack.length - 1].ts < 5 * 60 * 1000;
      },

      setSelectedAppointment: (id) => set({ selectedAppointment: id }),
      resetAll: () => set({ acceptedDock: [], acceptedTask: [], rejectedDock: [], rejectedTask: [], undoStack: [], selectedAppointment: null }),
    }),
    { name: 'dockops-pipeline' }
  )
);
