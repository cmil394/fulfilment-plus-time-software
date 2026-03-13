import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ActiveTimerProvider } from "./context/ActiveTimerContext";
import ActiveTimerWidget from "./components/ActiveTimerWidget/ActiveTimerWidget";
import Home from "./pages/Home.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ActiveTimerProvider>
          <Home />
          <ActiveTimerWidget />
        </ActiveTimerProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
