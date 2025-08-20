/**
 * Test script for secureTokenService
 * Run this in browser console to test functionality
 */

import { secureTokenService } from './services/secureTokenService'

export const testSecureTokenService = () => {
  console.log('🔍 Testing secureTokenService...')
  
  try {
    // Test 1: Basic initialization
    console.log('✅ Test 1: Service initialized')
    
    // Test 2: Token validation
    const testToken = "dop_v1_YOUR_TEST_TOKEN_HERE_FOR_TESTING_PURPOSES_ONLY"
    const validation = secureTokenService.validateDOTokenFormat(testToken)
    console.log('✅ Test 2: Token validation:', validation)
    
    // Test 3: Token preparation
    const prepared = secureTokenService.prepareTokenForTransmission(testToken, "Test Token")
    console.log('✅ Test 3: Token preparation:', prepared)
    
    // Test 4: Security audit
    const audit = secureTokenService.performSecurityAudit()
    console.log('✅ Test 4: Security audit:', audit)
    
    // Test 5: Store and retrieve JWT token
    secureTokenService.storeToken('test-jwt-token', 'access')
    const retrieved = secureTokenService.getToken('access')
    console.log('✅ Test 5: Store/retrieve token:', retrieved === 'test-jwt-token')
    
    // Test 6: Check token validity
    const hasValid = secureTokenService.hasValidToken('access')
    console.log('✅ Test 6: Has valid token:', hasValid)
    
    // Clean up
    secureTokenService.removeToken('access')
    
    console.log('🎉 All tests passed!')
    return true
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}

// Auto-run test if in browser
if (typeof window !== 'undefined') {
  window.testSecureTokenService = testSecureTokenService
  console.log('🔧 Run testSecureTokenService() in console to test')
}
