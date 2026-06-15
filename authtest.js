const http = require('http');
const data = JSON.stringify({ identifier: 'sharma02reshma@gmail.com' });
const options = {
  hostname: '127.0.0.1',
  port: 5000,
  path: '/api/auth/request-otp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, res => {
  console.log('status', res.statusCode);
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    console.log('body', body);
  });
});

req.on('error', err => console.error('error', err.message));
req.write(data);
req.end();
