export interface MasterTask {
  id: number;
  name: string;
  shortName?: string;
  duration: number;
  type: "PROCESS" | "CUTOFF";
  color: string;
  isCashConfirmed: boolean;
  requiresWorkingHours: boolean;
}

export interface TaskItem {
  tempId: string;
  name: string;
  shortName?: string;
  dayOffset: number;
  startTime: string; // "HH:mm"
  duration: number; // minutes
  type?: "PROCESS" | "CUTOFF";
  color?: string;
  sequenceOrder?: number;
  dependsOnTempId?: string | null;
  dependencyType?: "IMMEDIATE" | "TIME_LAG" | "NO_RELATION";
  dependencyDelay?: number;
  dependsOnId?: number; // Legacy/Database ID reference
  taskId?: number;
  saveToMaster?: boolean;
  isCashConfirmed?: boolean;
  requiresWorkingHours?: boolean;
}

export interface WorkingHours {
  start: string;
  end: string;
}

export interface SimulationFundProfile {
  id: number;
  name: string;
  officeStart?: string;
  officeEnd?: string;
  currentTemplate?: {
    templateTasks: TaskItem[];
  } | null;
  targetTemplate?: {
    templateTasks: TaskItem[];
  } | null;
}
