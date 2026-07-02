import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AppProvider } from "./AppContext";
import { Layout } from "./components/Layout";
import { AgentPerformance } from "./pages/AgentPerformance";
import { Billing } from "./pages/Billing";
import { Conversations } from "./pages/Conversations";
import { LeadDetail } from "./pages/LeadDetail";
import { Leads } from "./pages/Leads";
import { Pipeline } from "./pages/Pipeline";
import { Settings } from "./pages/Settings";
import { SmsCampaigns } from "./pages/SmsCampaigns";
import { TeamStats } from "./pages/TeamStats";
import { VoiceCampaigns } from "./pages/VoiceCampaigns";

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route
            path="/*"
            element={
              <Layout>
                <Routes>
                  <Route
                    path="/"
                    element={<Navigate to="/team-stats" replace />}
                  />
                  <Route path="/team-stats" element={<TeamStats />} />
                  <Route
                    path="/agent-performance"
                    element={<AgentPerformance />}
                  />
                  <Route path="/conversations" element={<Conversations />} />
                  <Route path="/leads" element={<Leads />} />
                  <Route path="/leads/:id" element={<LeadDetail />} />
                  <Route path="/pipeline" element={<Pipeline />} />
                  <Route path="/sms-campaigns" element={<SmsCampaigns />} />
                  <Route path="/voice-campaigns" element={<VoiceCampaigns />} />
                  <Route path="/billing" element={<Billing />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route
                    path="*"
                    element={<Navigate to="/team-stats" replace />}
                  />
                </Routes>
              </Layout>
            }
          />
        </Routes>
        <Toaster position="bottom-right" theme="dark" richColors />
      </AppProvider>
    </BrowserRouter>
  );
}
