import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Bot, CheckCircle2, LogOut, Plus, Search, Trash2, Wallet, X } from 'lucide-react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AssistantDrawer,
  RegisteredExpensePayload,
} from './components/AssistantDrawer';
import { AuthView } from './components/AuthView';
import { BudgetProgressGauge } from './components/BudgetProgressGauge';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { ChartMode, DailyExpensesChart } from './components/DailyExpensesChart';
import { FormulaCard } from './components/FormulaCard';
import { MonthlySummary } from './components/MonthlySummary';
import { MovementDetailView } from './components/MovementDetailView';
import { MovementsView } from './components/MovementsView';
import { OnboardingBudgetModal } from './components/OnboardingBudgetModal';
import { RecentMovements } from './components/RecentMovements';
import { RegisterExpenseView } from './components/RegisterExpenseView';
import { RegisterIncomeView } from './components/RegisterIncomeView';
import {
  BUDGET_META,
  buildDailyExpenses,
  ExpenseMovement,
  formatCOP,
  parseSpanishDate,
  ScreenView,
} from './data/budgetData';
import {
  auth,
  BLUEPRINT_LIMITS,
  db,
  handleFirestoreError,
  OperationType,
} from './firebase';

type ThemeMode = 'light' | 'dark';
const THEME_STORAGE_KEY = 'mi-presupuesto-theme';

function getInitialTheme(): ThemeMode {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function buildMovementCreatePayload(movement: ExpenseMovement, uid: string) {
  const payload: Record<string, unknown> = {
    id: movement.id.slice(0, BLUEPRINT_LIMITS.idMax),
    ownerId: uid,
    type: movement.type,
    day: Math.min(31, Math.max(1, Math.round(movement.day))),
    dateISO: movement.dateISO,
    dateLabel:
      movement.dateLabel.slice(0, BLUEPRINT_LIMITS.dateLabelMax) || movement.dateISO,
    fullDateLabel:
      movement.fullDateLabel.slice(0, BLUEPRINT_LIMITS.fullDateLabelMax) ||
      movement.dateISO,
    weekdayShort:
      movement.weekdayShort.slice(0, BLUEPRINT_LIMITS.weekdayShortMax) || 'Día',
    timeLabel: /^\d{2}:\d{2}$/.test(movement.timeLabel) ? movement.timeLabel : '12:00',
    description:
      movement.description.trim().slice(0, BLUEPRINT_LIMITS.descriptionMax) ||
      'Movimiento',
    category:
      String(movement.category).trim().slice(0, BLUEPRINT_LIMITS.categoryMax) || 'Otro',
    amount: Math.min(
      BLUEPRINT_LIMITS.maxAmount,
      Math.max(1, Math.round(movement.amount))
    ),
    notes: movement.notes.trim().slice(0, BLUEPRINT_LIMITS.notesMax),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (movement.paymentMethod) {
    payload.paymentMethod = String(movement.paymentMethod).slice(
      0,
      BLUEPRINT_LIMITS.paymentMethodMax
    );
  }

  return payload;
}

function buildMovementUpdatePayload(movement: ExpenseMovement) {
  const payload: Record<string, unknown> = {
    day: Math.min(31, Math.max(1, Math.round(movement.day))),
    dateISO: movement.dateISO,
    dateLabel:
      movement.dateLabel.slice(0, BLUEPRINT_LIMITS.dateLabelMax) || movement.dateISO,
    fullDateLabel:
      movement.fullDateLabel.slice(0, BLUEPRINT_LIMITS.fullDateLabelMax) ||
      movement.dateISO,
    weekdayShort:
      movement.weekdayShort.slice(0, BLUEPRINT_LIMITS.weekdayShortMax) || 'Día',
    timeLabel: /^\d{2}:\d{2}$/.test(movement.timeLabel) ? movement.timeLabel : '12:00',
    description:
      movement.description.trim().slice(0, BLUEPRINT_LIMITS.descriptionMax) ||
      'Movimiento',
    category:
      String(movement.category).trim().slice(0, BLUEPRINT_LIMITS.categoryMax) || 'Otro',
    amount: Math.min(
      BLUEPRINT_LIMITS.maxAmount,
      Math.max(1, Math.round(movement.amount))
    ),
    notes: movement.notes.trim().slice(0, BLUEPRINT_LIMITS.notesMax),
    updatedAt: serverTimestamp(),
  };

  if (movement.paymentMethod) {
    payload.paymentMethod = String(movement.paymentMethod).slice(
      0,
      BLUEPRINT_LIMITS.paymentMethodMax
    );
  }

  return payload;
}

export default function App() {
  const { monthLabel, totalDaysInMonth, currentDay, todayISO } = BUDGET_META;

  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [hasConfiguredBudget, setHasConfiguredBudget] = useState(false);
  const [isSavingInitialBudget, setIsSavingInitialBudget] = useState(false);
  const [fatalFirestoreError, setFatalFirestoreError] = useState<Error | null>(null);

  const [baseMonthlyBudget, setBaseMonthlyBudget] = useState<number>(0);
  const [movements, setMovements] = useState<ExpenseMovement[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [screen, setScreen] = useState<ScreenView>('dashboard');
  const [previousScreen, setPreviousScreen] = useState<'dashboard' | 'movements'>('dashboard');
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null);
  const [editingMovementId, setEditingMovementId] = useState<string | null>(null);
  const [editReturnScreen, setEditReturnScreen] = useState<
    'dashboard' | 'movements' | 'detail'
  >('dashboard');
  const [deleteCandidate, setDeleteCandidate] = useState<ExpenseMovement | null>(null);
  const [chartMode, setChartMode] = useState<ChartMode>('daily');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastNotice, setLastNotice] = useState<{
    action: 'created' | 'updated' | 'deleted';
    movement: ExpenseMovement;
  } | null>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [userName, setUserName] = useState<string>('Usuario');

  const creatingProfileUidRef = useRef<string | null>(null);
  const pendingRegisterNameRef = useRef<string>('');

  if (fatalFirestoreError) {
    throw fatalFirestoreError;
  }

  const reportFirestoreError = (
    err: unknown,
    operation: OperationType,
    path: string | null
  ) => {
    try {
      handleFirestoreError(err, operation, path);
    } catch (wrapped) {
      setFatalFirestoreError(
        wrapped instanceof Error ? wrapped : new Error(String(wrapped))
      );
    }
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage access errors in restricted contexts
    }
  }, [theme]);

  // Auth listener — resets account-scoped state cleanly whenever account changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);

      // Reset account-specific state on any auth transition so accounts never see another user's data
      setProfileReady(false);
      setHasConfiguredBudget(false);
      setBaseMonthlyBudget(0);
      setMovements([]);
      setSelectedMovementId(null);
      setEditingMovementId(null);
      setDeleteCandidate(null);
      setLastNotice(null);
      setStorageError(null);
      setSearchQuery('');
      setScreen('dashboard');
      setIsAssistantOpen(false);
      creatingProfileUidRef.current = null;

      if (user) {
        const fallbackName =
          user.displayName?.trim() ||
          user.email?.split('@')[0]?.trim() ||
          'Usuario';
        setUserName(fallbackName.slice(0, BLUEPRINT_LIMITS.displayNameMax));
      } else {
        setUserName('Usuario');
      }
    });

    return () => unsubscribe();
  }, []);

  // User profile subscription (creates initial zero-state profile on first sign-in)
  useEffect(() => {
    if (!authReady || !currentUser) return;

    const uid = currentUser.uid;
    const userPath = `users/${uid}`;
    const userRef = doc(db, 'users', uid);

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          if (creatingProfileUidRef.current !== uid) {
            creatingProfileUidRef.current = uid;
            const fallbackName =
              pendingRegisterNameRef.current.trim() ||
              currentUser.displayName?.trim() ||
              currentUser.email?.split('@')[0]?.trim() ||
              'Usuario';
            pendingRegisterNameRef.current = '';
            void setDoc(userRef, {
              uid,
              displayName: fallbackName.slice(0, BLUEPRINT_LIMITS.displayNameMax),
              email: (currentUser.email || '').slice(0, BLUEPRINT_LIMITS.emailMax),
              baseMonthlyBudget: 0,
              hasConfiguredBudget: false,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }).catch((err) => {
              creatingProfileUidRef.current = null;
              reportFirestoreError(err, OperationType.CREATE, userPath);
            });
          }
          return;
        }

        const data = snapshot.data();
        const budget =
          typeof data.baseMonthlyBudget === 'number' &&
          Number.isFinite(data.baseMonthlyBudget)
            ? data.baseMonthlyBudget
            : 0;
        const configured = Boolean(data.hasConfiguredBudget);
        const storedName =
          typeof data.displayName === 'string' && data.displayName.trim().length > 0
            ? data.displayName.trim()
            : currentUser.displayName?.trim() ||
              currentUser.email?.split('@')[0]?.trim() ||
              'Usuario';

        setBaseMonthlyBudget(budget);
        setHasConfiguredBudget(configured);
        setUserName(storedName);
        setProfileReady(true);
      },
      (err) => {
        reportFirestoreError(err, OperationType.GET, userPath);
      }
    );

    return () => unsubscribe();
  }, [authReady, currentUser]);

  // Movements subscription scoped strictly to currentUser.uid
  useEffect(() => {
    if (!authReady || !currentUser || !profileReady) return;

    const uid = currentUser.uid;
    const movementsPath = `users/${uid}/movements`;
    const q = query(collection(db, 'users', uid, 'movements'), where('ownerId', '==', uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: ExpenseMovement[] = [];
        for (const docSnap of snapshot.docs) {
          const d = docSnap.data();
          if (
            typeof d.id === 'string' &&
            (d.type === 'expense' || d.type === 'income') &&
            typeof d.day === 'number' &&
            typeof d.dateISO === 'string' &&
            typeof d.dateLabel === 'string' &&
            typeof d.fullDateLabel === 'string' &&
            typeof d.weekdayShort === 'string' &&
            typeof d.timeLabel === 'string' &&
            typeof d.description === 'string' &&
            typeof d.category === 'string' &&
            typeof d.amount === 'number' &&
            typeof d.notes === 'string'
          ) {
            loaded.push({
              id: d.id,
              type: d.type,
              day: d.day,
              dateISO: d.dateISO,
              dateLabel: d.dateLabel,
              fullDateLabel: d.fullDateLabel,
              weekdayShort: d.weekdayShort,
              timeLabel: d.timeLabel,
              description: d.description,
              category: d.category as ExpenseMovement['category'],
              paymentMethod:
                typeof d.paymentMethod === 'string'
                  ? (d.paymentMethod as ExpenseMovement['paymentMethod'])
                  : undefined,
              amount: d.amount,
              notes: d.notes,
            });
          }
        }
        setMovements(loaded);
      },
      (err) => {
        reportFirestoreError(err, OperationType.LIST, movementsPath);
      }
    );

    return () => unsubscribe();
  }, [authReady, currentUser, profileReady]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const getDynamicTodayISO = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}` || todayISO;
  };

  const sortedMovements = useMemo(() => {
    return [...movements].sort((a, b) => {
      if (b.dateISO !== a.dateISO) {
        return b.dateISO.localeCompare(a.dateISO);
      }
      return b.timeLabel.localeCompare(a.timeLabel);
    });
  }, [movements]);

  const hasExpenses = useMemo(
    () => sortedMovements.some((m) => m.type === 'expense'),
    [sortedMovements]
  );

  const dailyExpenses = useMemo(
    () => buildDailyExpenses(sortedMovements, currentDay),
    [sortedMovements, currentDay]
  );

  const { totalSpent, totalIncome, effectiveBudget, availableBalance, averageDaily } =
    useMemo(() => {
      let spent = 0;
      let income = 0;
      for (const item of sortedMovements) {
        if (item.type === 'income') {
          income += item.amount;
        } else {
          spent += item.amount;
        }
      }
      const totalBudget = baseMonthlyBudget + income;
      const avg =
        hasExpenses && dailyExpenses.length > 0 ? spent / dailyExpenses.length : 0;
      return {
        totalSpent: spent,
        totalIncome: income,
        effectiveBudget: totalBudget,
        availableBalance: totalBudget - spent,
        averageDaily: avg,
      };
    }, [sortedMovements, dailyExpenses.length, baseMonthlyBudget, hasExpenses]);

  const selectedMovement = useMemo(() => {
    if (!selectedMovementId) return null;
    return sortedMovements.find((m) => m.id === selectedMovementId) ?? null;
  }, [selectedMovementId, sortedMovements]);

  const editingMovement = useMemo(() => {
    if (!editingMovementId) return null;
    return sortedMovements.find((m) => m.id === editingMovementId) ?? null;
  }, [editingMovementId, sortedMovements]);

  const selectedCategoryTotal = useMemo(() => {
    if (!selectedMovement) return 0;
    return sortedMovements
      .filter(
        (m) =>
          m.type === selectedMovement.type && m.category === selectedMovement.category
      )
      .reduce((sum, m) => sum + m.amount, 0);
  }, [selectedMovement, sortedMovements]);

  const handleOpenDetail = (
    movementId: string | null,
    from: 'dashboard' | 'movements'
  ) => {
    setPreviousScreen(from);
    setSelectedMovementId(movementId);
    setScreen('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (nextScreen: ScreenView) => {
    if (nextScreen === 'detail' && !hasExpenses) {
      setSelectedMovementId(null);
    }
    if (nextScreen !== 'edit') {
      setEditingMovementId(null);
    }
    setScreen(nextScreen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveInitialBudget = async (amount: number) => {
    if (!currentUser) return;
    const userPath = `users/${currentUser.uid}`;
    const safeAmount = Math.min(BLUEPRINT_LIMITS.maxAmount, Math.max(0, Math.round(amount)));
    setIsSavingInitialBudget(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        baseMonthlyBudget: safeAmount,
        hasConfiguredBudget: true,
        updatedAt: serverTimestamp(),
      });
      setBaseMonthlyBudget(safeAmount);
      setHasConfiguredBudget(true);
    } catch (err) {
      reportFirestoreError(err, OperationType.UPDATE, userPath);
    } finally {
      setIsSavingInitialBudget(false);
    }
  };

  const handleUpdateBaseBudget = async (newBudget: number) => {
    if (!currentUser) return;
    const userPath = `users/${currentUser.uid}`;
    const safeAmount = Math.min(
      BLUEPRINT_LIMITS.maxAmount,
      Math.max(0, Math.round(newBudget))
    );
    setBaseMonthlyBudget(safeAmount);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        baseMonthlyBudget: safeAmount,
        hasConfiguredBudget: true,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      reportFirestoreError(err, OperationType.UPDATE, userPath);
    }
  };

  const handleUpdateUserName = async (nextName: string) => {
    const cleaned = nextName.trim().slice(0, BLUEPRINT_LIMITS.displayNameMax);
    if (!cleaned || !currentUser) return;
    setUserName(cleaned);
    const userPath = `users/${currentUser.uid}`;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        displayName: cleaned,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      reportFirestoreError(err, OperationType.UPDATE, userPath);
    }
  };

  const handleSaveMovement = async (newMovement: ExpenseMovement) => {
    if (!currentUser) return;
    const uid = currentUser.uid;
    const movementPath = `users/${uid}/movements/${newMovement.id}`;
    try {
      await setDoc(
        doc(db, 'users', uid, 'movements', newMovement.id),
        buildMovementCreatePayload(newMovement, uid)
      );
      setLastNotice({ action: 'created', movement: newMovement });
      setSearchQuery('');
      setScreen('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      reportFirestoreError(err, OperationType.CREATE, movementPath);
    }
  };

  const handleStartEditMovement = (
    movement: ExpenseMovement,
    from: 'dashboard' | 'movements' | 'detail'
  ) => {
    setEditingMovementId(movement.id);
    setEditReturnScreen(from);
    if (from === 'detail') {
      setSelectedMovementId(movement.id);
    }
    setScreen('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveEditedMovement = async (updatedMovement: ExpenseMovement) => {
    if (!currentUser) return;
    const exists = movements.some((m) => m.id === updatedMovement.id);
    if (!exists) {
      setStorageError('No se encontró el gasto seleccionado para actualizar.');
      return;
    }

    const uid = currentUser.uid;
    const movementPath = `users/${uid}/movements/${updatedMovement.id}`;
    try {
      await updateDoc(
        doc(db, 'users', uid, 'movements', updatedMovement.id),
        buildMovementUpdatePayload(updatedMovement)
      );
      setLastNotice({ action: 'updated', movement: updatedMovement });
      setEditingMovementId(null);
      setScreen(editReturnScreen);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      reportFirestoreError(err, OperationType.UPDATE, movementPath);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate || !currentUser) return;
    const target = deleteCandidate;
    const uid = currentUser.uid;
    const movementPath = `users/${uid}/movements/${target.id}`;
    try {
      await deleteDoc(doc(db, 'users', uid, 'movements', target.id));
      if (selectedMovementId === target.id) {
        setSelectedMovementId(null);
      }
      if (editingMovementId === target.id) {
        setEditingMovementId(null);
      }
      setLastNotice({ action: 'deleted', movement: target });
      setDeleteCandidate(null);
      if (screen === 'detail' || screen === 'edit') {
        setScreen(previousScreen);
      }
    } catch (err) {
      reportFirestoreError(err, OperationType.DELETE, movementPath);
    }
  };

  const handleAssistantRegisterExpense = async (payload: RegisteredExpensePayload) => {
    if (!currentUser) return;
    const effectiveDateISO = payload.date || getDynamicTodayISO();
    const parsedDate = parseSpanishDate(effectiveDateISO);
    const now = new Date();
    const timeLabel = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const newMovement: ExpenseMovement = {
      id: `mov-ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'expense',
      day: parsedDate.day,
      dateISO: effectiveDateISO,
      dateLabel: parsedDate.dateLabel,
      fullDateLabel: parsedDate.fullDateLabel,
      weekdayShort: parsedDate.weekdayShort,
      timeLabel,
      description: payload.description,
      category: payload.category,
      amount: payload.amount,
      notes: `Registrado con asistente inteligente por ${userName} el ${parsedDate.dateLabel}.`,
    };

    const uid = currentUser.uid;
    const movementPath = `users/${uid}/movements/${newMovement.id}`;
    try {
      await setDoc(
        doc(db, 'users', uid, 'movements', newMovement.id),
        buildMovementCreatePayload(newMovement, uid)
      );
      setLastNotice({ action: 'created', movement: newMovement });
    } catch (err) {
      reportFirestoreError(err, OperationType.CREATE, movementPath);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch {
      setStorageError('No se pudo cerrar la sesión. Intenta nuevamente.');
    }
  };

  const isAuthenticatedWorkspace =
    authReady && Boolean(currentUser) && profileReady && hasConfiguredBudget;

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#ECEEF1] dark:bg-[#090D14] p-2 sm:p-4 lg:p-5 text-slate-900 dark:text-slate-100 transition-colors">
        <div className="max-w-[1280px] mx-auto bg-white/85 dark:bg-slate-900/90 backdrop-blur-xs rounded-[28px] border border-white dark:border-slate-800 p-3 sm:p-5 flex flex-col gap-4 sm:gap-5 transition-colors">
          {/* Top Bar */}
          <header className="bg-[#F7F8F9] dark:bg-[#111827] rounded-[20px] border border-slate-200/70 dark:border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-4 transition-colors">
            <button
              type="button"
              onClick={() => isAuthenticatedWorkspace && handleNavigate('dashboard')}
              className="flex items-center gap-2.5 cursor-pointer text-left rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              <div
                className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0F5132] to-[#1E945B] flex items-center justify-center text-white shrink-0"
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.1"
                >
                  <circle cx="12" cy="12" r="8" />
                  <path
                    d="M12 7v10M9.5 9.8c0-1 1.1-1.8 2.5-1.8s2.5.7 2.5 1.7c0 2-5 1.4-5 3.6 0 1 1.1 1.7 2.5 1.7s2.5-.8 2.5-1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <span className="font-[family-name:var(--font-display)] text-base sm:text-[17px] font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
                Mi Presupuesto
              </span>
            </button>

            {isAuthenticatedWorkspace && (
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search
                  className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar movimiento o categoría..."
                  aria-label="Buscar movimiento o categoría"
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-700 rounded-full pl-9 pr-9 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#146C43]/30 dark:focus:ring-emerald-500/30 focus:border-[#146C43] dark:focus:border-emerald-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Limpiar búsqueda"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <p className="hidden lg:block text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 tabular-nums whitespace-nowrap">
                {monthLabel}{' '}
                <span className="mx-1.5 text-slate-300 dark:text-slate-600" aria-hidden="true">
                  ·
                </span>{' '}
                COP
              </p>

              <button
                type="button"
                onClick={toggleTheme}
                aria-pressed={theme === 'dark'}
                aria-label={
                  theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
                }
                title={theme === 'dark' ? 'Modo oscuro' : 'Modo claro'}
                className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-base leading-none shadow-2xs transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5]"
              >
                <span aria-hidden="true">{theme === 'dark' ? '🌙' : '☀️'}</span>
              </button>

              {isAuthenticatedWorkspace && (
                <button
                  type="button"
                  onClick={() => setIsAssistantOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#5B3DF5] hover:bg-[#492CE0] text-white text-xs sm:text-sm font-medium shadow-2xs hover:shadow-md transition-all cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5]"
                >
                  <Bot className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                  <span>Asistente</span>
                </button>
              )}

              {currentUser && (
                <div className="flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-slate-700">
                  <span
                    className="hidden sm:inline-block max-w-[130px] truncate text-xs font-medium text-slate-700 dark:text-slate-300"
                    title={currentUser.email || userName}
                  >
                    {userName}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    title="Cerrar sesión"
                    aria-label="Cerrar sesión"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">Salir</span>
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Main Screen Container */}
          <main className="bg-[#F7F8F9] dark:bg-[#111827] rounded-[24px] border border-slate-200/70 dark:border-slate-800 p-4 sm:p-6 space-y-5 transition-colors">
            {!authReady ? (
              <div className="py-20 text-center space-y-3" role="status" aria-live="polite">
                <div className="w-8 h-8 border-2 border-[#5B3DF5] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Verificando sesión...
                </p>
              </div>
            ) : !currentUser ? (
              <AuthView
                onRegisterDisplayName={(n) => {
                  pendingRegisterNameRef.current = n;
                }}
              />
            ) : !profileReady ? (
              <div className="py-20 text-center space-y-3" role="status" aria-live="polite">
                <div className="w-8 h-8 border-2 border-[#146C43] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Cargando información de tu cuenta...
                </p>
              </div>
            ) : !hasConfiguredBudget ? (
              <OnboardingBudgetModal
                userName={userName}
                isSaving={isSavingInitialBudget}
                onSaveInitialBudget={(amount) => void handleSaveInitialBudget(amount)}
              />
            ) : (
              <>
                {storageError && (
                  <div
                    role="alert"
                    className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/70 text-sm text-rose-950 dark:text-rose-100"
                  >
                    <p>{storageError}</p>
                    <button
                      type="button"
                      onClick={() => setStorageError(null)}
                      aria-label="Cerrar aviso de error"
                      className="text-rose-700 dark:text-rose-400 hover:text-rose-950 dark:hover:text-rose-200 cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Global inline confirmation after creating, editing or deleting a movement */}
                {lastNotice && (
                  <div
                    role="status"
                    className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-sm ${
                      lastNotice.action === 'deleted'
                        ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/70 text-rose-950 dark:text-rose-100'
                        : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {lastNotice.action === 'deleted' ? (
                        <Trash2
                          className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0"
                          aria-hidden="true"
                        />
                      ) : (
                        <CheckCircle2
                          className="w-4 h-4 text-[#146C43] dark:text-emerald-400 shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      <p className="truncate">
                        {lastNotice.action === 'deleted'
                          ? lastNotice.movement.type === 'income'
                            ? 'Ingreso eliminado:'
                            : 'Gasto eliminado:'
                          : lastNotice.action === 'updated'
                          ? '✅ Gasto actualizado correctamente:'
                          : lastNotice.movement.type === 'income'
                          ? '✅ Ingreso registrado correctamente:'
                          : 'Gasto guardado:'}{' '}
                        <strong className="font-semibold">
                          {lastNotice.movement.description}
                        </strong>{' '}
                        <span
                          className={
                            lastNotice.action === 'deleted'
                              ? 'text-rose-700 dark:text-rose-400'
                              : 'text-emerald-700 dark:text-emerald-400'
                          }
                          aria-hidden="true"
                        >
                          ·
                        </span>{' '}
                        <span className="font-semibold tabular-nums">
                          {lastNotice.movement.type === 'income'
                            ? `+${formatCOP(lastNotice.movement.amount)}`
                            : formatCOP(lastNotice.movement.amount)}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLastNotice(null)}
                      aria-label="Cerrar confirmación"
                      className={`cursor-pointer shrink-0 ${
                        lastNotice.action === 'deleted'
                          ? 'text-rose-700 dark:text-rose-400 hover:text-rose-950 dark:hover:text-rose-200'
                          : 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-emerald-200'
                      }`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {screen === 'dashboard' && (
                    <motion.div
                      key="screen-dashboard"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-5"
                    >
                      {/* Title Row — Clean Hierarchy */}
                      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                        <div>
                          <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-[30px] font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
                            Mi Presupuesto Mensual
                          </h1>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Controla tus ingresos y gastos del mes para visualizar tu saldo disponible al instante.
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleNavigate('movements')}
                            className="px-4 py-2 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                          >
                            Movimientos
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenDetail(
                                hasExpenses ? sortedMovements[0].id : null,
                                'dashboard'
                              )
                            }
                            className="px-4 py-2 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                          >
                            Detalle
                          </button>
                        </div>
                      </div>

                      {/* Row 1: KPI Cards (Always visible inside the main dashboard) */}
                      <MonthlySummary
                        monthLabel={monthLabel}
                        currentDay={currentDay}
                        totalDaysInMonth={totalDaysInMonth}
                        baseMonthlyBudget={baseMonthlyBudget}
                        totalIncome={totalIncome}
                        effectiveBudget={effectiveBudget}
                        totalSpent={totalSpent}
                        availableBalance={availableBalance}
                        averageDaily={averageDaily}
                        onUpdateBaseBudget={(val) => void handleUpdateBaseBudget(val)}
                        onNavigateScreen={handleNavigate}
                      />

                      {/* Quick Actions Block — Centered below KPI cards */}
                      <section
                        aria-labelledby="acciones-rapidas-heading"
                        className="pt-2 pb-2 flex justify-center"
                      >
                        <div className="w-full sm:w-auto bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[22px] px-5 py-4 sm:px-7 sm:py-5 shadow-2xs flex flex-col items-center gap-3">
                          <h2
                            id="acciones-rapidas-heading"
                            className="font-[family-name:var(--font-display)] text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400"
                          >
                            Acciones rápidas
                          </h2>

                          <div className="w-full sm:w-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => handleNavigate('register-income')}
                              className="w-full sm:w-[228px] h-11 px-5 rounded-full bg-[#146C43] hover:bg-[#0F5132] shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition-all duration-150 whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                            >
                              <Plus
                                className="w-4 h-4 shrink-0"
                                strokeWidth={2.2}
                                aria-hidden="true"
                              />
                              <span>Registrar ingreso</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleNavigate('register')}
                              className="w-full sm:w-[228px] h-11 px-5 rounded-full bg-[#5B3DF5] hover:bg-[#492CE0] shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition-all duration-150 whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5]"
                            >
                              <Plus
                                className="w-4 h-4 shrink-0"
                                strokeWidth={2.2}
                                aria-hidden="true"
                              />
                              <span>Registrar gasto</span>
                            </button>
                          </div>
                        </div>
                      </section>

                      {!hasExpenses ? (
                        /* Empty Dashboard State rendered cleanly inside the main Dashboard */
                        <section
                          aria-labelledby="dashboard-vacio-heading"
                          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[22px] px-6 py-12 sm:py-16 text-center flex flex-col items-center"
                        >
                          <div
                            className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#146C43] dark:text-emerald-400 flex items-center justify-center mb-4"
                            aria-hidden="true"
                          >
                            <Wallet className="w-6 h-6" strokeWidth={1.8} />
                          </div>
                          <h2
                            id="dashboard-vacio-heading"
                            className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
                          >
                            Aún no hay gastos este mes
                          </h2>
                          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md">
                            Registra el primero y empieza a ver en qué se va la plata
                          </p>
                          <button
                            type="button"
                            onClick={() => handleNavigate('register')}
                            className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#5B3DF5] hover:bg-[#492CE0] text-white text-sm font-semibold shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5]"
                          >
                            <Plus className="w-4 h-4" strokeWidth={2.2} aria-hidden="true" />
                            <span>Registrar tu primer gasto</span>
                          </button>
                        </section>
                      ) : (
                        <>
                          {/* Row 2: Analytics Capsule Chart + 5 Recent Movements */}
                          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
                            <div className="xl:col-span-7">
                              <DailyExpensesChart
                                dailyExpenses={dailyExpenses}
                                totalDaysInMonth={totalDaysInMonth}
                                monthlyBudget={effectiveBudget}
                                mode={chartMode}
                                onModeChange={setChartMode}
                              />
                            </div>

                            <div className="xl:col-span-5">
                              <RecentMovements
                                movements={sortedMovements}
                                searchQuery={searchQuery}
                                onClearSearch={() => setSearchQuery('')}
                                onSelectMovement={(id) =>
                                  handleOpenDetail(id, 'dashboard')
                                }
                                onEditMovement={(movement) =>
                                  handleStartEditMovement(movement, 'dashboard')
                                }
                                onDeleteMovement={(movement) =>
                                  setDeleteCandidate(movement)
                                }
                                onViewAllMovements={() => handleNavigate('movements')}
                              />
                            </div>
                          </div>

                          {/* Row 3: Category Breakdown + Semicircular Budget Gauge + Formula Card */}
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 items-stretch">
                            <div className="md:col-span-2 xl:col-span-5">
                              <CategoryBreakdown
                                movements={sortedMovements}
                                totalSpent={totalSpent}
                                searchQuery={searchQuery}
                              />
                            </div>

                            <div className="xl:col-span-4">
                              <BudgetProgressGauge
                                monthlyBudget={effectiveBudget}
                                totalSpent={totalSpent}
                                availableBalance={availableBalance}
                              />
                            </div>

                            <div className="xl:col-span-3">
                              <FormulaCard
                                baseMonthlyBudget={baseMonthlyBudget}
                                totalIncome={totalIncome}
                                totalSpent={totalSpent}
                                availableBalance={availableBalance}
                                remainingDays={totalDaysInMonth - currentDay}
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}

                  {screen === 'movements' && (
                    <motion.div
                      key="screen-movements"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <MovementsView
                        movements={sortedMovements}
                        hasExpenses={hasExpenses}
                        monthLabel={monthLabel}
                        searchQuery={searchQuery}
                        onClearSearch={() => setSearchQuery('')}
                        onSelectMovement={(id) => handleOpenDetail(id, 'movements')}
                        onEditMovement={(movement) =>
                          handleStartEditMovement(movement, 'movements')
                        }
                        onDeleteMovement={(movement) => setDeleteCandidate(movement)}
                        onOpenRegister={() => handleNavigate('register')}
                        onOpenRegisterIncome={() => handleNavigate('register-income')}
                        onBackToDashboard={() => handleNavigate('dashboard')}
                      />
                    </motion.div>
                  )}

                  {screen === 'detail' && (
                    <motion.div
                      key="screen-detail"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <MovementDetailView
                        movement={selectedMovement}
                        monthlyBudget={effectiveBudget}
                        categoryTotal={selectedCategoryTotal}
                        onBack={() => handleNavigate(previousScreen)}
                        onEdit={(movement) => handleStartEditMovement(movement, 'detail')}
                        onDelete={(movement) => setDeleteCandidate(movement)}
                      />
                    </motion.div>
                  )}

                  {screen === 'register' && (
                    <motion.div
                      key="screen-register-expense"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <RegisterExpenseView
                        availableBalance={availableBalance}
                        onSaveExpense={(m) => void handleSaveMovement(m)}
                        onCancel={() => handleNavigate('dashboard')}
                      />
                    </motion.div>
                  )}

                  {screen === 'edit' && editingMovement && (
                    <motion.div
                      key={`screen-edit-${editingMovement.id}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <RegisterExpenseView
                        availableBalance={availableBalance}
                        initialMovement={editingMovement}
                        backLabel={
                          editReturnScreen === 'detail'
                            ? 'Volver al detalle'
                            : editReturnScreen === 'movements'
                            ? 'Volver a Movimientos'
                            : 'Volver al Dashboard'
                        }
                        onSaveExpense={(m) => void handleSaveEditedMovement(m)}
                        onCancel={() => handleNavigate(editReturnScreen)}
                      />
                    </motion.div>
                  )}

                  {screen === 'register-income' && (
                    <motion.div
                      key="screen-register-income"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <RegisterIncomeView
                        availableBalance={availableBalance}
                        onSaveIncome={(m) => void handleSaveMovement(m)}
                        onCancel={() => handleNavigate('dashboard')}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </main>
        </div>

        {/* Integrated AI Assistant Drawer (keyed per user UID so each account starts fresh) */}
        {isAuthenticatedWorkspace && currentUser && (
          <AssistantDrawer
            key={currentUser.uid}
            isOpen={isAssistantOpen}
            onClose={() => setIsAssistantOpen(false)}
            userName={userName}
            onUpdateUserName={(name) => void handleUpdateUserName(name)}
            budgetContext={{
              monthlyBudget: effectiveBudget,
              totalSpent,
              availableBalance,
              totalIncome,
              todayISO: getDynamicTodayISO(),
            }}
            onRegisterExpense={(payload) => void handleAssistantRegisterExpense(payload)}
          />
        )}

        {/* Delete Confirmation Dialog (never window.confirm) */}
        <AnimatePresence>
          {deleteCandidate && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-dialog-title"
              aria-describedby="delete-dialog-desc"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDeleteCandidate(null)}
                className="fixed inset-0 bg-slate-900/35 dark:bg-black/60 backdrop-blur-[2px]"
                aria-hidden="true"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0"
                    aria-hidden="true"
                  >
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2
                      id="delete-dialog-title"
                      className="font-[family-name:var(--font-display)] text-lg font-bold text-slate-900 dark:text-slate-100"
                    >
                      {deleteCandidate.type === 'income'
                        ? '¿Eliminar este ingreso?'
                        : '¿Eliminar este gasto?'}
                    </h2>
                    <p
                      id="delete-dialog-desc"
                      className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed"
                    >
                      Se borrará{' '}
                      <strong className="font-semibold text-slate-900 dark:text-slate-100">
                        {deleteCandidate.description}
                      </strong>{' '}
                      ({formatCOP(deleteCandidate.amount)}) y se recalculará tu saldo
                      disponible al instante.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDeleteCandidate(null)}
                    className="px-4 py-2.5 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleConfirmDelete()}
                    className="px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Sí, eliminar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
