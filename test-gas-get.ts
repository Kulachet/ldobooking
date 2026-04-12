import https from 'https';

const options = {
  hostname: 'script.google.com',
  path: '/macros/s/AKfycbzK_Y3jHmldTMZ0h9N2WtGbxch34OoNpHMlVlSNTGOX2vagznsNH89WGqcI9Mf5vXf2/exec',
  method: 'GET'
};

const req = https.request(options, (res) => {
  console.log('statusCode:', res.statusCode);
  if (res.statusCode === 302) {
    console.log('Redirect:', res.headers.location);
  }
});
req.end();
