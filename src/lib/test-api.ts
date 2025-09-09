// Simple test to check if the API endpoint works
const testAPI = async () => {
  try {
    console.log('Testing API endpoint...')
    const response = await fetch('http://localhost:3000/api/courses')
    console.log('Response status:', response.status)
    
    if (response.ok) {
      const data = await response.json()
      console.log('Data received:', {
        isArray: Array.isArray(data),
        length: data.length,
        firstItem: data[0]
      })
    } else {
      const errorData = await response.json()
      console.log('Error response:', errorData)
    }
  } catch (error) {
    console.error('Test failed:', error)
  }
}

// Run the test
testAPI()