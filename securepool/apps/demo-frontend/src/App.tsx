import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SecurePoolProvider } from "@securepool/react-sdk";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import OtpLoginPage from "./pages/OtpLoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import DashboardPage from "./pages/DashboardPage";

const config = {
  apiBaseUrl: import.meta.env.VITE_API_URL || "http://localhost:5001",
  tenantId: import.meta.env.VITE_TENANT_ID || "default",
};

function App() {
  return (
    <SecurePoolProvider config={config}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/otp-login" element={<OtpLoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </SecurePoolProvider>
  );
}

export default App;
