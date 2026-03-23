import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  User as UserIcon, 
  Building2,
  CheckCircle2,
  AlertCircle,
  X,
  MessageSquare,
  Phone,
  LayoutDashboard,
  LogOut,
  Mail,
  Users,
  ShieldCheck,
  Search,
  Trash2,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import { authService, dbService, MOCK_ROOMS } from './services/mockApi';
import { Booking, User, Room } from './types';

// --- Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }: any) => {
  const variants: any = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-500/20',
    secondary: 'bg-surface-100 text-surface-700 hover:bg-surface-200',
    outline: 'border border-surface-200 text-brand-600 hover:bg-brand-50',
    ghost: 'text-surface-500 hover:bg-surface-100',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20',
  };
  return (
    <button 
      disabled={disabled}
      onClick={onClick} 
      className={`px-6 py-2.5 rounded-2xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Modal = ({ isOpen, onClose, title, children }: any) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-surface-900/40 backdrop-blur-md"
          />
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-surface-100 relative z-10"
          >
            <div className="p-6 sm:p-8 border-b border-surface-50 flex justify-between items-center bg-surface-50/50">
              <h3 className="text-xl sm:text-2xl font-bold text-surface-900">{title}</h3>
              <button onClick={onClose} className="p-2 hover:bg-surface-200 rounded-full transition-colors text-surface-400">
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>
            <div className="p-6 sm:p-8 max-h-[80vh] overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'calendar' | 'admin' | 'my-bookings'>('calendar');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminPasswordModalOpen, setIsAdminPasswordModalOpen] = useState(false);
  const [adminPasswordError, setAdminPasswordError] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; roomId: string } | null>(null);
  
  // Booking Form State
  const [bookingForm, setBookingForm] = useState({
    subject: '',
    roomId: MOCK_ROOMS[0].id,
    startTime: '09:00',
    endTime: '10:00',
    phone: '',
  });
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [pendingBooking, setPendingBooking] = useState<any>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    // Check auth and subscribe to changes
    const unsubscribeAuth = authService.onAuthChange((userData, error) => {
      if (error) {
        setLoginError(error);
        setUser(null);
      } else {
        setUser(userData);
        setLoginError(null);
        if (userData) {
          setBookingForm(prev => ({ ...prev, phone: userData.phone || '' }));
        }
      }
      setLoading(false);
    });
    
    return () => {
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setBookings([]);
      return;
    }

    // Subscribe to bookings
    const unsubscribeBookings = dbService.subscribeToBookings((data) => {
      console.log('Received bookings update:', data);
      setBookings(data);
    });

    return () => {
      unsubscribeBookings();
    };
  }, [user]);

  const handleLogin = async () => {
    try {
      await authService.signInWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handlePrevYear = () => {
    setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1));
  };

  const handleNextYear = () => {
    setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1));
  };

  const handleMonthChange = (month: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), month, 1));
  };

  const handleYearChange = (year: number) => {
    setCurrentDate(new Date(year, currentDate.getMonth(), 1));
  };

  const openBookingModal = (date: Date, roomId: string) => {
    setSelectedSlot({ date, roomId });
    setBookingForm(prev => ({ ...prev, roomId }));
    setIsBookingModalOpen(true);
    setConflictError(null);
  };

  const handleAdminAccess = () => {
    if (isAdminAuthenticated) {
      setView('admin');
    } else {
      setIsAdminPasswordModalOpen(true);
      setAdminPasswordError(false);
      setAdminPassword('');
    }
  };

  const handleAdminPasswordSubmit = () => {
    if (adminPassword === 'ldo2569') {
      setIsAdminAuthenticated(true);
      setIsAdminPasswordModalOpen(false);
      setView('admin');
    } else {
      setAdminPasswordError(true);
    }
  };

  const handleBookingCheck = async () => {
    if (!user || !selectedSlot) return;

    const start = new Date(selectedSlot.date);
    const [sH, sM] = bookingForm.startTime.split(':').map(Number);
    start.setHours(sH, sM, 0, 0);

    const end = new Date(selectedSlot.date);
    const [eH, eM] = bookingForm.endTime.split(':').map(Number);
    end.setHours(eH, eM, 0, 0);

    if (end <= start) {
      setConflictError('เวลาสิ้นสุดต้องหลังจากเวลาเริ่ม');
      return;
    }

    const hasConflict = dbService.checkConflict(bookings, bookingForm.roomId, start, end);
    if (hasConflict) {
      setConflictError('เวลานี้มีการจองอยู่แล้ว กรุณาเลือกเวลาอื่น');
      return;
    }

    const room = MOCK_ROOMS.find(r => r.id === bookingForm.roomId);
    setPendingBooking({
      subject: bookingForm.subject,
      userId: user.uid,
      userName: user.displayName,
      userEmail: user.email,
      userPhone: bookingForm.phone,
      department: user.department,
      roomId: bookingForm.roomId,
      roomName: room?.name || '',
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      status: 'approved',
    });

    setIsBookingModalOpen(false);
    setIsSummaryModalOpen(true);
  };

  const handleConfirmBooking = async () => {
    if (!pendingBooking) return;
    try {
      await dbService.addBooking(pendingBooking);
      setIsSummaryModalOpen(false);
      setIsSuccessModalOpen(true);
    } catch (error) {
      console.error('Booking failed:', error);
      setConflictError('เกิดข้อผิดพลาดในการจอง กรุณาลองใหม่อีกครั้ง');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="w-16 h-16 border-4 border-brand-600 border-t-transparent rounded-full mb-4"
        />
        <p className="text-surface-400 font-medium animate-pulse">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-100 p-4 overflow-hidden relative">
        {/* Background Decorative Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-200/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-400/20 rounded-full blur-[120px]" />

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="bg-white/80 backdrop-blur-xl p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl max-w-lg w-full text-center border border-white/40 relative z-10"
        >
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-brand-600 rounded-2xl sm:rounded-[2rem] flex items-center justify-center mx-auto mb-8 sm:mb-10 shadow-xl shadow-brand-600/30 rotate-3">
            <CalendarIcon size={40} className="text-white sm:w-12 sm:h-12" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 text-surface-900">ระบบจองห้องประชุม</h1>
          <p className="text-lg sm:text-xl text-surface-500 mb-2 font-medium">สำนักพัฒนาการเรียนรู้</p>
          <p className="text-[10px] sm:text-sm text-surface-400 mb-8 sm:mb-12 uppercase tracking-[0.2em]">Learning Development Office</p>
          
          {loginError && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 sm:mb-8 p-4 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center gap-3 text-sm font-bold border border-red-100 shadow-sm"
            >
              <AlertCircle size={20} />
              {loginError}
            </motion.div>
          )}
          
          <Button onClick={handleLogin} className="w-full py-4 sm:py-5 text-lg sm:text-xl shadow-2xl hover:scale-[1.02] active:scale-95">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 sm:w-6 sm:h-6" alt="Google" />
            เข้าสู่ระบบด้วย Google
          </Button>
          
          <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-surface-100">
            <p className="text-[10px] sm:text-xs text-surface-400 leading-relaxed">
              การเข้าสู่ระบบแสดงว่าคุณยอมรับ <br/>
              <span className="underline cursor-pointer">ข้อกำหนดการใช้งาน</span> และ <span className="underline cursor-pointer">นโยบายความเป็นส่วนตัว</span>
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-surface-100 px-4 sm:px-8 py-3 sm:py-5 flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center justify-between w-full sm:w-auto gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="bg-brand-600 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl shadow-lg shadow-brand-600/20">
              <CalendarIcon className="text-white w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg sm:text-xl leading-tight text-surface-900">ระบบจองห้องประชุม</h2>
              <p className="text-[10px] text-surface-400 font-semibold uppercase tracking-widest">LDO Booking System</p>
            </div>
          </div>
          
          <div className="flex sm:hidden items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold border border-white shadow-sm overflow-hidden">
              {user.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : <UserIcon size={16} />}
            </div>
            <button 
              onClick={handleLogout} 
              className="bg-white p-1.5 rounded-full shadow-md text-surface-400 hover:text-red-500 transition-colors border border-surface-100"
            >
              <LogOut size={12} />
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <nav className="flex bg-surface-100 p-1 rounded-xl sm:rounded-2xl overflow-x-auto max-w-[calc(100vw-2rem)] no-scrollbar">
            <button 
              onClick={() => setView('calendar')}
              className={`px-4 sm:px-8 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${view === 'calendar' ? 'bg-white shadow-md text-brand-600' : 'text-surface-500 hover:text-surface-700'}`}
            >
              ปฏิทิน
            </button>
            <button 
              onClick={() => setView('my-bookings')}
              className={`px-4 sm:px-8 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${view === 'my-bookings' ? 'bg-white shadow-md text-brand-600' : 'text-surface-500 hover:text-surface-700'}`}
            >
              การจอง
            </button>
            <button 
              onClick={handleAdminAccess}
              className={`px-4 sm:px-8 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${view === 'admin' ? 'bg-white shadow-md text-brand-600' : 'text-surface-500 hover:text-surface-700'}`}
            >
              Admin
            </button>
          </nav>

          <div className="hidden sm:flex items-center gap-3 sm:gap-4 sm:pl-6 sm:border-l border-surface-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-surface-900">{user.displayName}</p>
              <p className="text-xs text-surface-400 font-medium">{user.email}</p>
            </div>
            <div className="relative group">
              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold border-2 border-white shadow-sm overflow-hidden">
                {user.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : <UserIcon size={20} />}
              </div>
              <button 
                onClick={handleLogout} 
                className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full shadow-md text-surface-400 hover:text-red-500 transition-colors border border-surface-100"
              >
                <LogOut size={12} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-7xl mx-auto">
        {view === 'calendar' ? (
          <CalendarView 
            currentDate={currentDate} 
            onPrev={handlePrevMonth} 
            onNext={handleNextMonth}
            onPrevYear={handlePrevYear}
            onNextYear={handleNextYear}
            onMonthChange={handleMonthChange}
            onYearChange={handleYearChange}
            bookings={bookings}
            onSlotClick={openBookingModal}
          />
        ) : view === 'my-bookings' ? (
          <MyBookingsView bookings={bookings} currentUser={user} />
        ) : (
          <AdminDashboard bookings={bookings} />
        )}
      </main>

      {/* Booking Modal */}
      <Modal 
        isOpen={isBookingModalOpen} 
        onClose={() => setIsBookingModalOpen(false)}
        title="จองห้องประชุม"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-surface-400 uppercase tracking-widest ml-1">ผู้จอง</label>
              <div className="flex items-center gap-3 p-4 bg-surface-50 rounded-2xl border border-surface-100">
                <UserIcon size={18} className="text-brand-600" />
                <span className="text-sm font-semibold text-surface-700">{user.displayName}</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-surface-400 uppercase tracking-widest ml-1">หน่วยงาน</label>
              <div className="flex items-center gap-3 p-4 bg-surface-50 rounded-2xl border border-surface-100">
                <Building2 size={18} className="text-brand-600" />
                <span className="text-sm font-semibold text-surface-700">{user.department}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-surface-400 uppercase tracking-widest ml-1">หัวข้อการประชุม</label>
            <div className="relative">
              <input 
                type="text"
                placeholder="ระบุเรื่องที่ต้องการประชุม..."
                className="w-full p-4 pl-12 rounded-2xl border border-surface-200 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-600 outline-none transition-all bg-white font-medium text-black"
                value={bookingForm.subject}
                onChange={e => setBookingForm({ ...bookingForm, subject: e.target.value })}
              />
              <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-300" size={20} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-surface-400 uppercase tracking-widest ml-1">เบอร์โทรศัพท์ติดต่อ (เบอร์ภายใน 4 หลัก)</label>
            <div className="relative">
              <input 
                type="tel"
                readOnly
                placeholder="ไม่มีข้อมูลเบอร์ภายใน"
                className="w-full p-4 pl-12 rounded-2xl border border-surface-200 bg-surface-50 font-medium text-surface-600 cursor-not-allowed outline-none"
                value={bookingForm.phone}
              />
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-300" size={20} />
            </div>
            {!bookingForm.phone && (
              <p className="text-[10px] text-red-500 font-medium ml-1">* ไม่พบข้อมูลเบอร์ภายในในระบบ กรุณาติดต่อผู้ดูแลระบบ</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-surface-400 uppercase tracking-widest ml-1">วันที่จอง</label>
            <div className="flex items-center gap-3 p-4 bg-surface-50 rounded-2xl border border-surface-100">
              <CalendarIcon size={18} className="text-brand-600" />
              <span className="text-sm font-semibold text-surface-700">
                {selectedSlot && selectedSlot.date.toLocaleDateString('th-TH', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-surface-400 uppercase tracking-widest ml-1">ห้องประชุม</label>
            <div className="p-4 bg-brand-50 rounded-2xl border border-brand-100 text-sm font-bold text-brand-700 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-brand-600 animate-pulse" />
              {MOCK_ROOMS.find(r => r.id === bookingForm.roomId)?.name || MOCK_ROOMS[0].name}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-surface-400 uppercase tracking-widest ml-1">เวลาเริ่ม</label>
              <input 
                type="time"
                step="1800"
                className="w-full p-4 rounded-2xl border border-surface-200 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-500/10 bg-white font-medium text-black"
                value={bookingForm.startTime}
                onChange={e => setBookingForm({ ...bookingForm, startTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-surface-400 uppercase tracking-widest ml-1">เวลาสิ้นสุด</label>
              <input 
                type="time"
                step="1800"
                className="w-full p-4 rounded-2xl border border-surface-200 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-500/10 bg-white font-medium text-black"
                value={bookingForm.endTime}
                onChange={e => setBookingForm({ ...bookingForm, endTime: e.target.value })}
              />
            </div>
          </div>

          {conflictError && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 text-sm font-semibold border border-red-100"
            >
              <AlertCircle size={20} />
              {conflictError}
            </motion.div>
          )}

          <div className="pt-6 flex gap-4">
            <Button variant="secondary" className="flex-1" onClick={() => setIsBookingModalOpen(false)}>ยกเลิก</Button>
            <Button className="flex-1" onClick={handleBookingCheck} disabled={!bookingForm.subject}>
              ยืนยันข้อมูล
            </Button>
          </div>
        </div>
      </Modal>

      {/* Summary Modal */}
      <Modal 
        isOpen={isSummaryModalOpen} 
        onClose={() => setIsSummaryModalOpen(false)}
        title="สรุปการจอง"
      >
        {pendingBooking && (
          <div className="space-y-6">
            <div className="bg-brand-50/50 p-6 rounded-[2rem] space-y-4 border border-brand-100">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-surface-400 uppercase tracking-widest">เรื่อง</span>
                <span className="text-lg font-black text-brand-700">{pendingBooking.subject}</span>
              </div>
              <div className="h-px bg-brand-100 w-full" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">ผู้จอง</span>
                  <p className="text-sm font-bold text-surface-700">{pendingBooking.userName}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">เบอร์โทร</span>
                  <p className="text-sm font-bold text-surface-700">{pendingBooking.userPhone}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">ห้อง</span>
                  <p className="text-sm font-bold text-brand-600">{pendingBooking.roomName}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">วันที่</span>
                  <p className="text-sm font-bold text-surface-700">
                    {new Date(pendingBooking.startTime).toLocaleDateString('th-TH', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
              <div className="h-px bg-brand-100 w-full" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-surface-400 uppercase tracking-widest">เวลา</span>
                <div className="bg-white px-4 py-2 rounded-xl border border-brand-100 text-brand-600 font-black text-lg">
                  {new Date(pendingBooking.startTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - 
                  {new Date(pendingBooking.endTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <Button variant="secondary" className="flex-1" onClick={() => {
                setIsSummaryModalOpen(false);
                setIsBookingModalOpen(true);
              }}>แก้ไข</Button>
              <Button className="flex-1" onClick={handleConfirmBooking}>ยืนยันการจอง</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Admin Password Modal */}
      <Modal 
        isOpen={isAdminPasswordModalOpen} 
        onClose={() => setIsAdminPasswordModalOpen(false)}
        title="Admin Access"
      >
        <div className="space-y-6">
          <div className="w-20 h-20 bg-brand-50 rounded-[2rem] flex items-center justify-center mx-auto text-brand-600">
            <LayoutDashboard size={40} />
          </div>
          <div className="text-center space-y-2">
            <h4 className="text-lg font-bold text-surface-900">ยืนยันตัวตนผู้ดูแลระบบ</h4>
            <p className="text-sm text-surface-400 font-medium">กรุณากรอกรหัสผ่านเพื่อเข้าสู่ระบบ Admin</p>
          </div>
          <div className="space-y-2">
            <input 
              type="password"
              placeholder="••••••••"
              className={`w-full p-4 rounded-2xl border text-center text-2xl tracking-[0.5em] text-black ${adminPasswordError ? 'border-red-500 bg-red-50' : 'border-surface-200 bg-surface-50'} outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-500/10 transition-all`}
              value={adminPassword}
              onChange={e => {
                setAdminPassword(e.target.value);
                setAdminPasswordError(false);
              }}
              onKeyDown={e => e.key === 'Enter' && handleAdminPasswordSubmit()}
            />
            {adminPasswordError && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-500 font-bold text-center"
              >
                รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง
              </motion.p>
            )}
          </div>
          <Button className="w-full py-4 text-lg" onClick={handleAdminPasswordSubmit}>เข้าสู่ระบบ</Button>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal 
        isOpen={isSuccessModalOpen} 
        onClose={() => setIsSuccessModalOpen(false)}
        title="จองสำเร็จ"
      >
        <div className="text-center space-y-6 py-4">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 12 }}
            className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500 shadow-inner"
          >
            <CheckCircle2 size={48} />
          </motion.div>
          <div className="space-y-2">
            <h4 className="text-3xl font-black text-surface-900">การจองสมบูรณ์!</h4>
            <p className="text-surface-500 font-medium px-4">ข้อมูลถูกบันทึกเรียบร้อยแล้ว ระบบได้ส่งอีเมลยืนยันไปยังกล่องข้อความของคุณ</p>
          </div>
          <Button className="w-full py-4 text-lg" onClick={() => setIsSuccessModalOpen(false)}>กลับหน้าหลัก</Button>
        </div>
      </Modal>
    </div>
  );
}

// --- Sub-Views ---

function CalendarView({ currentDate, onPrev, onNext, onPrevYear, onNextYear, onMonthChange, onYearChange, bookings, onSlotClick }: any) {
  const [viewType, setViewType] = useState<'month' | 'week'>('month');
  
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const dayNames = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

  const pastelColors = [
    'bg-brand-50 text-brand-700 border-brand-100',
    'bg-emerald-50 text-emerald-700 border-emerald-100',
    'bg-violet-50 text-violet-700 border-violet-100',
    'bg-amber-50 text-amber-700 border-amber-100',
    'bg-rose-50 text-rose-700 border-rose-100'
  ];

  return (
    <div className="bg-white rounded-[3rem] shadow-premium border border-surface-100 overflow-hidden">
      <div className="p-6 sm:p-10 flex flex-col lg:flex-row justify-between items-center gap-6 sm:gap-8 border-b border-surface-50 bg-surface-50/30">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
          <h3 className="text-3xl sm:text-5xl font-bold text-black">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear() + 543}</h3>
          <div className="flex gap-2 sm:gap-4">
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">เดือน</span>
              <div className="relative">
                <select 
                  value={currentDate.getMonth()}
                  onChange={(e) => onMonthChange(parseInt(e.target.value))}
                  className="appearance-none bg-white border border-surface-200 rounded-xl sm:rounded-2xl px-4 sm:px-6 py-2 sm:py-3 pr-10 sm:pr-12 text-sm sm:text-lg font-bold text-brand-600 shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all cursor-pointer"
                >
                  {monthNames.map((name, idx) => (
                    <option key={idx} value={idx}>{name}</option>
                  ))}
                </select>
                <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-brand-600">
                  <ChevronRight size={16} className="rotate-90" />
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">ปี</span>
              <div className="relative">
                <select 
                  value={currentDate.getFullYear()}
                  onChange={(e) => onYearChange(parseInt(e.target.value))}
                  className="appearance-none bg-white border border-surface-200 rounded-xl sm:rounded-2xl px-4 sm:px-6 py-2 sm:py-3 pr-10 sm:pr-12 text-sm sm:text-lg font-bold text-surface-700 shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all cursor-pointer"
                >
                  {[2026, 2027, 2028, 2029, 2030, 2031, 2032].map((year) => (
                    <option key={year} value={year}>{year + 543}</option>
                  ))}
                </select>
                <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-surface-400">
                  <ChevronRight size={16} className="rotate-90" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex bg-surface-100 p-1 rounded-xl sm:rounded-2xl">
          <button 
            onClick={() => setViewType('month')}
            className={`px-4 sm:px-8 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all ${viewType === 'month' ? 'bg-white shadow-md text-brand-600' : 'text-surface-500'}`}
          >
            รายเดือน
          </button>
          <button 
            onClick={() => setViewType('week')}
            className={`px-4 sm:px-8 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all ${viewType === 'week' ? 'bg-white shadow-md text-brand-600' : 'text-surface-500'}`}
          >
            รายสัปดาห์
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-8 lg:p-12">
        <div className="calendar-grid mb-4 sm:mb-6">
          {dayNames.map(d => (
            <div key={d} className="text-center text-[10px] sm:text-sm font-black text-black py-2 sm:py-4 uppercase tracking-tighter sm:tracking-[0.1em]">{d}</div>
          ))}
        </div>

        <div className="calendar-grid gap-1 sm:gap-4">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square bg-surface-50/50 rounded-xl sm:rounded-3xl border border-dashed border-surface-100"></div>
          ))}
          
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const isToday = new Date().toDateString() === date.toDateString();
            
            const dayBookings = bookings.filter((b: Booking) => {
              const bDate = new Date(b.startTime);
              return bDate.getDate() === day && bDate.getMonth() === currentDate.getMonth() && bDate.getFullYear() === currentDate.getFullYear() && b.status === 'approved';
            }).sort((a: Booking, b: Booking) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

            return (
              <motion.div 
                key={day} 
                whileHover={{ y: -4, scale: 1.02 }}
                onClick={() => onSlotClick(date, MOCK_ROOMS[0].id)}
                className={`min-h-[80px] sm:min-h-[140px] p-1.5 sm:p-4 rounded-xl sm:rounded-3xl border transition-all cursor-pointer group relative ${isToday ? 'border-brand-600 bg-brand-50/30' : 'border-surface-100 bg-white hover:border-brand-300 hover:shadow-xl'}`}
              >
                <div className="flex justify-between items-start mb-1 sm:mb-3">
                  <span className={`text-sm sm:text-xl font-black w-6 h-6 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg sm:rounded-2xl transition-all ${isToday ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' : 'text-black group-hover:text-brand-600'}`}>
                    {day}
                  </span>
                  <div className="hidden sm:flex w-8 h-8 bg-brand-50 rounded-xl items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-brand-600">
                    <Plus size={18} />
                  </div>
                </div>
                
                <div className="space-y-1 sm:space-y-2">
                  {dayBookings.map((b: Booking, idx: number) => (
                    <div 
                      key={b.id} 
                      className={`${pastelColors[idx % 5]} text-[8px] sm:text-xs p-1 sm:p-2.5 rounded-md sm:rounded-xl truncate border shadow-sm font-bold flex items-center gap-1 sm:gap-2`}
                      title={`${b.userName} | ${b.department}`}
                    >
                      <Clock size={8} className="sm:w-3 sm:h-3" />
                      <span className="hidden sm:inline">{new Date(b.startTime).getHours()}:{new Date(b.startTime).getMinutes().toString().padStart(2, '0')}</span>
                      <span className="hidden sm:inline opacity-60">|</span>
                      <span>{b.userName}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MyBookingsView({ bookings, currentUser }: { bookings: Booking[], currentUser: User }) {
  const myBookings = bookings
    .filter(b => b.userEmail.toLowerCase() === currentUser.email.toLowerCase())
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  
  console.log('My Bookings for', currentUser.email, ':', myBookings);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState<string | null>(null);

  const handleCancel = async (id: string) => {
    try {
      await dbService.updateBookingStatus(id, 'cancelled');
      setIsCancelConfirmOpen(null);
    } catch (error) {
      console.error('Cancel failed:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h3 className="text-2xl sm:text-4xl font-black flex items-center gap-3 text-black">
          <div className="p-2 bg-brand-100 rounded-xl text-brand-600">
            <CalendarIcon size={24} className="sm:w-7 sm:h-7" />
          </div>
          การจองของฉัน
        </h3>
        <p className="text-sm sm:text-base text-black font-medium ml-10 sm:ml-12">รายการจองห้องประชุมทั้งหมดของคุณ</p>
      </div>

      <div className="bg-white rounded-3xl sm:rounded-[3rem] shadow-premium border border-surface-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-50/50 border-b border-surface-100">
                <th className="px-8 py-6 text-sm font-black text-black uppercase tracking-[0.2em]">สถานะ</th>
                <th className="px-8 py-6 text-sm font-black text-black uppercase tracking-[0.2em]">วันที่ / เวลา</th>
                <th className="px-8 py-6 text-sm font-black text-black uppercase tracking-[0.2em]">เรื่อง</th>
                <th className="px-8 py-6 text-sm font-black text-black uppercase tracking-[0.2em]">ห้อง</th>
                <th className="px-8 py-6 text-sm font-black text-black uppercase tracking-[0.2em]">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-50">
              {myBookings.length > 0 ? myBookings.map((b: Booking) => (
                <tr key={b.id} className="hover:bg-brand-50/20 transition-colors group">
                  <td className="px-8 py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 ${b.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${b.status === 'approved' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {b.status === 'approved' ? 'อนุมัติ' : 'ยกเลิก'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold text-black">{new Date(b.startTime).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      <span className="text-xs text-surface-400 font-bold flex items-center gap-1.5">
                        <Clock size={12} className="text-brand-400" />
                        {new Date(b.startTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - {new Date(b.endTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-sm text-surface-600 font-medium line-clamp-1 max-w-[200px]">{b.subject}</span>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-sm font-black text-brand-600 bg-brand-50 px-3 py-1 rounded-lg border border-brand-100">{b.roomName}</span>
                  </td>
                  <td className="px-8 py-6">
                    {b.status === 'approved' && (
                      <button 
                        title="ยกเลิกการจอง"
                        className="p-2.5 text-surface-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-surface-100 hover:border-rose-100"
                        onClick={() => setIsCancelConfirmOpen(b.id)}
                      >
                        <X size={20} />
                      </button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-4 text-surface-300">
                      <CalendarIcon size={64} className="opacity-20" />
                      <p className="text-lg font-bold italic">คุณยังไม่มีรายการจอง</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      <Modal 
        isOpen={!!isCancelConfirmOpen} 
        onClose={() => setIsCancelConfirmOpen(null)}
        title="ยืนยันการยกเลิก"
      >
        <div className="text-center space-y-6 py-4">
          <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center mx-auto text-rose-500">
            <AlertCircle size={40} />
          </div>
          <div className="space-y-2">
            <h4 className="text-xl font-bold text-surface-900">คุณแน่ใจหรือไม่?</h4>
            <p className="text-surface-500 font-medium px-4">การยกเลิกการจองไม่สามารถย้อนกลับได้ ข้อมูลจะถูกเปลี่ยนสถานะเป็น "ยกเลิก" ทันที</p>
          </div>
          <div className="flex gap-4">
            <Button variant="secondary" className="flex-1" onClick={() => setIsCancelConfirmOpen(null)}>ไม่ยกเลิก</Button>
            <Button variant="danger" className="flex-1" onClick={() => isCancelConfirmOpen && handleCancel(isCancelConfirmOpen)}>ยืนยันยกเลิก</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function StaffDatabaseView() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const unsubscribe = dbService.subscribeToStaffData((data) => {
      // Sort by code
      const sorted = [...data].sort((a, b) => a.code.localeCompare(b.code));
      setStaffList(sorted);
    });
    return () => unsubscribe();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadProgress(0);
    }
  };

  const handleUploadConfirm = () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim().replace(/^\uFEFF/, ''),
      complete: async (results) => {
        const rawData = results.data;
        
        const parsedData = rawData.map((row: any) => {
          // Helper to find value by keyword in keys
          const getValueByKeywords = (keywords: string[]) => {
            const foundKey = Object.keys(row).find(key => 
              keywords.some(kw => key.toLowerCase().includes(kw.toLowerCase()))
            );
            return foundKey ? String(row[foundKey] || '').trim() : '';
          };

          return {
            code: getValueByKeywords(['รหัส', 'code', 'id']),
            name: getValueByKeywords(['ชื่อ-นามสกุล', 'ชื่อ', 'name']),
            department: getValueByKeywords(['หน่วยงาน', 'department', 'สังกัด']),
            phone: getValueByKeywords(['โทรศัพท์', 'การติดต่อ', 'เบอร์', 'phone', 'tel']),
            position: getValueByKeywords(['ตำแหน่ง', 'position']),
            email: getValueByKeywords(['อีเมล', 'email', 'mail']),
          };
        }).filter(s => s.code && s.name);

        if (parsedData.length === 0) {
          console.log('Raw data sample:', rawData[0]);
          alert('ไม่พบข้อมูลที่ถูกต้องในไฟล์ CSV\n\nคำแนะนำ:\n1. ตรวจสอบว่าไฟล์มีหัวข้อคอลัมน์ "รหัส" และ "ชื่อ-นามสกุล"\n2. หากยังไม่ได้ผล ลองบันทึกไฟล์เป็น "CSV UTF-8 (Comma delimited)" ใน Excel');
          setUploading(false);
          return;
        }

        try {
          // Upload in chunks to show progress while being efficient
          const total = parsedData.length;
          const chunkSize = 10;
          for (let i = 0; i < total; i += chunkSize) {
            const chunk = parsedData.slice(i, i + chunkSize);
            await dbService.updateStaffDatabase(chunk);
            setUploadProgress(Math.min(100, Math.round(((i + chunkSize) / total) * 100)));
          }
          
          alert('อัปโหลดข้อมูลสำเร็จ');
          setSelectedFile(null);
          setUploadProgress(0);
          // Automatic refresh as requested
          window.location.reload();
        } catch (error) {
          console.error('Upload failed:', error);
          alert('เกิดข้อผิดพลาดในการอัปโหลด');
        } finally {
          setUploading(false);
        }
      },
      error: (error) => {
        console.error('Parse error:', error);
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์ CSV');
        setUploading(false);
      }
    });
  };

  const getExtension = (phoneStr: string) => {
    if (!phoneStr) return '-';
    // Look for a standalone 4-digit sequence
    const match = phoneStr.match(/\b\d{4}\b/);
    return match ? match[0] : phoneStr;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-surface-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h4 className="text-xl font-black text-black">ฐานข้อมูลอาจารย์</h4>
            <p className="text-sm text-surface-500 font-medium">อัปโหลดและจัดการข้อมูลรายชื่ออาจารย์และบุคลากร (ไฟล์ CSV)</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-upload"
                disabled={uploading}
              />
              <label
                htmlFor="csv-upload"
                className={`flex items-center gap-2 px-6 py-3 bg-surface-100 text-surface-700 rounded-2xl font-black text-sm cursor-pointer hover:bg-surface-200 transition-all border border-surface-200 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Search size={18} />
                {selectedFile ? 'เปลี่ยนไฟล์' : 'เลือกไฟล์ CSV'}
              </label>
            </div>

            {selectedFile && (
              <Button 
                onClick={handleUploadConfirm} 
                disabled={uploading}
                className="bg-brand-600 text-white"
              >
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload size={18} />
                )}
                {uploading ? 'กำลังอัปโหลด...' : 'เริ่มอัปโหลด'}
              </Button>
            )}
          </div>
        </div>

        {selectedFile && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-brand-50 rounded-2xl border border-brand-100 space-y-3"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg text-brand-600 shadow-sm">
                  <Upload size={16} />
                </div>
                <div>
                  <p className="text-sm font-black text-brand-900">{selectedFile.name}</p>
                  <p className="text-[10px] text-brand-500 font-bold uppercase tracking-widest">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              {uploading && (
                <span className="text-sm font-black text-brand-600">{uploadProgress}%</span>
              )}
            </div>

            <div className="h-2 w-full bg-brand-200/30 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-brand-600"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </div>

      <div className="bg-white rounded-3xl sm:rounded-[3rem] shadow-premium border border-surface-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-50/50 border-b border-surface-100">
                <th className="px-8 py-6 text-sm font-black text-black uppercase tracking-[0.2em]">รหัส</th>
                <th className="px-8 py-6 text-sm font-black text-black uppercase tracking-[0.2em]">ชื่อ-นามสกุล</th>
                <th className="px-8 py-6 text-sm font-black text-black uppercase tracking-[0.2em]">หน่วยงาน</th>
                <th className="px-8 py-6 text-sm font-black text-black uppercase tracking-[0.2em]">การติดต่อ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-50">
              {staffList.length > 0 ? staffList.map((s) => (
                <tr key={s.id} className="hover:bg-brand-50/20 transition-colors group">
                  <td className="px-8 py-6">
                    <span className="text-sm font-black text-brand-600">{s.code}</span>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-sm font-black text-surface-900">{s.name}</span>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-sm font-bold text-surface-600">{s.department}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-black text-surface-900 bg-surface-50 px-3 py-1 rounded-lg border border-surface-100 w-fit">
                        {getExtension(s.phone)}
                      </span>
                      {s.email && (
                        <span className="text-xs font-bold text-brand-600 px-1">
                          {s.email}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-4 text-surface-300">
                      <Users size={64} className="opacity-20" />
                      <p className="text-lg font-bold italic">ยังไม่มีข้อมูลในฐานข้อมูล</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ bookings }: any) {
  const [activeTab, setActiveTab] = useState<'bookings' | 'users' | 'staff'>('bookings');
  
  // Calculate current academic year (Aug - Jul)
  const now = new Date();
  const currentAcademicYear = now.getMonth() >= 7 ? now.getFullYear() + 543 : now.getFullYear() + 542;

  const [filter, setFilter] = useState({
    year: currentAcademicYear.toString(),
    month: 'all',
    status: 'all'
  });

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchUser, setSearchUser] = useState('');

  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const allUsers = await dbService.getAllUsers();
      if (allUsers) setUsers(allUsers);
    } catch (error) {
      console.error('Fetch users failed:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const filteredBookings = bookings
    .filter((b: Booking) => {
      const bDate = new Date(b.startTime);
      // Academic Year Logic: Aug - Jul
      const bYear = bDate.getMonth() >= 7 ? bDate.getFullYear() + 543 : bDate.getFullYear() + 542;
      
      if (filter.year !== 'all' && bYear.toString() !== filter.year) return false;
      if (filter.month !== 'all' && bDate.getMonth().toString() !== filter.month) return false;
      if (filter.status !== 'all' && b.status !== filter.status) return false;
      return true;
    })
    .sort((a: Booking, b: Booking) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(searchUser.toLowerCase()) || 
    u.email.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.department.toLowerCase().includes(searchUser.toLowerCase())
  );

  const handleCancel = async (id: string) => {
    try {
      await dbService.updateBookingStatus(id, 'cancelled');
      setIsCancelConfirmOpen(null);
    } catch (error) {
      console.error('Cancel failed:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await dbService.deleteBooking(id);
      setIsDeleteConfirmOpen(null);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6">
        <div className="space-y-1">
          <h3 className="text-2xl sm:text-4xl font-black flex items-center gap-3 text-black">
            <div className="p-2 bg-brand-100 rounded-xl text-brand-600">
              <LayoutDashboard size={24} className="sm:w-7 sm:h-7" />
            </div>
            Dashboard Admin
          </h3>
          <p className="text-sm sm:text-base text-black font-medium ml-10 sm:ml-12">จัดการข้อมูลการจองและสิทธิ์ผู้ใช้งาน</p>
        </div>

        <div className="flex bg-surface-100 p-1 rounded-xl sm:rounded-2xl border border-surface-200 w-full sm:w-auto">
          <button 
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'bookings' ? 'bg-white text-brand-600 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}
            onClick={() => setActiveTab('bookings')}
          >
            <CalendarIcon size={14} className="sm:w-4 sm:h-4" />
            รายการจอง
          </button>
          <button 
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'users' ? 'bg-white text-brand-600 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={14} className="sm:w-4 sm:h-4" />
            จัดการสิทธิ์
          </button>
          <button 
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'staff' ? 'bg-white text-brand-600 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}
            onClick={() => setActiveTab('staff')}
          >
            <Building2 size={14} className="sm:w-4 sm:h-4" />
            ฐานข้อมูลอาจารย์
          </button>
        </div>
      </div>

      {activeTab === 'bookings' ? (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3 sm:gap-4 w-full lg:w-auto">
            <div className="flex-1 sm:flex-none flex items-center gap-2 bg-white p-1 rounded-xl sm:rounded-2xl border border-surface-100 shadow-sm">
              <select 
                className="w-full bg-transparent px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold outline-none text-surface-700"
                value={filter.year}
                onChange={e => setFilter({ ...filter, year: e.target.value })}
              >
                {[currentAcademicYear - 1, currentAcademicYear, currentAcademicYear + 1, currentAcademicYear + 2].map(y => (
                  <option key={y} value={y.toString()}>ปีการศึกษา {y}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 sm:flex-none flex items-center gap-2 bg-white p-1 rounded-xl sm:rounded-2xl border border-surface-100 shadow-sm">
              <select 
                className="w-full bg-transparent px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold outline-none text-surface-700"
                value={filter.month}
                onChange={e => setFilter({ ...filter, month: e.target.value })}
              >
                <option value="all">ทุกเดือน</option>
                {["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"].map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-3xl sm:rounded-[3rem] shadow-premium border border-surface-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-50/50 border-b border-surface-100">
                    <th className="px-8 py-6 text-sm font-black text-black uppercase tracking-[0.2em]">สถานะ</th>
                    <th className="px-8 py-6 text-sm font-black text-black uppercase tracking-[0.2em]">วันที่ / เวลา</th>
                    <th className="px-8 py-6 text-sm font-black text-black uppercase tracking-[0.2em]">ผู้จอง</th>
                    <th className="px-8 py-6 text-sm font-black text-black uppercase tracking-[0.2em]">เรื่อง</th>
                    <th className="px-8 py-6 text-sm font-black text-black uppercase tracking-[0.2em]">ห้อง</th>
                    <th className="px-8 py-6 text-sm font-black text-black uppercase tracking-[0.2em]">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-50">
                  {filteredBookings.length > 0 ? filteredBookings.map((b: Booking) => (
                    <tr key={b.id} className="hover:bg-brand-50/20 transition-colors group">
                      <td className="px-8 py-6">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 ${b.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${b.status === 'approved' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {b.status === 'approved' ? 'อนุมัติ' : 'ยกเลิก'}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-black">{new Date(b.startTime).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                          <span className="text-xs text-surface-400 font-bold flex items-center gap-1.5">
                            <Clock size={12} className="text-brand-400" />
                            {new Date(b.startTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - {new Date(b.endTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-black text-surface-900">{b.userName}</span>
                          <span className="text-xs text-surface-400 font-bold">{b.department}</span>
                          <span className="text-[10px] text-brand-600 font-black mt-1">{b.userPhone}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-sm text-surface-600 font-medium line-clamp-1 max-w-[200px]">{b.subject}</span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-sm font-black text-brand-600 bg-brand-50 px-3 py-1 rounded-lg border border-brand-100">{b.roomName}</span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex gap-2 transition-all">
                          <button 
                            title="ติดต่อผู้จอง"
                            className="p-2.5 text-surface-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all border border-surface-100 hover:border-brand-100"
                            onClick={() => {
                              window.location.href = `mailto:${b.userEmail}?subject=แจ้งข้อมูลการจองห้องประชุม: ${b.subject}`;
                            }}
                          >
                            <Mail size={20} />
                          </button>
                          {b.status === 'approved' && (
                            <button 
                              title="ยกเลิกการจอง"
                              className="p-2.5 text-surface-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-surface-100 hover:border-rose-100"
                              onClick={() => setIsCancelConfirmOpen(b.id)}
                            >
                              <X size={20} />
                            </button>
                          )}
                          <button 
                            title="ลบรายการจอง"
                            className="p-2.5 text-surface-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-surface-100 hover:border-rose-100"
                            onClick={() => setIsDeleteConfirmOpen(b.id)}
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="px-8 py-32 text-center">
                        <div className="flex flex-col items-center gap-4 text-surface-300">
                          <CalendarIcon size={64} className="opacity-20" />
                          <p className="text-lg font-bold italic">ไม่พบข้อมูลการจองในส่วนนี้</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'users' ? (
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="relative w-full lg:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" size={18} />
              <input 
                type="text"
                placeholder="ค้นหาชื่อ, อีเมล หรือหน่วยงาน..."
                className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-surface-100 shadow-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-500/5 transition-all font-bold text-sm text-black"
                value={searchUser}
                onChange={e => setSearchUser(e.target.value)}
              />
            </div>
            <p className="text-xs font-bold text-surface-400">พบผู้ใช้งานทั้งหมด {filteredUsers.length} ท่าน</p>
          </div>

          <div className="bg-white rounded-[3rem] shadow-premium border border-surface-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-50/50 border-b border-surface-100">
                    <th className="px-8 py-6 text-sm font-black text-black uppercase tracking-[0.2em]">ข้อมูลผู้ใช้งาน</th>
                    <th className="px-8 py-6 text-sm font-black text-black uppercase tracking-[0.2em]">หน่วยงาน / ตำแหน่ง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-50">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={2} className="px-8 py-32 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-12 h-12 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin" />
                          <p className="text-sm font-bold text-surface-400">กำลังโหลดข้อมูลผู้ใช้งาน...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length > 0 ? filteredUsers.map((u: User) => (
                    <tr key={u.uid} className="hover:bg-brand-50/20 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center text-surface-400 font-black">
                            {u.displayName.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-surface-900">{u.displayName}</span>
                            <span className="text-xs text-surface-400 font-bold">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold text-surface-700">{u.department}</span>
                          <span className="text-xs text-surface-400 font-medium">{u.position || '-'}</span>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={2} className="px-8 py-32 text-center">
                        <div className="flex flex-col items-center gap-4 text-surface-300">
                          <Users size={64} className="opacity-20" />
                          <p className="text-lg font-bold italic">ไม่พบข้อมูลผู้ใช้งาน</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <StaffDatabaseView />
      )}

      {/* Cancel Confirmation Modal */}
      <Modal 
        isOpen={!!isCancelConfirmOpen} 
        onClose={() => setIsCancelConfirmOpen(null)}
        title="ยืนยันการยกเลิก"
      >
        <div className="text-center space-y-6 py-4">
          <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center mx-auto text-rose-500">
            <AlertCircle size={40} />
          </div>
          <div className="space-y-2">
            <h4 className="text-xl font-bold text-surface-900">คุณแน่ใจหรือไม่?</h4>
            <p className="text-surface-500 font-medium px-4">การยกเลิกการจองไม่สามารถย้อนกลับได้ ข้อมูลจะถูกเปลี่ยนสถานะเป็น "ยกเลิก" ทันที</p>
          </div>
          <div className="flex gap-4">
            <Button variant="secondary" className="flex-1" onClick={() => setIsCancelConfirmOpen(null)}>ไม่ยกเลิก</Button>
            <Button variant="danger" className="flex-1" onClick={() => isCancelConfirmOpen && handleCancel(isCancelConfirmOpen)}>ยืนยันยกเลิก</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={!!isDeleteConfirmOpen} 
        onClose={() => setIsDeleteConfirmOpen(null)}
        title="ยืนยันการลบรายการ"
      >
        <div className="text-center space-y-6 py-4">
          <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center mx-auto text-rose-500">
            <Trash2 size={40} />
          </div>
          <div className="space-y-2">
            <h4 className="text-xl font-bold text-surface-900">คุณแน่ใจหรือไม่?</h4>
            <p className="text-surface-500 font-medium px-4">การลบรายการจองจะลบข้อมูลออกจากระบบอย่างถาวรและไม่สามารถกู้คืนได้</p>
          </div>
          <div className="flex gap-4">
            <Button variant="secondary" className="flex-1" onClick={() => setIsDeleteConfirmOpen(null)}>ยกเลิก</Button>
            <Button variant="danger" className="flex-1" onClick={() => isDeleteConfirmOpen && handleDelete(isDeleteConfirmOpen)}>ยืนยันการลบ</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
