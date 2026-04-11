
import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { generateSchedule } from './schedulerLogic';
import { PatientInput, SchedulingConfig, ScheduleEntry } from './types';
import { DEFAULT_PATIENTS } from './constants';

const App: React.FC = () => {
  const [patientText, setPatientText] = useState<string>(DEFAULT_PATIENTS);
  const [nurse1, setNurse1] = useState<string>('ĐD 1');
  const [nurse2, setNurse2] = useState<string>('ĐD 2');
  const [nurseC, setNurseC] = useState<string>('ĐD 3 (Hành chính)');
  const [totalInpatients, setTotalInpatients] = useState<number>(30);
  const [isWeekend, setIsWeekend] = useState<boolean>(false);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const parsePatients = (text: string): PatientInput[] => {
    return text
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        const parts = line.split('-').map((s) => s.trim());
        if (parts.length < 3) throw new Error(`Dòng không đúng định dạng: ${line}`);
        const [name, time, freq] = parts;
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error(`Giờ y lệnh không hợp lệ: ${time}`);
        const f = parseInt(freq, 10);
        if (isNaN(f) || (f !== 2 && f !== 3)) throw new Error(`Số lần phun phải là 2 hoặc 3: ${freq}`);
        return { name, firstOrderTime: time, frequency: f };
      });
  };

  const handleGenerate = () => {
    try {
      setError(null);
      const patients = parsePatients(patientText);
      const config: SchedulingConfig = { 
        nurse1, 
        nurse2, 
        nurseC,
        totalInpatients,
        isWeekend
      };
      const result = generateSchedule(patients, config);
      setSchedule(result);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi xử lý dữ liệu.');
    }
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    
    const element = printRef.current;
    const now = new Date();
    const dateFileName = `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;
    
    // Hiện header/footer để chụp
    const printHeader = element.querySelector('#print-header') as HTMLElement;
    const printFooter = element.querySelector('#print-footer') as HTMLElement;
    
    if (printHeader) printHeader.style.display = 'block';
    if (printFooter) printFooter.style.display = 'block';
    element.classList.add('pdf-export-mode');

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: element.scrollWidth
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10; // Margin top

      pdf.addImage(imgData, 'JPEG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`Lich_PKD_Cho_Lach_${dateFileName}.pdf`);
    } catch (err) {
      console.error('Lỗi khi tạo PDF:', err);
      setError('Không thể tạo file PDF. Vui lòng thử lại hoặc sử dụng tính năng In.');
    } finally {
      // Ẩn lại sau khi chụp
      if (printHeader) printHeader.style.display = '';
      if (printFooter) printFooter.style.display = '';
      element.classList.remove('pdf-export-mode');
    }
  };

  const today = new Date();
  const day = today.getDate().toString().padStart(2, '0');
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const year = today.getFullYear();

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* App Navigation / Header */}
      <header className="bg-gradient-to-r from-indigo-700 to-blue-600 text-white shadow-lg no-print">
        <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-2xl mb-4 backdrop-blur-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.628.288a2 2 0 01-1.508 0l-.628-.288a6 6 0 00-3.86-.517l-2.387.477a2 2 0 00-1.022.547V19a2 2 0 002 2h11a2 2 0 002-2v-3.572zM15 11V5a2 2 0 10-4 0v6m-7 0a2 2 0 100-4 2 2 0 000 4m14 0a2 2 0 100-4 2 2 0 000 4" />
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-2">Hệ thống Lập lịch Phun khí dung</h1>
          <p className="text-indigo-100 font-medium text-sm md:text-base uppercase tracking-widest opacity-90">TTYT Khu vực Chợ Lách • Khoa Nội - Nhi - Nhiễm</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 -mt-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Input Panel */}
          <section className="lg:col-span-4 space-y-6 no-print">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-100/50 border border-white">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>
                Cấu hình hệ thống
              </h2>
              
              <div className="space-y-4">
                <div className="relative group">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-3 mb-1.5 block group-focus-within:text-indigo-500 transition-colors">Loại ngày làm việc</label>
                  <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl border border-slate-100">
                    <button 
                      onClick={() => setIsWeekend(false)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${!isWeekend ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Ngày hành chính
                    </button>
                    <button 
                      onClick={() => setIsWeekend(true)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${isWeekend ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Thứ 7 / Chủ nhật
                    </button>
                  </div>
                </div>
                <div className="relative group">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-3 mb-1.5 block group-focus-within:text-indigo-500 transition-colors">Số bệnh nhân nội trú</label>
                  <input type="number" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none" value={totalInpatients} onChange={e => setTotalInpatients(parseInt(e.target.value, 10))} />
                </div>
                <div className="relative group pt-4 border-t border-slate-50">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-3 mb-1.5 block group-focus-within:text-indigo-500 transition-colors">Điều dưỡng trực A</label>
                  <input type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none" value={nurse1} onChange={e => setNurse1(e.target.value)} />
                </div>
                <div className="relative group">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-3 mb-1.5 block group-focus-within:text-indigo-500 transition-colors">Điều dưỡng trực B</label>
                  <input type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none" value={nurse2} onChange={e => setNurse2(e.target.value)} />
                </div>
                <div className="relative group">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-3 mb-1.5 block group-focus-within:text-indigo-500 transition-colors">Điều dưỡng hành chính (ĐD 3)</label>
                  <input type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none" value={nurseC} onChange={e => setNurseC(e.target.value)} />
                </div>
              </div>
              
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-10 mb-4 flex items-center gap-3">
                <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>
                Dữ liệu người bệnh PKD
              </h2>
              <textarea 
                rows={8}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm mb-6 font-mono focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none leading-relaxed shadow-inner"
                value={patientText}
                onChange={e => setPatientText(e.target.value)}
                placeholder="Tên - Giờ y lệnh - Số lần..."
              />
              
              <button 
                onClick={handleGenerate} 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-3xl shadow-xl shadow-indigo-200 transition-all active:scale-[0.98] uppercase text-xs tracking-[0.15em]"
              >
                Tạo bảng phân công
              </button>
              
              {error && (
                <div className="mt-6 p-4 bg-red-50 text-red-600 text-[11px] font-bold rounded-2xl border border-red-100 flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}
            </div>
          </section>

          {/* Output Display */}
          <section className="lg:col-span-8">
            {schedule.length > 0 ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-center no-print gap-4 px-2">
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Chi tiết thực hiện</h2>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => window.print()} 
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 00-2 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      In trực tiếp
                    </button>
                    <button 
                      onClick={handleDownloadPDF} 
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl shadow-indigo-200 active:scale-95"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Tải File PDF
                    </button>
                  </div>
                </div>

                <div ref={printRef} className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden w-full pdf-container">
                  
                  {/* PDF Header Section */}
                  <div id="print-header" className="p-10 hidden text-center">
                    <div className="flex justify-start items-start mb-10">
                      <div className="text-left font-bold uppercase text-[9.5pt] leading-relaxed">
                        <p>Bệnh viện Đa khoa khu vực Chợ Lách</p>
                        <p className="tracking-tighter font-black">Khoa Nội - Nhi - Nhiễm</p>
                        <div className="w-24 border-b-2 border-slate-900 mt-2"></div>
                      </div>
                    </div>
                    <h2 className="text-3xl font-black uppercase text-slate-900 mb-2 mt-12 tracking-tight">BẢNG PHÂN CÔNG THỜI GIAN THỦ THUẬT PHUN KHÍ DUNG</h2>
                    <p className="italic text-[11pt] font-semibold text-slate-500">Ngày {day} tháng {month} năm {year}</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400">
                          <th className="px-4 py-6 text-center font-black uppercase tracking-widest border-r border-slate-50">STT</th>
                          <th className="px-5 py-6 font-black uppercase tracking-widest border-r border-slate-50">Người bệnh</th>
                          <th className="px-3 py-6 text-center font-black uppercase tracking-widest border-r border-slate-50">Lần</th>
                          <th className="px-4 py-6 text-center font-black uppercase tracking-widest border-r border-slate-50">Y lệnh</th>
                          <th className="px-6 py-6 text-center font-black uppercase tracking-widest bg-blue-50/80 border-r border-blue-100 text-blue-700">Bắt đầu</th>
                          <th className="px-6 py-6 text-center font-black uppercase tracking-widest bg-emerald-50/80 border-r border-emerald-100 text-emerald-700">Kết thúc</th>
                          <th className="px-5 py-6 font-black uppercase tracking-widest border-r border-slate-50">Điều dưỡng</th>
                          <th className="px-4 py-6 text-center font-black uppercase tracking-widest border-r border-slate-50">Máy</th>
                          <th className="px-5 py-6 font-black uppercase tracking-widest">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {schedule.map((row) => (
                          <tr key={`${row.patientName}-${row.doseNumber}`} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-4 py-5 text-center text-slate-400 border-r border-slate-50 font-medium">{row.stt}</td>
                            <td className="px-5 py-5 font-bold uppercase text-slate-800 border-r border-slate-50">{row.patientName}</td>
                            <td className="px-3 py-5 text-center border-r border-slate-50">
                              <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter shadow-sm border border-slate-200/50">L{row.doseNumber}</span>
                            </td>
                            <td className="px-4 py-5 text-center border-r border-slate-50 text-slate-400 font-mono font-bold tracking-tight">{row.orderTime}</td>
                            <td className="px-6 py-5 text-center border-r border-blue-100 bg-blue-50/30 font-black text-blue-700 text-base">{row.startTime}</td>
                            <td className="px-6 py-5 text-center border-r border-emerald-100 bg-emerald-50/30 font-black text-emerald-700 text-base">{row.endTime}</td>
                            <td className="px-5 py-5 border-r border-slate-50 text-slate-700 font-bold">{row.nurseName}</td>
                            <td className="px-4 py-5 text-center border-r border-slate-50 font-mono font-black text-slate-900 bg-slate-50/30">{row.machineId}</td>
                            <td className="px-5 py-5">
                              {row.notes ? (
                                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                                  row.notes.includes('Kích hoạt') 
                                  ? 'text-indigo-600 bg-indigo-50 border-indigo-200' 
                                  : 'text-orange-600 bg-orange-50 border-orange-200'
                                }`}>
                                  {row.notes}
                                </span>
                              ) : (
                                <span className="text-slate-300 text-[10px] italic font-medium uppercase tracking-widest">Hành chính</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* PDF Footer Section */}
                  <div id="print-footer" className="p-12 hidden">
                    <div className="grid grid-cols-2 gap-32">
                     
                    </div>
                    <div className="mt-20 pt-8 border-t border-slate-100 flex justify-between items-center text-[8pt] text-slate-400 italic">
                      <p>Ngày in: {day}/{month}/{year} - Hệ thống hỗ trợ sắp xếp thời gian phun khí dung</p>
                      <p className="font-bold">Trang 1 / 1</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[32rem] flex flex-col items-center justify-center bg-white rounded-[3rem] border-4 border-dashed border-slate-200 text-slate-400 no-print px-12 text-center shadow-xl shadow-slate-100 transition-all hover:border-indigo-100 hover:bg-indigo-50/20">
                <div className="bg-white p-6 rounded-full mb-6 shadow-xl shadow-slate-200">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-indigo-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-2xl font-black text-slate-800 tracking-tight">Hệ thống sẵn sàng</p>
                <p className="text-base max-w-sm mt-3 leading-relaxed font-medium text-slate-400">Vui lòng nhập cấu hình nhân sự, số lượng bệnh nhân và nhấn "Tạo bảng phân công" để bắt đầu.</p>
              </div>
            )}
          </section>
        </div>
      </main>
      
      <footer className="mt-12 text-center no-print pb-12">
        <div className="w-12 h-1 bg-indigo-100 mx-auto mb-6 rounded-full"></div>
        <p className="text-slate-400 text-[10px] uppercase font-black tracking-[0.4em]">BVĐK KV Chợ Lách 2026</p>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
