
export interface PatientInput {
  name: string;
  firstOrderTime: string; // HH:mm (Medical Order Time)
  frequency: number; // 2 or 3
}

export interface Nurse {
  id: string;
  name: string;
  isSpecialist: boolean; // Nurse C
}

export interface Machine {
  id: string;
  isStandard: boolean; // 032, 121 are always available, 368 is office only
}

export interface ScheduleEntry {
  stt: number;
  patientName: string;
  doseNumber: number;
  orderTime: string; // HH:mm (The specific order time for this dose)
  startTime: string; // HH:mm (Execution time)
  endTime: string; // HH:mm
  nurseName: string;
  machineId: string;
  isOffHours: boolean;
  notes: string;
  rawMinutes: number; // Used for sorting if needed
}

export interface SchedulingConfig {
  nurse1: string;
  nurse2: string;
  nurseC: string;
  totalInpatients: number;
  isWeekend: boolean;
}
