import https from 'https';

const data = JSON.stringify({
  to: 'test@example.com',
  subject: 'Test',
  html: '<p>Test</p>'
});

const options = {
  hostname: 'script.google.com',
  path: '/macros/s/AKfycbzK_Y3jHmldTMZ0h9N2WtGbxch34OoNpHMlVlSNTGOX2vagznsNH89WGqcI9Mf5vXf2/exec',
  method: 'POST',
  headers: {
    'Content-Type': 'text/plain',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  console.log('statusCode:', res.statusCode);
  console.log('headers:', res.headers);
  
  if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
    console.log('Redirecting to:', res.headers.location);
    const redirectReq = https.request(res.headers.location, { method: 'POST', headers: {'Content-Type': 'text/plain', 'Content-Length': data.length} }, (redirectRes) => {
        console.log('Redirect statusCode:', redirectRes.statusCode);
        let body = '';
        redirectRes.on('data', d => body += d);
        redirectRes.on('end', () => console.log('Redirect body:', body));
    });
    redirectReq.write(data);
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
