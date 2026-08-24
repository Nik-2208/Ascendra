"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Wallet as WalletIcon, TrendingUp, TrendingDown, Plus, Minus,
  DollarSign, PiggyBank, Search, Download, Trash2, Undo2, 
  Calendar, FileText, AlertTriangle, PlusCircle, Tag,
  CreditCard, Target, Edit3, PieChart as PieChartIcon, Activity, Check, ArrowRightLeft
} from "lucide-react";
import { 
  getFinanceDataAction, 
  addTransactionAction, 
  editTransactionAction, 
  deleteTransactionAction, 
  updateBudgetAction
} from "@/actions/finance-actions";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { soundEngine } from "@/lib/sound-engine";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from "recharts";

// Animated number helper
const AnimatedNumber = ({ value }: { value: number }) => {
  const spring = useSpring(0, { bounce: 0, duration: 1000 });
  const display = useTransform(spring, (current) => 
    "$" + current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span>{display}</motion.span>;
};

const COLORS = ['#10b981', '#f43f5e', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#a855f7', '#ec4899', '#f97316'];

export default function MoneyTrackerPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  const [activeSection, setActiveSection] = useState<"dashboard" | "transactions" | "budgets">("dashboard");
  
  // Forms & Modal State (No dropdown IDs!)
  const [showTxModal, setShowTxModal] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [txType, setTxType] = useState<"INCOME" | "EXPENSE" | "TRANSFER">("EXPENSE");
  const [amount, setAmount] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [walletName, setWalletName] = useState("");
  const [toWalletName, setToWalletName] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Budget Modal State
  const [editingBudgetCategoryName, setEditingBudgetCategoryName] = useState<string | null>(null);
  const [newBudgetAmount, setNewBudgetAmount] = useState("");
  const [showNewBudgetModal, setShowNewBudgetModal] = useState(false);
  const [newBudgetCategoryName, setNewBudgetCategoryName] = useState("");

  // Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterWallet, setFilterWallet] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");

  // Error/Toast State
  const [txError, setTxError] = useState("");
  const [budgetError, setBudgetError] = useState("");
  const [deletedTx, setDeletedTx] = useState<any | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);

  // Fetch Data
  const { data: financeData, isLoading } = useQuery({
    queryKey: ["personal-finance"],
    queryFn: () => getFinanceDataAction(userId!),
    enabled: !!userId,
  });

  const wallets = financeData?.wallets || [];
  const personalCategories = financeData?.personalCategories || [];
  const transactions = financeData?.transactions || [];
  const budgets = financeData?.budgets || [];

  // Mutations
  const addTxMutation = useMutation({
    mutationFn: (data: any) => addTransactionAction(userId!, data),
    onSuccess: (res) => {
      if (res.success) {
        soundEngine.playCoinSpend();
        setShowTxModal(false);
        resetTxForm();
        setTxError("");
        queryClient.invalidateQueries({ queryKey: ["personal-finance"] });
        import("@/lib/game-event-bus").then((m) => {
          m.dispatchGameEvent("SKILL_UNLOCKED", { userId: userId! }); // Trigger real-time store updates
        });
      } else {
        setTxError(res.error || "Failed to add transaction");
      }
    }
  });

  const editTxMutation = useMutation({
    mutationFn: (data: any) => editTransactionAction(userId!, editingTxId!, data),
    onSuccess: (res) => {
      if (res.success) {
        setShowTxModal(false);
        resetTxForm();
        setTxError("");
        queryClient.invalidateQueries({ queryKey: ["personal-finance"] });
        import("@/lib/game-event-bus").then((m) => {
          m.dispatchGameEvent("SKILL_UNLOCKED", { userId: userId! });
        });
      } else {
        setTxError(res.error || "Failed to edit transaction");
      }
    }
  });

  const deleteTxMutation = useMutation({
    mutationFn: (id: string) => deleteTransactionAction(userId!, id),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ["personal-finance"] });
        import("@/lib/game-event-bus").then((m) => {
          m.dispatchGameEvent("SKILL_UNLOCKED", { userId: userId! });
        });
      }
    }
  });

  const updateBudgetMutation = useMutation({
    mutationFn: (data: { categoryName: string; amount: number; month: number; year: number }) => 
      updateBudgetAction(userId!, data.categoryName, data.amount, data.month, data.year),
    onSuccess: (res) => {
      if (res.success) {
        setEditingBudgetCategoryName(null);
        setNewBudgetCategoryName("");
        setNewBudgetAmount("");
        setBudgetError("");
        setShowNewBudgetModal(false);
        queryClient.invalidateQueries({ queryKey: ["personal-finance"] });
        import("@/lib/game-event-bus").then((m) => {
          m.dispatchGameEvent("SKILL_UNLOCKED", { userId: userId! });
        });
      } else {
        setBudgetError(res.error || "Failed to save budget");
      }
    }
  });

  const resetTxForm = () => {
    setEditingTxId(null);
    setAmount("");
    setCategoryName("");
    setWalletName("");
    setToWalletName("");
    setNote("");
    setDate(new Date().toISOString().split("T")[0]);
  };

  const handleEditTx = (tx: any) => {
    setEditingTxId(tx.id);
    setTxType(tx.type as any);
    setAmount(tx.amount.toString());
    setCategoryName(tx.category?.name || "");
    setWalletName(tx.wallet?.name || "");
    setToWalletName(tx.toWallet?.name || "");
    setNote(tx.note || "");
    setDate(new Date(tx.date).toISOString().split("T")[0]);
    setShowTxModal(true);
  };

  // Calculations
  const calculated = useMemo(() => {
    let totalBalance = 0;
    let thisMonthIncome = 0;
    let thisMonthExpenses = 0;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);

    wallets.forEach((w: any) => {
      totalBalance += w.balance;
    });

    const categoryTotals: Record<string, number> = {};
    const trends: Record<string, { income: number; expense: number }> = {};

    transactions.forEach((tx: any) => {
      const txDate = new Date(tx.date);
      const isThisMonth = txDate >= startOfMonth;

      if (isThisMonth) {
        if (tx.type === "INCOME") {
          thisMonthIncome += tx.amount;
        } else if (tx.type === "EXPENSE") {
          thisMonthExpenses += tx.amount;
          const catName = tx.category?.name || "Uncategorized";
          categoryTotals[catName] = (categoryTotals[catName] || 0) + tx.amount;
        }
      }

      const dateStr = txDate.toISOString().split("T")[0];
      if (!trends[dateStr]) trends[dateStr] = { income: 0, expense: 0 };
      if (tx.type === "INCOME") trends[dateStr].income += tx.amount;
      else if (tx.type === "EXPENSE") trends[dateStr].expense += tx.amount;
    });

    const savingsRate = thisMonthIncome > 0
      ? Math.max(0, Math.min(100, ((thisMonthIncome - thisMonthExpenses) / thisMonthIncome) * 100))
      : 0;

    const trendData = Object.keys(trends).sort().slice(-14).map(d => ({
      date: new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      Income: trends[d].income,
      Expense: trends[d].expense
    }));

    const pieData = Object.keys(categoryTotals).map((key, idx) => ({
      name: key,
      value: categoryTotals[key],
      color: COLORS[idx % COLORS.length]
    })).sort((a,b) => b.value - a.value);

    return {
      totalBalance,
      thisMonthIncome,
      thisMonthExpenses,
      savingsRate,
      trendData,
      pieData
    };
  }, [wallets, transactions]);

  // Filtering transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx: any) => {
      const matchesSearch = tx.note?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            tx.category?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            tx.wallet?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = filterCategory === "ALL" || tx.categoryId === filterCategory;
      const matchesWallet = filterWallet === "ALL" || tx.walletId === filterWallet || tx.toWalletId === filterWallet;
      const matchesType = filterType === "ALL" || tx.type === filterType;

      return matchesSearch && matchesCategory && matchesWallet && matchesType;
    });
  }, [transactions, searchTerm, filterCategory, filterWallet, filterType]);

  // Budgets progress
  const budgetsWithSpent = useMemo(() => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);

    return budgets.map((b: any) => {
      const spent = transactions
        .filter(t => t.type === "EXPENSE" && t.categoryId === b.categoryId && new Date(t.date) >= startOfMonth)
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        categoryId: b.categoryId,
        categoryName: b.category?.name || "Uncategorized",
        limit: b.amount || 0,
        spent
      };
    });
  }, [budgets, transactions]);

  const handleExportCSV = () => {
    if (!filteredTransactions.length) return;
    const headers = "Date,Type,Category,Amount,Wallet,Note\n";
    const rows = filteredTransactions.map((tx: any) => 
      `"${new Date(tx.date).toLocaleDateString()}","${tx.type}","${tx.category?.name || "Uncategorized"}",${tx.amount},"${tx.wallet?.name || ""}${tx.toWallet ? " -> " + tx.toWallet.name : ""}","${tx.note || ""}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `money_tracker_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const handleDeleteTx = (tx: any) => {
    setDeletedTx(tx);
    setShowUndoToast(true);
    deleteTxMutation.mutate(tx.id);
    setTimeout(() => { setShowUndoToast(false); setDeletedTx(null); }, 5000);
  };

  const handleUndo = () => {
    if (deletedTx) {
      addTxMutation.mutate({
        amount: deletedTx.amount,
        type: deletedTx.type,
        categoryName: deletedTx.category?.name,
        note: deletedTx.note,
        date: deletedTx.date,
        walletName: deletedTx.wallet?.name,
        toWalletName: deletedTx.toWallet?.name
      });
      setShowUndoToast(false);
      setDeletedTx(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-4 animate-in fade-in">
        <div className="flex gap-4">
          <div className="h-12 bg-white/5 rounded-xl w-48 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map((i) => <div key={i} className="h-28 bg-white/5 rounded-2xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-white/5 rounded-2xl animate-pulse" />
          <div className="h-96 bg-white/5 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <PiggyBank className="text-emerald-400" size={32} /> Money Tracker
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Clean, dropdown-free expense tracker. Simply type wallet and category names.</p>
        </div>
        <div className="flex items-center gap-3 font-bold text-sm">
          <button
            onClick={() => { resetTxForm(); setTxType("EXPENSE"); setShowTxModal(true); }}
            className="flex-1 md:flex-none px-4 py-3 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 transition-all flex items-center justify-center gap-2 rounded-xl"
          >
            <Minus size={16} /> Expense
          </button>
          <button
            onClick={() => { resetTxForm(); setTxType("INCOME"); setShowTxModal(true); }}
            className="flex-1 md:flex-none px-4 py-3 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 transition-all flex items-center justify-center gap-2 rounded-xl"
          >
            <Plus size={16} /> Income
          </button>
          <button
            onClick={() => { resetTxForm(); setTxType("TRANSFER"); setShowTxModal(true); }}
            className="flex-1 md:flex-none px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 transition-all flex items-center justify-center gap-2 rounded-xl"
          >
            <ArrowRightLeft size={16} /> Transfer
          </button>
        </div>
      </header>

      {/* KPI Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: "Net Assets", value: calculated.totalBalance, icon: WalletIcon, color: "text-blue-400", bg: "bg-blue-500/5" },
          { title: "Income (Month)", value: calculated.thisMonthIncome, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/5" },
          { title: "Expenses (Month)", value: calculated.thisMonthExpenses, icon: TrendingDown, color: "text-red-400", bg: "bg-red-500/5" },
          { title: "Savings Rate", value: calculated.savingsRate, icon: Target, color: "text-purple-400", bg: "bg-purple-500/5", isPercent: true }
        ].map((card, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={card.title} 
            className="rpg-panel p-5 rounded-2xl relative overflow-hidden group border border-white/5"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 ${card.bg} rounded-full translate-x-12 -translate-y-12 transition-transform group-hover:scale-110`} />
            <div className="flex items-center gap-3 mb-2 text-muted-foreground">
              <card.icon size={16} className={card.color} />
              <span className="text-xs font-bold uppercase tracking-wider">{card.title}</span>
            </div>
            <p className={`text-3xl font-bold font-serif ${card.color}`}>
              {card.isPercent ? `${card.value.toFixed(1)}%` : <AnimatedNumber value={card.value} />}
            </p>
          </motion.div>
        ))}
      </section>

      {/* Navigation */}
      <nav className="flex border-b border-white/5 pb-px">
        {["dashboard", "transactions", "budgets"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSection(tab as any)}
            className={`px-6 py-4 text-sm font-bold uppercase tracking-widest transition-all relative ${
              activeSection === tab 
                ? "text-emerald-400 border-b-2 border-emerald-500" 
                : "text-muted-foreground hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* DASHBOARD */}
          {activeSection === "dashboard" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Trends Chart */}
              <div className="lg:col-span-2 rpg-panel p-6 rounded-2xl space-y-6">
                <h2 className="text-sm font-bold text-white uppercase tracking-widest font-serif flex items-center gap-2">
                  <Activity size={16} className="text-emerald-400" /> Spending Trends
                </h2>
                <div className="h-72 w-full">
                  {calculated.trendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={calculated.trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="date" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#000000dd', border: '1px solid #ffffff20', borderRadius: '8px' }}
                          itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                        />
                        <Line type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="Expense" stroke="#f43f5e" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                      <TrendingUp size={32} className="mb-2 opacity-20" />
                      <p className="text-sm">Not enough data to map trends.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Wallets & Categories */}
              <div className="space-y-6">
                {/* Wallet Balance Cards */}
                <div className="rpg-panel p-6 rounded-2xl space-y-4">
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest font-serif border-b border-white/10 pb-4 flex items-center gap-2">
                    <CreditCard size={16} className="text-purple-400" /> Wallet Balances
                  </h2>
                  <div className="space-y-3">
                    {wallets.map((w: any) => (
                      <div key={w.id} className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-xs font-bold text-white">{w.name}</span>
                        <span className={`font-serif font-bold ${w.balance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          ${w.balance.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pie Chart Category Breakdown */}
                <div className="rpg-panel p-6 rounded-2xl space-y-4">
                  <h2 className="text-sm font-bold text-white uppercase tracking-widest font-serif border-b border-white/10 pb-4 flex items-center gap-2">
                    <PieChartIcon size={16} className="text-blue-400" /> Category Breakdown
                  </h2>
                  <div className="h-48 w-full relative">
                    {calculated.pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={calculated.pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {calculated.pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            formatter={(val: any) => `$${Number(val || 0).toFixed(2)}`}
                            contentStyle={{ backgroundColor: '#000000dd', border: '1px solid #ffffff20', borderRadius: '8px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">No expenses recorded</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TRANSACTIONS */}
          {activeSection === "transactions" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    type="text"
                    placeholder="Search notes/categories..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-black/40 border border-white/10 rounded-lg py-2 px-4 text-xs text-white focus:outline-none focus:border-emerald-500">
                  <option value="ALL">All Categories</option>
                  {personalCategories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={filterWallet} onChange={(e) => setFilterWallet(e.target.value)} className="bg-black/40 border border-white/10 rounded-lg py-2 px-4 text-xs text-white focus:outline-none focus:border-emerald-500">
                  <option value="ALL">All Wallets</option>
                  {wallets.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-black/40 border border-white/10 rounded-lg py-2 px-4 text-xs text-white focus:outline-none focus:border-emerald-500">
                  <option value="ALL">All Types</option>
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                  <option value="TRANSFER">Transfer</option>
                </select>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground font-bold">{filteredTransactions.length} transaction(s) found</span>
                <button onClick={handleExportCSV} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-white transition-all flex items-center gap-1.5">
                  <Download size={14} /> Export CSV
                </button>
              </div>

              <div className="rpg-panel rounded-2xl overflow-hidden border border-white/10">
                {filteredTransactions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/5 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          <th className="p-4">Date</th>
                          <th className="p-4">Category</th>
                          <th className="p-4">Wallet</th>
                          <th className="p-4">Note</th>
                          <th className="p-4 text-right">Amount</th>
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs">
                        {filteredTransactions.map((tx: any) => (
                          <tr key={tx.id} className="hover:bg-white/5 transition-colors group">
                            <td className="p-4 text-muted-foreground font-mono">{new Date(tx.date).toLocaleDateString()}</td>
                            <td className="p-4">
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md font-bold text-[10px] bg-white/5 text-white/80">
                                <Tag size={10} /> {tx.category?.name || "Transfer"}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="inline-flex items-center gap-1.5 text-white/80">
                                <CreditCard size={12} /> {tx.wallet?.name} {tx.toWallet && `-> ${tx.toWallet.name}`}
                              </span>
                            </td>
                            <td className="p-4 text-white truncate max-w-[200px]">{tx.note || "-"}</td>
                            <td className={`p-4 text-right font-serif font-bold text-sm ${tx.type === "INCOME" ? "text-emerald-400" : tx.type === "EXPENSE" ? "text-red-400" : "text-blue-400"}`}>
                              {tx.type === "INCOME" ? "+" : tx.type === "EXPENSE" ? "-" : ""}${tx.amount.toFixed(2)}
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex justify-center items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEditTx(tx)} className="p-1.5 hover:bg-blue-500/20 hover:text-blue-400 rounded-lg text-muted-foreground transition-all">
                                  <Edit3 size={14} />
                                </button>
                                <button onClick={() => handleDeleteTx(tx)} className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-muted-foreground transition-all">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-12 flex flex-col items-center justify-center text-muted-foreground space-y-4">
                    <FileText size={48} className="opacity-20" />
                    <p className="text-sm">No transactions match filters.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* BUDGETS */}
          {activeSection === "budgets" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold font-serif text-white">Monthly Category Budgets</h2>
                <button onClick={() => setShowNewBudgetModal(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5">
                  <PlusCircle size={14} /> Add Budget Limit
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {budgetsWithSpent.map((b) => {
                  const percent = b.limit > 0 ? Math.min(100, (b.spent / b.limit) * 100) : 0;
                  return (
                    <div key={b.categoryId} className="rpg-panel p-5 rounded-2xl space-y-4 border border-white/5">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-white text-sm flex items-center gap-2"><Tag size={14} className="text-blue-400"/> {b.categoryName}</h3>
                          <p className="text-[10px] text-muted-foreground uppercase mt-1">Expense Limit</p>
                        </div>
                        <button onClick={() => { setEditingBudgetCategoryName(b.categoryName); setNewBudgetAmount(b.limit ? b.limit.toString() : ""); }} className="p-1.5 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-white transition-colors">
                          <Edit3 size={14} />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-white/80 font-mono">Spent: ${b.spent.toFixed(2)}</span>
                          <span className="text-muted-foreground font-mono">Limit: {b.limit > 0 ? `$${b.limit}` : "None"}</span>
                        </div>
                        {b.limit > 0 && (
                          <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }} 
                              animate={{ width: `${percent}%` }} 
                              transition={{ duration: 1, ease: "easeOut" }}
                              className={`h-full rounded-full ${percent >= 90 ? "bg-red-500" : percent >= 75 ? "bg-yellow-500" : "bg-emerald-500"}`} 
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Transaction Modal (Text Inputs!) */}
      <AnimatePresence>
        {showTxModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="rpg-panel p-6 rounded-2xl w-full max-w-lg space-y-6">
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  {editingTxId ? <Edit3 className="text-blue-400" /> : txType === "EXPENSE" ? <Minus className="text-red-400" /> : txType === "INCOME" ? <Plus className="text-emerald-400" /> : <ArrowRightLeft className="text-blue-400" />}
                  {editingTxId ? "Edit Transaction" : `Record ${txType}`}
                </h3>
                <button onClick={() => { setShowTxModal(false); resetTxForm(); }} className="text-muted-foreground hover:text-white text-sm">Close</button>
              </div>

              {txError && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg flex items-center gap-2"><AlertTriangle size={14} /> {txError}</div>}

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Amount</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input type="number" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white font-serif font-bold text-xl focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {txType !== "TRANSFER" ? (
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Category Name</label>
                      <input 
                        type="text" 
                        placeholder="Food, Shopping, Salary, Bills..." 
                        value={categoryName} 
                        onChange={(e) => setCategoryName(e.target.value)} 
                        className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500" 
                      />
                    </div>
                  ) : (
                    <div className="col-span-2 text-xs text-muted-foreground bg-white/5 p-3 rounded-lg flex items-center gap-2">
                      <ArrowRightLeft size={14} className="text-blue-400" /> Wallet Transfer (No category required)
                    </div>
                  )}

                  <div className={txType === "TRANSFER" ? "col-span-2" : ""}>
                    <label className="block text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">{txType === "TRANSFER" ? "Source Wallet Name" : "Wallet Name"}</label>
                    <input 
                      type="text" 
                      placeholder="Bank, Cash, UPI, Credit Card..." 
                      value={walletName} 
                      onChange={(e) => setWalletName(e.target.value)} 
                      className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500" 
                    />
                  </div>
                </div>

                {txType === "TRANSFER" && (
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Destination Wallet Name</label>
                    <input 
                      type="text" 
                      placeholder="Savings, Bank, Cash..." 
                      value={toWalletName} 
                      onChange={(e) => setToWalletName(e.target.value)} 
                      className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500" 
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Note / Description</label>
                  <input type="text" placeholder="Description..." value={note} onChange={(e) => setNote(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500" />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Date</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500" />
                </div>
              </div>

              <button
                onClick={() => {
                  const payload = { amount: parseFloat(amount), type: txType, categoryName: txType !== "TRANSFER" ? categoryName : undefined, note, date, walletName, toWalletName: txType === "TRANSFER" ? toWalletName : undefined };
                  editingTxId ? editTxMutation.mutate(payload) : addTxMutation.mutate(payload);
                }}
                disabled={addTxMutation.isPending || editTxMutation.isPending || !amount || !walletName || (txType !== "TRANSFER" && !categoryName)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-sm tracking-wider uppercase transition-all disabled:bg-white/10"
              >
                {addTxMutation.isPending || editTxMutation.isPending ? "Saving..." : "Confirm"}
              </button>
            </motion.div>
          </div>
        )}

        {/* Budget Setting Modal */}
        {editingBudgetCategoryName && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="rpg-panel p-6 rounded-2xl w-full max-w-sm space-y-6">
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <h3 className="font-bold text-white text-base">Set Budget Limit for {editingBudgetCategoryName}</h3>
                <button onClick={() => setEditingBudgetCategoryName(null)} className="text-muted-foreground hover:text-white text-sm">Close</button>
              </div>
              {budgetError && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg flex items-center gap-2"><AlertTriangle size={14} /> {budgetError}</div>}
              <div>
                <label className="block text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Monthly Target Amount</label>
                <input type="number" placeholder="E.g., 500" value={newBudgetAmount} onChange={(e) => setNewBudgetAmount(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <button onClick={() => updateBudgetMutation.mutate({ categoryName: editingBudgetCategoryName, amount: parseFloat(newBudgetAmount), month: new Date().getMonth() + 1, year: new Date().getFullYear() })} disabled={updateBudgetMutation.isPending || !newBudgetAmount} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all">Save Budget</button>
            </motion.div>
          </div>
        )}

        {/* New Budget Modal */}
        {showNewBudgetModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="rpg-panel p-6 rounded-2xl w-full max-w-sm space-y-6">
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <h3 className="font-bold text-white text-base">Add Category Budget</h3>
                <button onClick={() => setShowNewBudgetModal(false)} className="text-muted-foreground hover:text-white text-sm">Close</button>
              </div>
              {budgetError && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg flex items-center gap-2"><AlertTriangle size={14} /> {budgetError}</div>}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Category Name</label>
                  <input type="text" placeholder="E.g., Food, Travel, Streaming..." value={newBudgetCategoryName} onChange={(e) => setNewBudgetCategoryName(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 px-3 text-xs text-white focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Monthly Budget Amount</label>
                  <input type="number" placeholder="E.g., 200" value={newBudgetAmount} onChange={(e) => setNewBudgetAmount(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg py-2.5 px-3 text-xs text-white focus:outline-none" />
                </div>
              </div>
              <button onClick={() => updateBudgetMutation.mutate({ categoryName: newBudgetCategoryName, amount: parseFloat(newBudgetAmount), month: new Date().getMonth() + 1, year: new Date().getFullYear() })} disabled={updateBudgetMutation.isPending || !newBudgetCategoryName || !newBudgetAmount} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all">Save Budget</button>
            </motion.div>
          </div>
        )}

        {/* Undo Toast */}
        {showUndoToast && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed bottom-6 right-6 bg-black border border-white/10 p-4 rounded-xl shadow-2xl flex items-center gap-4 z-50">
            <span className="text-xs text-white">Transaction deleted.</span>
            <button onClick={handleUndo} className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"><Undo2 size={12} /> Undo</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
