import { Routes, Route, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Login } from "./pages/Login";
import { GlobalBar } from "./components/Header";
import { ProjectTabs } from "./components/ProjectTabs";
import { ProjectsList } from "./pages/ProjectsList";
import { Dashboard } from "./pages/Dashboard";
import { Inbox } from "./pages/Inbox";
import { People } from "./pages/People";
import { ProjectTasks } from "./pages/ProjectTasks";
import { Shots } from "./pages/Shots";
import { Assets } from "./pages/Assets";
import { MyTasks } from "./pages/MyTasks";
import { Review } from "./pages/Review";
import { Playlists } from "./pages/Playlists";
import { Schedule } from "./pages/Schedule";
import { EntityDetail } from "./pages/EntityDetail";

export default function App() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Login />;
  // 프로젝트 리스트/전역 Inbox 뷰에서는 2번째 메뉴 라인(프로젝트 탭)을 숨긴다
  const globalViews = ["/projects", "/inbox", "/people"];
  const showProjectTabs = !globalViews.includes(location.pathname);
  return (
    <div className="app">
      <GlobalBar />
      {showProjectTabs && <ProjectTabs />}
      <main className="content">
        <Routes>
          <Route path="/projects" element={<ProjectsList />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/people" element={<People />} />
          <Route path="/shots" element={<Shots />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/my-tasks" element={<MyTasks />} />
          <Route path="/tasks" element={<ProjectTasks />} />
          <Route path="/review" element={<Review />} />
          <Route path="/playlists" element={<Playlists />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/detail/:entityType/:id" element={<EntityDetail />} />
        </Routes>
      </main>
    </div>
  );
}
