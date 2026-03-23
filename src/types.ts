export interface User {
  uid: string;
  displayName: string;
  email: string;
  department: string;
  role: 'admin' | 'user';
  phone?: string;
  position?: string;
  staffCode?: string;
}

export interface Booking {
  id: string;
  subject: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  department: string;
  roomId: string;
  roomName: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  status: 'approved' | 'cancelled';
  createdAt: string;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
}
