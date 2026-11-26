import React from "react";
import Login from "./pages/Auth/Login";

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";

import axios from "axios";
import DefaultLayout from "./Layouts/DefaultLayout";

import ProtectedRoute from "./routes/ProtectedRoute";
import ErrorPage from "./pages/ErrorPage/ErrorPage";
import Page200 from "./pages/Page200/Page200";
import ProjectLayout from "./Layouts/ProjectLayout";
import Projects from "./pages/Project/Projects";
import Quotation from "./pages/Project/Quotation/Quotation";
import ProjectOverview from "./pages/Project/Overview";
import ParttimeEmployees from "./pages/Project/ParttimeEmployees/ParttimeEmployees";
import MiniCATI from "./pages/MiniCATI/MiniCATI";
import CustomVoucher from "./pages/CustomVoucher/CustomVoucher";
import CustomVoucherLog from "./pages/CustomVoucher/CustomVoucherLog";
import DashboardProject from "./pages/Project/ProgressReport";
import Gifts from "./pages/Project/Gifts";
import Transactions from "./pages/Transaction/Transactions";
import Settings from "./pages/Project/Settings";
import AccountManagement from "./pages/AccountManagement/AccountManagement";
import ConfirmPassword from "./pages/Auth/ConfirmPassword";
import ForgotPassword from "./pages/Auth/ForgotPassword";
import SetPassword from "./pages/Auth/SetPassword";
import CATISettings from "./pages/Project/CATISettings";
import MiniCATILogin from "./pages/MiniCATI/MiniCATILogin";
import CATIProtectedRoute from "./routes/CATIProtectedRoute";
import Assignment from "./pages/Project/Assignment";
import ProjectTransactions from "./pages/Project/Transactions";
import TransactionStatistics from "./pages/Project/TransactionStatistics";
import SilverBulletDashBoard from "./pages/SilverBulletDashBoard/SilverBulletDashBoard";
import UMEDashboard from "./pages/dashboards/UMEDashboard";
import ProgressReport from "./pages/Project/ProgressReport";
import Codeframe from "./pages/Codeframe/Codeframe";
import RoleGate from "./routes/RoleGate";
import { ROLE_ACCESS } from "./config/RoleConfig";
import { getProjectPageRoles } from "./config/ProjectNavConfig";

// Fetch the CSRF token from the meta tag
const csrfToken = document
  .querySelector('meta[name="csrf-token"]')
  ?.getAttribute("content");

// Set the CSRF token as a default header for Axios
axios.defaults.headers.common["X-CSRF-TOKEN"] = csrfToken;

const App: React.FC = () => {
  return (
      <Router>
        <AuthProvider>
          <Routes>
            {/* ================= PUBLIC ROUTES ================= */}
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/confirm-password" element={<ConfirmPassword/>} />
            <Route path="/forgot-password" element={<ForgotPassword/>} />
            <Route path="/set-password" element={<SetPassword/>} />
            <Route path="/page200" element={<Page200 messageSuccess="" />} />
            <Route path="/error" element={<ErrorPage />} />            
            <Route path="/custom-voucher/:token" element={<CustomVoucher />} />
            <Route path='/search-link' element={<CustomVoucherLog />} />

            {/* ================= DASHBOARDS (login required) ================= */}
            <Route path='/progress-report' element={<ProtectedRoute><DashboardProject /></ProtectedRoute>} />
            <Route path='/silver-bullet-dashboard' element={<ProtectedRoute><SilverBulletDashBoard /></ProtectedRoute>} />
            <Route path='/ume-dashboard' element={<ProtectedRoute><UMEDashboard /></ProtectedRoute>} />
            <Route path='/progress' element={<ProtectedRoute><ProgressReport /></ProtectedRoute>} />
            <Route path='/codeframe' element={<ProtectedRoute><Codeframe /></ProtectedRoute>} />

            {/* ================= DEFAULT LAYOUT GROUP ================= */}
            <Route
              element={
                <ProtectedRoute>
                  <DefaultLayout />
                </ProtectedRoute>
              }
            >
              <Route
                path="/project-management/projects"
                element={<Projects />}
              />
              <Route
                path="/transaction-manager/transactions"
                element={<RoleGate allowedRoles={ROLE_ACCESS.transactionsPage}><Transactions /></RoleGate>}
              />
              <Route
                path="/account-management/accounts"
                element={<RoleGate allowedRoles={ROLE_ACCESS.accountsPage}><AccountManagement /></RoleGate>}
              />
            </Route>

            {/* ================= PROJECT LAYOUT GROUP ================= */}
            <Route
              path="/project-management/projects/:id"
              element={
                <ProtectedRoute>
                  <ProjectLayout />
                </ProtectedRoute>
              }
            >
              <Route
                path="overview"
                element={<RoleGate allowedRoles={getProjectPageRoles("overview")}><ProjectOverview /></RoleGate>}
              />
              <Route
                path="quotation"
                element={<RoleGate allowedRoles={getProjectPageRoles("quotation")}><Quotation /></RoleGate>}
              />
              <Route
                path="assignment"
                element={<RoleGate allowedRoles={getProjectPageRoles("assignment")}><Assignment /></RoleGate>}
              />
              <Route
                path="parttime-employees"
                element={<RoleGate allowedRoles={getProjectPageRoles("parttime-employees")}><ParttimeEmployees /></RoleGate>}
              />
              <Route
                path="gifts"
                element={<RoleGate allowedRoles={getProjectPageRoles("gifts")}><Gifts /></RoleGate>}
              />
              <Route
                path="transactions"
                element={<RoleGate allowedRoles={getProjectPageRoles("transactions")}><ProjectTransactions /></RoleGate>}
              />
              <Route
                path="transaction-statistics"
                element={<RoleGate allowedRoles={getProjectPageRoles("transaction-statistics")}><TransactionStatistics /></RoleGate>}
              />
              <Route
                path="cati-settings"
                element={<RoleGate allowedRoles={getProjectPageRoles("cati-settings")}><CATISettings /></RoleGate>}
              />
              <Route
                path="settings"
                element={<RoleGate allowedRoles={getProjectPageRoles("settings")}><Settings /></RoleGate>}
              />
            </Route>
            {/* ================= MINI CATI============ */}
            <Route path="/mini-cati/login" element={<MiniCATILogin />} />
            
            <Route element={<CATIProtectedRoute />}>
              <Route path="/mini-cati" element={<MiniCATI /> } />
            </Route>
            {/* ================= 404 ================= */}
            <Route 
              path="*" 
              element={
                <Navigate
                  to="/error"
                  state={{
                    errorCode: 4,
                    errorMessage: "Sorry, the page you are looking for does not exist. Please contact the Administrator for assistance."
                  }}
                  replace
                />
              } /> 
          </Routes>
        </AuthProvider>
      </Router>
  );
};

export default App;
