import https from 'https';

const data = JSON.stringify({
  to: 'kulachet.l@bu.ac.th, ldo@bu.ac.th',
  subject: 'มีรายการจองห้องประชุมใหม่: ทดสอบระบบแจ้งเตือนอีเมล (สำนักพัฒนาการเรียนรู้)',
  html: `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #3b82f6; padding: 20px; color: white; text-align: center;">
        <h2 style="margin: 0; font-size: 20px;">มีรายการจองห้องประชุมใหม่</h2>
      </div>
      <div style="padding: 24px; background-color: #ffffff;">
        <p style="margin-top: 0; font-size: 16px;">มีผู้ทำรายการจองห้องประชุมใหม่เข้ามาในระบบ โดยมีรายละเอียดดังนี้:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; width: 120px; font-weight: bold;">ผู้จอง:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 500;">อ.กุลเชษฐ์ เล็กประยูร</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: bold;">หัวข้อ:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 500; color: #1e3a8a;">ประชุมหารือแนวทางการพัฒนาการเรียนรู้ร่วมกับสถาบันฯ</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: bold;">ห้องประชุม:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 500;">ห้องประชุมสำนักพัฒนาการเรียนรู้ (Room 1)</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: bold;">วันที่/เวลา:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 500; color: #d97706;">วันพุธที่ 8 กรกฎาคม 2569 เวลา 09:00 - 11:30 น.</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: bold;">หน่วยงาน:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 500;">สำนักพัฒนาการเรียนรู้ (LDO)</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: bold;">เบอร์โทรศัพท์:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 500;">1234</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: bold;">อีเมล:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: 500;">kulachet.l@bu.ac.th</td>
          </tr>
        </table>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://ais-dev-khphrksg3utr5dcsffbnk7-166049909817.asia-east1.run.app/admin" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; font-weight: bold; border-radius: 6px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);">
            ไปที่หน้าระบบจัดการการจอง
          </a>
        </div>
      </div>
      <div style="background-color: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
        อีเมลนี้จัดส่งโดยระบบจองห้องประชุมอัตโนมัติ (BU Meeting Room Reservation)
      </div>
    </div>
  `
});

const options = {
  hostname: 'script.google.com',
  path: '/macros/s/AKfycbwXGcuubKzRI7ZdxMcgTR9cWodP6x-z0Efam0euk-30A3bgVNy4Aw0o3re9mzgVzxZx/exec',
  method: 'POST',
  headers: {
    'Content-Type': 'text/plain',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, (res) => {
  console.log('statusCode:', res.statusCode);
  console.log('headers:', res.headers);
  
  if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
    console.log('Redirecting to:', res.headers.location);
    const redirectReq = https.request(res.headers.location, { method: 'GET' }, (redirectRes) => {
        console.log('Redirect statusCode:', redirectRes.statusCode);
        let body = '';
        redirectRes.on('data', d => body += d);
        redirectRes.on('end', () => console.log('Redirect body:', body));
    });
    redirectReq.end();
  } else {
    let body = '';
    res.on('data', (d) => {
      body += d;
    });
    res.on('end', () => {
      console.log('Body:', body);
    });
  }
});

req.on('error', (e) => {
  console.error('Error:', e);
});

req.write(data);
req.end();
