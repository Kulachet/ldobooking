import fetch from 'node-fetch';

async function testLocalApi() {
  const url = 'http://localhost:3000/api/send-email';
  const payload = {
    to: 'kulachet.l@bu.ac.th',
    subject: 'ทดสอบระบบผ่าน Local API Proxy',
    html: '<h3>ทดสอบ</h3><p>อีเมลนี้ส่งผ่าน Local API Proxy ในระบบจองห้องประชุม</p>'
  };

  console.log('Sending request to local Express API at:', url);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('Response Status:', response.status);
    const text = await response.text();
    console.log('Response Body:', text);
  } catch (error) {
    console.error('Request failed:', error);
  }
}

testLocalApi();
