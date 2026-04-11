
import { 
  PatientInput, 
  ScheduleEntry, 
  SchedulingConfig 
} from './types';
import { 
  OFFICE_START, 
  OFFICE_END, 
  EXECUTION_OFFSET, 
  DURATION, 
  MAX_DELAY, 
  DOSE3_EARLY_LIMIT,
  MACHINES
} from './constants';

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (minutes: number): string => {
  const h = Math.floor((minutes % 1440) / 60);
  const m = Math.floor(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const isOfficeHours = (minutes: number): boolean => {
  const normalized = minutes % 1440;
  return normalized >= OFFICE_START && normalized <= OFFICE_END;
};

export const generateSchedule = (
  patients: PatientInput[],
  config: SchedulingConfig
): ScheduleEntry[] => {
  const pkdCount = patients.length;
  // Đánh dấu trạng thái bệnh đông (>= 30 bệnh)
  const isHighWorkload = pkdCount >= 30;

  const allSlots: { 
    patientName: string; 
    doseNumber: number; 
    orderTime: string; 
    targetMinutes: number; 
    isDose3: boolean;
    frequency: number;
  }[] = [];

  // 1. Tạo các khung giờ lý thuyết dựa trên y lệnh + 8 phút
  patients.forEach(p => {
    const firstOrderMinutes = timeToMinutes(p.firstOrderTime);
    const interval = p.frequency === 2 ? 12 * 60 : 8 * 60;

    for (let i = 0; i < p.frequency; i++) {
      // Giờ thực hiện = Giờ chỉ định + 8 phút
      const targetExecutionMinutes = firstOrderMinutes + (i * interval) + EXECUTION_OFFSET;
      
      allSlots.push({
        patientName: p.name,
        doseNumber: i + 1,
        orderTime: p.firstOrderTime,
        targetMinutes: targetExecutionMinutes,
        isDose3: i === 2 && p.frequency === 3,
        frequency: p.frequency
      });
    }
  });

  // Sắp xếp theo thời gian thực hiện mục tiêu
  allSlots.sort((a, b) => a.targetMinutes - b.targetMinutes);

  const finalSchedule: ScheduleEntry[] = [];
  const usage: Record<number, { nurses: string[]; machines: string[] }> = {};

  const isResourceAvailable = (
    start: number, 
    nurse: string, 
    machine: string
  ): boolean => {
    // Quy tắc: Tuyệt đối không trùng thời gian (20 phút theo dõi liên tục)
    for (let t = start; t < start + DURATION; t++) {
      const timeUsage = usage[t % 1440];
      if (timeUsage) {
        if (timeUsage.nurses.includes(nurse) || timeUsage.machines.includes(machine)) {
          return false;
        }
      }
    }
    return true;
  };

  const bookResources = (
    start: number, 
    nurse: string, 
    machine: string
  ) => {
    for (let t = start; t < start + DURATION; t++) {
      const min = t % 1440;
      if (!usage[min]) usage[min] = { nurses: [], machines: [] };
      usage[min].nurses.push(nurse);
      usage[min].machines.push(machine);
    }
  };

  allSlots.forEach(slot => {
    let bestStart = slot.targetMinutes;
    let assignedNurse = "";
    let assignedMachine = "";
    let found = false;

    const searchStart = slot.isDose3 ? bestStart - DOSE3_EARLY_LIMIT : bestStart;
    const searchEnd = bestStart + MAX_DELAY;

    for (let t = searchStart; t <= searchEnd; t++) {
      const office = isOfficeHours(t);
      // Ngày hành chánh: Luôn cho phép 3 ĐD trong giờ hành chính (office)
      // Thứ 7/CN: Chỉ cho phép 3 ĐD nếu số bệnh >= 30 VÀ trong giờ hành chính (office)
      const canUseThree = office && (!config.isWeekend || pkdCount >= 30);
      
      const availableNurses = canUseThree 
        ? [config.nurse1, config.nurse2, config.nurseC] 
        : [config.nurse1, config.nurse2];
        
      const availableMachines = canUseThree
        ? [...MACHINES.ALWAYS, ...MACHINES.OFFICE]
        : [...MACHINES.ALWAYS];

      for (const n of availableNurses) {
        for (const m of availableMachines) {
          if (isResourceAvailable(t, n, m)) {
            bestStart = t;
            assignedNurse = n;
            assignedMachine = m;
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (found) break;
    }

    if (found) {
      bookResources(bestStart, assignedNurse, assignedMachine);
      finalSchedule.push({
        stt: 0,
        patientName: slot.patientName,
        doseNumber: slot.doseNumber,
        orderTime: slot.orderTime,
        startTime: minutesToTime(bestStart),
        endTime: minutesToTime(bestStart + DURATION),
        nurseName: assignedNurse,
        machineId: assignedMachine,
        isOffHours: !isOfficeHours(bestStart),
        notes: assignedNurse === config.nurseC 
          ? (config.isWeekend ? "ĐD 3 (Bệnh đông - T7/CN)" : "ĐD 3 (Hành chính)") 
          : "",
        rawMinutes: bestStart
      });
    } else {
      finalSchedule.push({
        stt: 0,
        patientName: slot.patientName,
        doseNumber: slot.doseNumber,
        orderTime: slot.orderTime,
        startTime: minutesToTime(bestStart),
        endTime: minutesToTime(bestStart + DURATION),
        nurseName: "CHƯA PHÂN CÔNG",
        machineId: "HẾT MÁY",
        isOffHours: !isOfficeHours(bestStart),
        notes: "Xung đột nguồn lực",
        rawMinutes: bestStart
      });
    }
  });

  return finalSchedule
    .sort((a, b) => a.patientName.localeCompare(b.patientName, 'vi'))
    .map((entry, idx) => ({ ...entry, stt: idx + 1 }));
};
