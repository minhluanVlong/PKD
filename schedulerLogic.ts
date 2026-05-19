import { 
  PatientInput, 
  ScheduleEntry, 
  SchedulingConfig 
} from './types';

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (minutes: number): string => {
  const h = Math.floor((minutes % 1440) / 60);
  const m = Math.floor(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const NURSE_MACHINE_MAP: Record<string, string> = {
  'ĐD1': '032',
  'ĐD2': '121',
  'ĐD3': '368'
};

const DURATION = 20;
const GAP = 1;

export const generateSchedule = (
  patients: PatientInput[],
  config: SchedulingConfig
): ScheduleEntry[] => {
  const uniquePatientNames = Array.from(new Set(patients.map(p => p.name)));
  
  const activeNurseTags = config.totalInpatients >= 30 
    ? ['ĐD1', 'ĐD2', 'ĐD3']
    : ['ĐD1', 'ĐD2'];

  const nurseNames: Record<string, string> = {
    'ĐD1': config.nurse1 || 'Điều dưỡng 1',
    'ĐD2': config.nurse2 || 'Điều dưỡng 2',
    'ĐD3': config.nurseC || 'Điều dưỡng 3'
  };

  // Preparation: Group by patient and find initial order time
  const patientData = uniquePatientNames.map(name => {
    const p = patients.find(p => p.name === name)!;
    return {
      name: p.name,
      firstOrderTime: timeToMinutes(p.firstOrderTime),
      frequency: p.frequency
    };
  }).sort((a, b) => a.firstOrderTime - b.firstOrderTime);

  const finalEntries: ScheduleEntry[] = [];
  
  // Track occupied time slots for each nurse: { start, end }[]
  const nurseBusySlots: Record<string, { start: number, end: number }[]> = {};
  activeNurseTags.forEach(tag => nurseBusySlots[tag] = []);

  const isNurseFree = (tag: string, start: number, end: number) => {
    return !nurseBusySlots[tag].some(slot => 
      (start < slot.end + GAP && end > slot.start - GAP)
    );
  };

  const addSlotToNurse = (tag: string, start: number, end: number) => {
    nurseBusySlots[tag].push({ start, end });
    nurseBusySlots[tag].sort((a, b) => a.start - b.start);
  };

  patientData.forEach(p => {
    let bestNurse = '';
    let bestSchedule: { start: number, end: number, orderTime: string }[] = [];
    let earliestD1Start = Infinity;

    // Try each active nurse
    activeNurseTags.forEach(tag => {
      let currentD1Start = p.firstOrderTime + 8;
      
      // Step through time to find a valid window for ALL doses
      let foundValid = false;
      let attemptD1 = currentD1Start;
      
      // Safety break to prevent infinite loop
      while (!foundValid && attemptD1 < 2880) { 
        const tempDoses: { start: number, end: number, orderTime: string }[] = [];
        let possible = true;

        // Dose 1
        let d1Start = attemptD1;
        let d1End = d1Start + DURATION;
        if (!isNurseFree(tag, d1Start, d1End)) {
          possible = false;
          // Move attemptD1 to next available spot for this nurse
          const blockingSlot = nurseBusySlots[tag].find(s => d1Start < s.end + GAP && d1End > s.start - GAP);
          attemptD1 = (blockingSlot?.end || d1Start) + GAP;
          continue;
        }
        tempDoses.push({ start: d1Start, end: d1End, orderTime: minutesToTime(p.firstOrderTime) });

        // Dose 2
        let d2Start, d2End;
        if (p.frequency >= 2) {
          const interval = 720; // Default 12h
          const freq3Interval = 480; // 8h if 3 doses
          const actualInterval = p.frequency === 3 ? freq3Interval : interval;
          
          d2Start = d1Start + actualInterval;
          d2End = d2Start + DURATION;
          
          while (!isNurseFree(tag, d2Start, d2End) && d2Start < 2880) {
            const blocking = nurseBusySlots[tag].find(s => d2Start < s.end + GAP && d2End > s.start - GAP);
            d2Start = (blocking?.end || d2Start) + GAP;
            d2End = d2Start + DURATION;
          }
          const order2 = p.firstOrderTime + (p.frequency === 3 ? 480 : 720);
          tempDoses.push({ start: d2Start, end: d2End, orderTime: minutesToTime(order2) });
        }

        // Dose 3
        if (p.frequency === 3) {
          let d3Start = tempDoses[1].start + 420; // 7h from D2
          let d3End = d3Start + DURATION;
          while (!isNurseFree(tag, d3Start, d3End) && d3Start < 2880) {
            const blocking = nurseBusySlots[tag].find(s => d3Start < s.end + GAP && d3End > s.start - GAP);
            d3Start = (blocking?.end || d3Start) + GAP;
            d3End = d3Start + DURATION;
          }
          const order3 = p.firstOrderTime + 480 + 420;
          tempDoses.push({ start: d3Start, end: d3End, orderTime: minutesToTime(order3) });
        }

        if (possible) {
          foundValid = true;
          if (d1Start < earliestD1Start) {
            earliestD1Start = d1Start;
            bestNurse = tag;
            bestSchedule = tempDoses;
          }
        }
      }
    });

    if (bestNurse) {
      bestSchedule.forEach((dose, idx) => {
        addSlotToNurse(bestNurse, dose.start, dose.end);
        finalEntries.push({
          stt: 0,
          patientName: p.name,
          doseNumber: idx + 1,
          orderTime: dose.orderTime,
          startTime: minutesToTime(dose.start),
          endTime: minutesToTime(dose.end),
          nurseName: nurseNames[bestNurse],
          machineId: NURSE_MACHINE_MAP[bestNurse],
          isOffHours: false, // Rule removed
          notes: '',
          rawMinutes: dose.start
        });
      });
    }
  });

  return finalEntries
    .sort((a, b) => {
      if (a.patientName !== b.patientName) {
        return a.patientName.localeCompare(b.patientName, 'vi');
      }
      return a.doseNumber - b.doseNumber;
    })
    .map((entry, idx) => ({ ...entry, stt: idx + 1 }));
};
