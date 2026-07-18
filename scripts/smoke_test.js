const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

async function runSmokeTest() {
  console.log(`Using BASE_URL: ${BASE_URL}`);

  const endpointsToTest = [
    { name: 'Login (apiClient)', path: '/api/auth/login', method: 'POST' },
    { name: 'Register (authService)', path: '/api/auth/register', method: 'POST' }
  ];

  let successCount = 0;

  for (const endpoint of endpointsToTest) {
    const fullUrl = `${BASE_URL}${endpoint.path}`;
    console.log(`\nTesting ${endpoint.name}: ${fullUrl}`);

    try {
      const response = await fetch(fullUrl, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (response.status === 404) {
        console.error(`FAILED: Received 404 for ${endpoint.name}. Check API prefix convention.`);
      } else {
        console.log(`SUCCESS: Endpoint reached (Status ${response.status}). Prefix is correct.`);
        successCount++;
      }
    } catch (error) {
      console.error(`Network error:`, error.message);
    }
  }

  console.log(`\nSmoke test finished. ${successCount}/${endpointsToTest.length} endpoints reached.`);
}

runSmokeTest();
