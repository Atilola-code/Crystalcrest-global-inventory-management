// src/app/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import { showInfo } from "./utils/toast";
import ToggleStatsCard from "./components/shared/ToggleStatsCard";
import { 
  DollarSign, 
  Package, 
  Clock, 
  Wallet, 
  RefreshCw,
  CreditCard,
  Building,
} from "lucide-react";
import { useSales, useProducts, useDeposits, useCredits, useExpenseStatistics, useCashAtBank } from "@/hooks/useSalesQueries";
import { useQueryClient } from "@tanstack/react-query";

interface DashboardStats {
  totalSales: number;
  totalStockValue: number;
  totalInventoryValue: number;
  outstandingPayments: number;
  cashAtBank: number;
  totalProducts: number;
  totalItemsInStock: number;
}

export default function DashboardPage() {
  const [query, setQuery] = useState("");
  const queryClient = useQueryClient();
  const { data: cashAtBankData } = useCashAtBank();
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboardRefreshInterval');
      return saved ? parseInt(saved) : 600000;
    }
    return 600000;
  });

  // ─── React Query hooks ──────────────────────────────────────────────
  const { data: salesData = [], isLoading: salesLoading, refetch: refetchSales } = useSales();
  const { data: inventoryData = [], isLoading: invLoading, refetch: refetchInv } = useProducts();
  const { data: depositsData = [], isLoading: depLoading, refetch: refetchDep } = useDeposits();
  const { data: creditsData = [] } = useCredits();
  const { data: expenseStats } = useExpenseStatistics();
    

  const totalExpenses = expenseStats?.total_expenses || 0;
  const loading = salesLoading || invLoading || depLoading;

  // Save refresh interval
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboardRefreshInterval', refreshInterval.toString());
    }
  }, [refreshInterval]);

  // Manual refresh
  const handleManualRefresh = async () => {
    await Promise.all([refetchSales(), refetchInv(), refetchDep()]);
    queryClient.invalidateQueries({ queryKey: ['credits'] });
    queryClient.invalidateQueries({ queryKey: ['expenses', 'statistics'] });
    setLastUpdated(new Date());
    showInfo("Dashboard updated");
  };

  // Listen for global refresh events
  useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries();
      setLastUpdated(new Date());
    };
    window.addEventListener('dashboardRefresh', handler);
    return () => window.removeEventListener('dashboardRefresh', handler);
  }, [queryClient]);

  useEffect(() => {
    const id = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['deposits'] });
      queryClient.invalidateQueries({ queryKey: ['credits'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', 'statistics'] });
      setLastUpdated(new Date());
    }, refreshInterval);
    return () => clearInterval(id);
  }, [refreshInterval, queryClient]);

  const stats = useMemo<DashboardStats>(() => {

    return {
      totalSales: salesData.reduce(
        (sum, s) => sum + (parseFloat(String(s.total_amount)) || 0),
        0
      ),
      totalStockValue: inventoryData.reduce(
        (sum, p) =>
          sum +
          (parseFloat(String(p.cost_price)) || 0) *
            (parseFloat(String(p.quantity)) || 0),
        0
      ),
      totalInventoryValue: inventoryData.reduce(
        (sum, p) =>
          sum +
          (parseFloat(String(p.selling_price)) || 0) *
            (parseFloat(String(p.quantity)) || 0),
        0
      ),
      outstandingPayments: creditsData.reduce((sum, c) => {
        if (c.status === "pending" || c.status === "partially_paid") {
          return sum + (parseFloat(String(c.outstanding_amount)) || 0);
        }
        return sum;
      }, 0),
      cashAtBank: cashAtBankData?.balance ?? 0,
      totalProducts: inventoryData.length,
      totalItemsInStock: inventoryData.reduce(
        (sum, p) => sum + (parseFloat(String(p.quantity)) || 0),
        0
      ),
    };
  }, [salesData, inventoryData, depositsData, creditsData, totalExpenses, cashAtBankData]);

  // Formatting
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-NG", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatNumber = (num: number) =>
    new Intl.NumberFormat("en-US").format(num);

  const formatDateTime = (date: Date) =>
    new Intl.DateTimeFormat("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);

  const formatIntervalDisplay = (intervalMs: number) => {
    const minutes = intervalMs / 60000;
    if (minutes === 60) return "1 hour";
    if (minutes === 10) return "10 minutes";
    if (minutes === 20) return "20 minutes";
    if (minutes === 30) return "30 minutes";
    return `${minutes} minutes`;
  };




  // Cache warming on app start
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const warmUpCache = async () => {
        const endpoints = [
          '/api/sales/?limit=10',
          '/api/inventory/?limit=20',
          '/api/purchase-orders/statistics/',
          '/api/expenses/statistics/'
        ];
        
        endpoints.forEach(endpoint => {
          fetch(endpoint).catch(() => {});
        });
      };
      
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(warmUpCache);
      } else {
        setTimeout(warmUpCache, 2000);
      }
    }
  }, []);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="lg:ml-64">
          <Topbar query={query} setQuery={setQuery} />
          
          <main className="pt-16 lg:pt-20">
            {/* Fixed Header Section */}
            <div className="fixed top-16 lg:top-20 left-0 lg:left-64 right-0 z-30 bg-gray-50 shadow-sm border-b border-gray-200">
              <div className="p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3 md:gap-0">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Dashboard Overview</h1>
                    <p className="text-gray-600 mt-1 text-sm md:text-base">Real-time inventory and sales data</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-4 w-full md:w-auto">
                    <button
                      onClick={handleManualRefresh}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm md:text-base w-full sm:w-auto"
                      disabled={loading}
                    >
                      <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                      {loading ? "Refreshing..." : "Refresh Data"}
                    </button>
                    <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
                      <Clock size={14} />
                      <span>Last updated: <span className="hidden sm:inline">{formatDateTime(lastUpdated)}</span><span className="sm:hidden">{lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></span>
                    </div>
                  </div>
                </div>

                {/* Stats Cards */}
                {loading ? (
                  <div className="text-center py-8 bg-white rounded-xl shadow-sm">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600">Loading dashboard...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <ToggleStatsCard
                      title="Total Sales"
                      value={stats.totalSales}
                      subtitle="All time sales"
                      icon={<DollarSign className="text-blue-600" size={20} />}
                      color="text-gray-900"
                      bgColor="bg-blue-100"
                      isCurrency={true}
                      responsive={true}
                    />

                    <ToggleStatsCard
                      title="Total Stock Value (Cost)"
                      value={stats.totalStockValue}
                      subtitle={`${formatNumber(stats.totalItemsInStock)} items in stock`}
                      icon={<Package className="text-purple-600" size={20} />}
                      color="text-gray-900"
                      bgColor="bg-purple-100"
                      isCurrency={true}
                      responsive={true}
                    />

                    <ToggleStatsCard
                      title="Total Products"
                      value={stats.totalProducts}
                      subtitle={`${formatNumber(stats.totalItemsInStock)} total units`}
                      icon={<Package className="text-orange-600" size={20} />}
                      color="text-gray-900"
                      bgColor="bg-orange-100"
                      responsive={true}
                    />

                    <ToggleStatsCard
                      title="Total Inventory Value"
                      value={stats.totalInventoryValue}
                      subtitle="Selling price value"
                      icon={<Wallet className="text-green-600" size={20} />}
                      color="text-gray-900"
                      bgColor="bg-green-100"
                      isCurrency={true}
                      responsive={true}
                    />

                    <ToggleStatsCard
                      title="Outstanding Payments"
                      value={stats.outstandingPayments}
                      subtitle="credit sales"
                      icon={<CreditCard className="text-yellow-600" size={20} />}
                      color="text-gray-900"
                      bgColor="bg-yellow-100"
                      isCurrency={true}
                      responsive={true}
                    />

                    {/* Cash at Bank now properly deducts expenses */}
                    <ToggleStatsCard
                      title="Cash at Bank"
                      value={stats.cashAtBank}
                      subtitle={`Deposits, Digital, Expenses and PO (${formatCurrency(totalExpenses)})`}
                      icon={<Building className="text-indigo-600" size={20} />}
                      color="text-gray-900"
                      bgColor="bg-indigo-100"
                      isCurrency={true}
                      responsive={true}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="mt-[380px] md:mt-[400px] lg:mt-[480px] p-4 md:p-6 overflow-y-auto" style={{ 
              height: 'calc(100vh - 380px)',
              maxHeight: 'calc(100vh - 380px)' 
            }}>
              {/* Auto-Update Status Card */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500 animate-pulse"></div>
                    <p className="text-xs md:text-sm text-blue-800">
                      Dashboard updates every {formatIntervalDisplay(refreshInterval).toLowerCase()}
                    </p>
                  </div>
                  <select 
                    value={refreshInterval / 60000}
                    onChange={(e) => setRefreshInterval(parseInt(e.target.value) * 60000)}
                    className="text-xs md:text-sm border border-blue-300 rounded px-2 py-1 md:px-3 md:py-1 bg-white text-blue-700"
                  >
                    <option value="10">10 minutes</option>
                    <option value="20">20 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                  </select>
                </div>
                <p className="text-xs text-blue-600 mt-2 hidden md:block">
                  Data is cached for optimal performance. Your refresh interval preference is saved automatically.
                </p>
              </div>

              {/*  ADDED: Expense Breakdown Card */}
              {totalExpenses > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-red-800 mb-1">Total Expenses</h3>
                      <p className="text-2xl font-bold text-red-900">₦{formatCurrency(totalExpenses)}</p>
                      <p className="text-xs text-red-600 mt-1">Deducted from Cash at Bank</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-red-600" />
                  </div>
                </div>
              )}

              {/* Recent Sales Activity */}
              <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 border border-gray-200 mb-4 md:mb-6">
                <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-3 md:mb-4">Recent Sales Activity</h2>
                <div className="space-y-2 md:space-y-3">
                  {salesData?.slice(0, 3).map((sale, index) => (
                    <div key={index} className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded">
                      <div className="truncate">
                        <span className="font-medium text-gray-700 text-sm md:text-base">{sale.invoice_id || `Sale #${sale.id}`}</span>
                        <p className="text-xs md:text-sm text-gray-500 truncate">
                          {sale.payment_method} - {new Date(sale.date).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="font-semibold text-sm md:text-base ml-2">
                        ₦{formatCurrency(Number(sale.total_amount))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 border border-gray-200">
                <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-3 md:mb-4">Performance Metrics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div className="space-y-2 md:space-y-3">
                    <div className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded">
                      <span className="text-gray-700 text-sm md:text-base">Daily Sales Average</span>
                      <span className="font-semibold text-sm md:text-base">₦{formatCurrency(stats.totalSales / 30)}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded">
                      <span className="text-gray-700 text-sm md:text-base">Total Items in Stock</span>
                      <span className="font-semibold text-sm md:text-base">{formatNumber(stats.totalItemsInStock)}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded">
                      <span className="text-gray-700 text-sm md:text-base">Total Products</span>
                      <span className="font-semibold text-sm md:text-base">{stats.totalProducts}</span>
                    </div>
                  </div>
                  <div className="space-y-2 md:space-y-3">
                    <div className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded">
                      <span className="text-gray-700 text-sm md:text-base">Stock Turnover Ratio</span>
                      <span className="font-semibold text-sm md:text-base">
                        {stats.totalStockValue > 0 ? ((stats.totalSales / stats.totalStockValue) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded">
                      <span className="text-gray-700 text-sm md:text-base">Profit Margin</span>
                      <span className="font-semibold text-sm md:text-base">
                        {stats.totalStockValue > 0 ? 
                          (((stats.totalInventoryValue - stats.totalStockValue) / stats.totalStockValue) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded">
                      <span className="text-gray-700 text-sm md:text-base">Collection Rate</span>
                      <span className="font-semibold text-sm md:text-base">
                        {stats.totalSales > 0 ? 
                          ((stats.outstandingPayments / stats.totalSales) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}