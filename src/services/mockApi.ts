import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from '../firebase';
import { Booking, User } from '../types';
// import emailjs from '@emailjs/browser';

// Constants
export const MOCK_ROOMS = [
  { id: 'room-1', name: 'ห้องประชุมสำนักพัฒนาการเรียนรู้', capacity: 30 },
];

export const ADMIN_EMAILS = [
  'kulachet.l@bu.ac.th',
  'napaporn.pu@bu.ac.th',
  'ldo@bu.ac.th'
];

// Error Handler
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

import { STAFF_DATA } from '../data/staffData';

// Auth Service
export const authService = {
  onAuthChange: (callback: (user: User | null, error?: string) => void) => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const email = firebaseUser.email?.trim().toLowerCase() || '';
          const isBUDomain = email.endsWith('@bu.ac.th');
          
          if (!isBUDomain) {
            await signOut(auth);
            callback(null, 'กรุณาเข้าสู่ระบบด้วยอีเมล @bu.ac.th');
            return;
          }

          // Find user in staff data - try Firestore first, then fallback to hardcoded data
          let staff: any = null;
          try {
            const staffQuery = query(collection(db, 'staff'), where('email', '==', email));
            const staffSnapshot = await getDocs(staffQuery);
            if (!staffSnapshot.empty) {
              staff = staffSnapshot.docs[0].data();
            }
          } catch (e) {
            console.warn('Failed to fetch staff from Firestore:', e);
          }

          if (!staff) {
            staff = STAFF_DATA.find(s => 
              s.email && s.email.trim().toLowerCase() === email
            );
          }

          // Helper to extract 4-digit extension
          const getExtension = (phoneStr: string) => {
            if (!phoneStr) return '';
            // Look for a standalone 4-digit sequence
            const match = phoneStr.match(/\b\d{4}\b/);
            return match ? match[0] : '';
          };

          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          let userData: User;
          
          // Base data from Firebase Auth
          const baseUserData = {
            uid: firebaseUser.uid,
            email: email,
            photoURL: firebaseUser.photoURL || undefined,
          };

          if (userDoc.exists()) {
            const existingData = userDoc.data() as User;
            // Update with staff data if found to ensure Thai names/departments are correct
            userData = {
              ...existingData,
              ...baseUserData, // Ensure latest photoURL and email
              displayName: staff ? staff.name : (existingData.displayName || firebaseUser.displayName || 'Unknown User'),
              department: staff ? staff.department : (existingData.department || 'ทั่วไป'),
              phone: staff ? getExtension(staff.phone) : (existingData.phone || ''),
              position: staff ? staff.position : (existingData.position || ''),
              staffCode: staff ? staff.code : (existingData.staffCode || ''),
              role: ADMIN_EMAILS.includes(email) ? 'admin' : existingData.role,
            };
            
            // If data changed, update Firestore - ONLY for admins
            if (ADMIN_EMAILS.includes(email) && JSON.stringify(userData) !== JSON.stringify(existingData)) {
              await setDoc(doc(db, 'users', firebaseUser.uid), userData);
            }
          } else {
            // Create new user profile
            userData = {
              ...baseUserData,
              displayName: staff ? staff.name : (firebaseUser.displayName || 'Unknown User'),
              department: staff ? staff.department : 'ทั่วไป',
              role: ADMIN_EMAILS.includes(email) ? 'admin' : 'user',
              phone: staff ? getExtension(staff.phone) : '',
              position: staff ? staff.position : '',
              staffCode: staff ? staff.code : '',
            } as User;
            
            // ONLY save to Firestore if the user is an admin
            if (ADMIN_EMAILS.includes(email)) {
              await setDoc(doc(db, 'users', firebaseUser.uid), userData);
            }
          }
          callback(userData);
        } else {
          callback(null);
        }
      } catch (error) {
        console.error('Auth State Change Error:', error);
        callback(null, 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์');
      }
    });
  },
  signInWithGoogle: async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error('Login Error:', error);
      throw error;
    }
  },
  logout: () => signOut(auth),
};

// Firestore Service
export const dbService = {
  subscribeToBookings: (callback: (bookings: Booking[]) => void) => {
    const q = query(collection(db, 'bookings'));
    
    console.log('Attaching onSnapshot to bookings. Current Auth User:', auth.currentUser?.email || 'NULL');
    
    return onSnapshot(q, (snapshot) => {
      const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      callback(bookings);
    }, (error) => {
      console.error('onSnapshot error for bookings:', error);
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    });
  },
  addBooking: async (booking: Omit<Booking, 'id' | 'createdAt'>) => {
    try {
      console.log('Attempting to add booking to Firestore:', booking);
      const docRef = await addDoc(collection(db, 'bookings'), {
        ...booking,
        createdAt: new Date().toISOString(),
      });
      console.log('Booking added successfully with ID:', docRef.id);
      
      // Send simulation email
      const newBooking = { id: docRef.id, ...booking, createdAt: new Date().toISOString() } as Booking;
      try {
        await dbService.sendBookingEmail(newBooking);
      } catch (emailError) {
        console.warn('Email sending failed, but booking was saved:', emailError);
      }
      
      return docRef.id;
    } catch (error) {
      console.error('Firestore addBooking error:', error);
      handleFirestoreError(error, OperationType.CREATE, 'bookings');
    }
  },
  updateBookingStatus: async (id: string, status: 'approved' | 'cancelled') => {
    try {
      const bookingRef = doc(db, 'bookings', id);
      const bookingDoc = await getDoc(bookingRef);
      if (bookingDoc.exists()) {
        const bookingData = { id: bookingDoc.id, ...bookingDoc.data() } as Booking;
        await updateDoc(bookingRef, { status });
        
        // Send notification email for status update
        await dbService.sendStatusUpdateEmail(bookingData, status);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${id}`);
    }
  },
  deleteBooking: async (id: string) => {
    try {
      await deleteDoc(doc(db, 'bookings', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `bookings/${id}`);
    }
  },
  getAllUsers: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const allUsers = querySnapshot.docs.map(doc => doc.data() as User);
      // Filter to only show the 3 specific admins as requested
      return allUsers.filter(u => ADMIN_EMAILS.includes(u.email.toLowerCase()));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    }
  },
  subscribeToStaffData: (callback: (staff: any[]) => void) => {
    const q = query(collection(db, 'staff'));
    return onSnapshot(q, (snapshot) => {
      const staff = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(staff);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'staff');
    });
  },
  updateStaffDatabase: async (staffList: any[]) => {
    try {
      // For each staff member, use their code as the document ID
      for (const staff of staffList) {
        if (!staff.code) continue;
        await setDoc(doc(db, 'staff', staff.code), staff);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'staff');
    }
  },
  sendStatusUpdateEmail: async (booking: Booking, status: 'approved' | 'cancelled') => {
    const statusThai = status === 'approved' ? 'อนุมัติ' : 'ยกเลิก';

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: booking.userEmail,
          subject: `แจ้งผลการจองห้องประชุม: ${booking.subject} (${statusThai})`,
          html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
              <h2 style="color: ${status === 'approved' ? '#10b981' : '#ef4444'};">แจ้งผลการจองห้องประชุม</h2>
              <p>เรียน อาจารย์ <strong>${booking.userName}</strong></p>
              <p>การจองห้องประชุมของคุณได้รับการ <strong>${statusThai}</strong> แล้ว:</p>
              <p>
                <strong>เรื่อง:</strong> ${booking.subject}<br>
                <strong>ห้อง:</strong> ${booking.roomName}<br>
                <strong>วันที่/เวลา:</strong> ${new Date(booking.startTime).toLocaleDateString('th-TH', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })} เวลา ${new Date(booking.startTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - ${new Date(booking.endTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
              </p>
              <p>ขอบคุณที่ใช้บริการ</p>
            </div>
          `,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.warn('Failed to send status update email via Gmail:', errorData);
        return false;
      }

      console.log('Status update email sent successfully via Gmail SMTP');
      return true;
    } catch (error) {
      console.error('Failed to send status update email:', error);
      return false;
    }
  },
  checkConflict: (bookings: Booking[], roomId: string, start: Date, end: Date) => {
    return bookings.some(b => {
      if (b.roomId !== roomId || b.status === 'cancelled') return false;
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      return (start < bEnd && end > bStart);
    });
  },
  sendBookingEmail: async (booking: Booking) => {
    const adminEmails = ADMIN_EMAILS.join(', ');

    try {
      // Send to User
      const userEmailPromise = fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: booking.userEmail,
          subject: `ยืนยันการรับข้อมูลการจองห้องประชุม: ${booking.subject}`,
          html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
              <p>เรียน อาจารย์ <strong>${booking.userName}</strong></p>
              <p>ระบบได้รับข้อมูลการจองห้องประชุมของคุณเรียบร้อยแล้ว</p>
              <p>
                <strong>เรื่อง:</strong> ${booking.subject}<br>
                <strong>ห้อง:</strong> ${booking.roomName}<br>
                <strong>วันที่/เวลา:</strong> ${new Date(booking.startTime).toLocaleDateString('th-TH', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })} เวลา ${new Date(booking.startTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} - ${new Date(booking.endTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.<br>
                <strong>หน่วยงาน:</strong> ${booking.department}<br>
                <strong>เบอร์โทรศัพท์:</strong> ${booking.userPhone}
              </p>
            </div>
          `,
        }),
      });

      // Send to Admins
      const adminEmailPromise = fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: adminEmails,
          subject: `มีรายการจองห้องประชุมใหม่: ${booking.subject}`,
          html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
              <h2 style="color: #3b82f6;">มีรายการจองห้องประชุมใหม่</h2>
              <p>มีผู้จองห้องประชุมใหม่ในระบบ:</p>
              <ul style="list-style: none; padding: 0;">
                <li><strong>ผู้จอง:</strong> ${booking.userName}</li>
                <li><strong>หัวข้อ:</strong> ${booking.subject}</li>
                <li><strong>ห้อง:</strong> ${booking.roomName}</li>
                <li><strong>วันที่/เวลา:</strong> ${new Date(booking.startTime).toLocaleString('th-TH')} - ${new Date(booking.endTime).toLocaleString('th-TH')}</li>
                <li><strong>หน่วยงาน:</strong> ${booking.department}</li>
                <li><strong>เบอร์โทรศัพท์:</strong> ${booking.userPhone}</li>
                <li><strong>อีเมล:</strong> ${booking.userEmail}</li>
              </ul>
              <p><a href="${window.location.origin}/admin" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">ไปที่หน้าจัดการการจอง</a></p>
            </div>
          `,
        }),
      });

      const [userRes, adminRes] = await Promise.all([userEmailPromise, adminEmailPromise]);

      if (!userRes.ok || !adminRes.ok) {
        console.warn('One or more emails failed to send via Gmail SMTP');
      }

      console.log('Booking confirmation emails sent successfully via Gmail SMTP');
      return true;
    } catch (error) {
      console.error('Failed to send booking emails:', error);
      return false;
    }
  }
};
