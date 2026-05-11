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
import ParttimeEmployees from "./pages/Project/ParttimeEmployees/ParttimeEmployees";
import MiniCATI from "./pages/MiniCATI/MiniCATI";
import CustomVoucher from "./pages/CustomVoucher/CustomVoucher";
import CustomVoucherLog from "./pages/CustomVoucher/CustomVoucherLog";
import DashboardProject from "./pages/Project/ProgressReport";
import TradeUnionTransactions from "./pages/TradeUnion/TradeUnionTransactions";
import Gifts from "./pages/Project/Gifts";
import Transactions from "./pages/Transaction/Transactions";
import Settings from "./pages/Project/Settings";
import AccountManagement from "./pages/AccountManagement/AccountManagement";
import ConfirmPassword from "./pages/Auth/ConfirmPassword";
import ForgotPassword from "./pages/Auth/ForgotPassword";
import CATISettings from "./pages/Project/CATISettings";
import MiniCATILogin from "./pages/MiniCATI/MiniCATILogin";
import CATIProtectedRoute from "./routes/CATIProtectedRoute";

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
            <Route path="/page200" element={<Page200 messageSuccess="" />} />
            <Route path="/error" element={<ErrorPage />} />            
            <Route path="/custom-voucher/:token" element={<CustomVoucher />} />
            <Route path='/search-link' element={<CustomVoucherLog />} />

            <Route path='/progress-report' element={<DashboardProject />} />

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
                element={<Transactions />}
              />
              <Route
                path="/account-management/accounts"
                element={<AccountManagement/>}
              />
            </Route>

            {/* ================= PROJECT LAYOUT GROUP ================= */}
            <Route
              path="/project-management/projects/:id"
              element={
                <ProtectedRoute allowedRoles={["admin", "scripter"]}>
                  <ProjectLayout />
                </ProtectedRoute>
              }
            >
              <Route
                path="quotation"
                element={<Quotation />}
              />
              <Route
                path="parttime-employees"
                element={<ParttimeEmployees />}
              />
              <Route
                path="gifts"
                element={<Gifts />}
              />
              <Route
                path="cati-settings"
                element={<CATISettings />}
              />
              <Route
                path="settings"
                element={<Settings />}
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
                    errorMessage: "Sorry, the page you are looking for does not exist. Please contact the Admistrator for asistance."
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