import { createContext, useContext, useEffect, useState } from "react";

interface ProjectContextValue {
  projectId: number | null;
  setProjectId: (id: number | null) => void;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

const STORAGE_KEY = "fptr.selectedProject";

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projectId, setProjectIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? Number(stored) : null;
  });

  const setProjectId = (id: number | null) => {
    setProjectIdState(id);
  };

  useEffect(() => {
    if (projectId != null) localStorage.setItem(STORAGE_KEY, String(projectId));
    else localStorage.removeItem(STORAGE_KEY);
  }, [projectId]);

  return (
    <ProjectContext.Provider value={{ projectId, setProjectId }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}
