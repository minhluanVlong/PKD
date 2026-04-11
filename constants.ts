
export const OFFICE_START = 7 * 60; // 07:00
export const OFFICE_END = 17 * 60; // 17:00
export const EXECUTION_OFFSET = 8; // Minutes after order
export const DURATION = 20; // Minutes per session
export const MAX_DELAY = 30; // Max delay allowed
export const DOSE3_EARLY_LIMIT = 60; // Max early adjustment for 3rd dose

export const MACHINES = {
  ALWAYS: ['032', '121'],
  OFFICE: ['368']
};

export const DEFAULT_PATIENTS = `Nguyễn Văn A - 08:30 - 3
Trần Thị B - 09:15 - 2
Lê Văn C - 07:00 - 3
Phạm Minh Đ - 16:45 - 2
Đặng Thu H - 22:00 - 3`;
