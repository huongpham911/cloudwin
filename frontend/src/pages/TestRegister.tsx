import React, { useState } from 'react'
import axios from 'axios'

const TestRegister: React.FC = () => {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setError('')

    try {
      const response = await axios.post('http://localhost:5000/api/v1/auth/register', {
        email,
        username,
        password,
        full_name: fullName
      })
      
      setMessage('Registration successful! Response: ' + JSON.stringify(response.data))
    } catch (err: any) {
      setError('Error: ' + (err.response?.data?.detail || err.message))
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h1>Test Registration</h1>
      
      <div style={{ background: '#f0f0f0', padding: '10px', marginBottom: '20px' }}>
        <h3>Password Requirements:</h3>
        <ul>
          <li>At least 8 characters</li>
          <li>At least one number</li>
          <li>At least one uppercase letter</li>
          <li>At least one lowercase letter</li>
          <li>At least one special character (!@#$%^&*()_+-=[]{}|;:,.&lt;&gt;?)</li>
        </ul>
        <p><strong>Example:</strong> Password123!</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label>Email:</label><br/>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>Username:</label><br/>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            style={{ width: '100%', padding: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>Password:</label><br/>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="e.g., Password123!"
            style={{ width: '100%', padding: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>Full Name (optional):</label><br/>
          <input 
            type="text" 
            value={fullName} 
            onChange={(e) => setFullName(e.target.value)}
            style={{ width: '100%', padding: '5px' }}
          />
        </div>

        <button type="submit" style={{ padding: '10px 20px' }}>
          Register
        </button>
      </form>

      {message && (
        <div style={{ marginTop: '20px', padding: '10px', background: '#d4edda', color: '#155724' }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{ marginTop: '20px', padding: '10px', background: '#f8d7da', color: '#721c24' }}>
          {error}
        </div>
      )}
    </div>
  )
}

export default TestRegister
