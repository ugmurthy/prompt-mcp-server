import http from 'http';

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/sse',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  
  // Close the connection after getting headers
  req.destroy();
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.end();