const url = 'https://skillfusion-backend.vercel.app/api/auth/register';

console.log('Sending test registration request to Production Domain:', url);

const body = {
  username: 'test_student_' + Date.now(),
  email: 'test_student_' + Date.now() + '@gmail.com',
  password: 'password123',
  name: 'Test Student',
  role: 'student'
};

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(body)
})
.then(async res => {
  console.log('Status:', res.status);
  console.log('Headers:', Object.fromEntries(res.headers.entries()));
  
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    console.log('JSON Data:', JSON.stringify(json, null, 2));
  } catch {
    console.log('Raw text:', text);
  }
})
.catch(err => {
  console.error('🔴 Fetch error:', err);
});
