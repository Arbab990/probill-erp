import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './guards/ProtectedRoute.jsx';
import Layout from './components/layout/Layout.jsx';
import Login from './pages/Auth/Login.jsx';
import Register from './pages/Auth/Register.jsx';
import Dashboard from './pages/Dashboard/Dashboard.jsx';
import VendorList from './pages/Vendors/VendorList.jsx';
import VendorForm from './pages/Vendors/VendorForm.jsx';
import VendorDetail from './pages/Vendors/VendorDetail.jsx';
import InvoiceList from './pages/Billing/InvoiceList.jsx';
import InvoiceCreate from './pages/Billing/InvoiceCreate.jsx';
import InvoiceDetail from './pages/Billing/InvoiceDetail.jsx';
import PurchaseHub from './pages/Purchase/PurchaseHub.jsx';
import PRList from './pages/Purchase/PRList.jsx';
import PRCreate from './pages/Purchase/PRCreate.jsx';
import POList from './pages/Purchase/POList.jsx';
import POCreate from './pages/Purchase/POCreate.jsx';
import PODetail from './pages/Purchase/PODetail.jsx';
import GRNCreate from './pages/Purchase/GRNCreate.jsx';
import OrderHub from './pages/Orders/OrderHub.jsx';
import CustomerList from './pages/Orders/CustomerList.jsx';
import CustomerForm from './pages/Orders/CustomerForm.jsx';
import CustomerDetail from './pages/Orders/CustomerDetail.jsx';
import SalesOrderList from './pages/Orders/SalesOrderList.jsx';
import SalesOrderCreate from './pages/Orders/SalesOrderCreate.jsx';
import SalesOrderDetail from './pages/Orders/SalesOrderDetail.jsx';
import ARAgingReport from './pages/Orders/ARAgingReport.jsx';
import PaymentHub from './pages/Payments/PaymentHub.jsx';
import PaymentRunList from './pages/Payments/PaymentRunList.jsx';
import PaymentRunCreate from './pages/Payments/PaymentRunCreate.jsx';
import PaymentRunDetail from './pages/Payments/PaymentRunDetail.jsx';
import GLHub from './pages/GL/GLHub.jsx';
import ChartOfAccounts from './pages/GL/ChartOfAccounts.jsx';
import JournalEntryList from './pages/GL/JournalEntryList.jsx';
import JournalEntryCreate from './pages/GL/JournalEntryCreate.jsx';
import FinancialReports from './pages/GL/FinancialReports.jsx';
import AnalyticsHub from './pages/Analytics/AnalyticsHub.jsx';
import KPITrends from './pages/Analytics/KPITrends.jsx';
import CashFlow from './pages/Analytics/CashFlow.jsx';
import VendorAnalytics from './pages/Analytics/VendorAnalytics.jsx';
import ExportCenter from './pages/Analytics/ExportCenter.jsx';
import SettingsHub from './pages/Settings/SettingsHub.jsx';
import CompanySettings from './pages/Settings/CompanySettings.jsx';
import UserManagement from './pages/Settings/UserManagement.jsx';
import AuditLogViewer from './pages/Settings/AuditLogViewer.jsx';
import MyProfile from './pages/Settings/MyProfile.jsx';
import NotificationCenter from './pages/Notifications/NotificationCenter.jsx';
import NotFound from './pages/NotFound.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';

const Soon = ({ label }) => (
  <div className="page-container">
    <div className="card flex flex-col items-center justify-center py-24 text-center space-y-3">
      <span className="text-4xl">🚧</span>
      <h2 className="font-display font-bold text-xl text-slate-100">{label}</h2>
      <p className="text-slate-400 text-sm">Coming in an upcoming phase.</p>
    </div>
  </div>
);

const App = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    {[
      { path: '/dashboard', el: <Dashboard /> },
      { path: '/vendors', el: <VendorList /> },
      { path: '/vendors/new', el: <VendorForm /> },
      { path: '/vendors/:id', el: <VendorDetail /> },
      { path: '/vendors/:id/edit', el: <VendorForm /> },
      { path: '/billing', el: <InvoiceList /> },
      { path: '/billing/new', el: <InvoiceCreate /> },
      { path: '/billing/:id', el: <InvoiceDetail /> },
      { path: '/payments', el: <PaymentHub /> },
      { path: '/payments/new', el: <PaymentRunCreate /> },
      { path: '/payments/runs', el: <PaymentRunList /> },
      { path: '/payments/runs/:id', el: <PaymentRunDetail /> },
      { path: '/finance', el: <GLHub /> },
      { path: '/gl', el: <GLHub /> },
      { path: '/gl/accounts', el: <ChartOfAccounts /> },
      { path: '/gl/journal', el: <JournalEntryList /> },
      { path: '/gl/journal/new', el: <JournalEntryCreate /> },
      { path: '/gl/journal/:id', el: <JournalEntryCreate /> },
      { path: '/gl/reports', el: <FinancialReports /> },
      { path: '/reports', el: <FinancialReports /> },
      { path: '/purchase', el: <PurchaseHub /> },
      { path: '/purchase/requisitions', el: <PRList /> },
      { path: '/purchase/requisitions/new', el: <PRCreate /> },
      { path: '/purchase/requisitions/:id', el: <PRCreate /> },
      { path: '/purchase/orders', el: <POList /> },
      { path: '/purchase/orders/new', el: <POCreate /> },
      { path: '/purchase/orders/:id', el: <PODetail /> },
      { path: '/purchase/grn/new', el: <GRNCreate /> },
      { path: '/orders', el: <OrderHub /> },
      { path: '/orders/customers', el: <CustomerList /> },
      { path: '/orders/customers/new', el: <CustomerForm /> },
      { path: '/orders/customers/:id', el: <CustomerDetail /> },
      { path: '/orders/customers/:id/edit', el: <CustomerForm /> },
      { path: '/orders/sales', el: <SalesOrderList /> },
      { path: '/orders/sales/new', el: <SalesOrderCreate /> },
      { path: '/orders/sales/:id', el: <SalesOrderDetail /> },
      { path: '/orders/ar-aging', el: <ARAgingReport /> },
      { path: '/analytics', el: <AnalyticsHub /> },
      { path: '/analytics/kpi', el: <KPITrends /> },
      { path: '/analytics/cash-flow', el: <CashFlow /> },
      { path: '/analytics/vendors', el: <VendorAnalytics /> },
      { path: '/analytics/customers', el: <VendorAnalytics /> },
      { path: '/analytics/export', el: <ExportCenter /> },
      { path: '/settings', el: <SettingsHub /> },
      { path: '/settings/company', el: <CompanySettings /> },
      { path: '/settings/users', el: <UserManagement /> },
      { path: '/settings/audit-log', el: <AuditLogViewer /> },
      { path: '/settings/profile', el: <MyProfile /> },
      { path: '/admin', el: <SettingsHub /> },
      { path: '/notifications', el: <NotificationCenter /> },
      { path: '/reports/*', el: <Soon label="Reports — Phase 9" /> },
      { path: '/admin/*', el: <Soon label="Admin Panel — Phase 9" /> },
    ].map(({ path, el }) => (
      <Route key={path} path={path} element={
        <ProtectedRoute><Layout>{el}</Layout></ProtectedRoute>
      } />
    ))}
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default App;

