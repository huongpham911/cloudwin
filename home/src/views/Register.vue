<template>
  <div class="register-page">
    <div class="register-container">
      <div class="register-card">
        <div class="register-header">
          <h1>🔄 Đang chuyển hướng...</h1>
          <p>Bạn sẽ được chuyển đến trang đăng ký chính của WinCloud</p>
        </div>

        <div class="redirect-info">
          <div class="spinner"></div>
          <p>Đang chuyển hướng đến <strong>localhost:5173/register</strong></p>
        </div>

        <div class="manual-link">
          <p>
            Nếu không được chuyển hướng tự động,
            <a href="http://localhost:5173/register" target="_blank"
              >nhấn vào đây</a
            >
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from "vue";

onMounted(() => {
  // Auto redirect after 2 seconds
  setTimeout(() => {
    window.open("http://localhost:5173/register", "_blank");
  }, 2000);
});
</script>

<style scoped>
.register-page {
  min-height: calc(100vh - 70px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.register-container {
  width: 100%;
  max-width: 400px;
}

.register-card {
  background: white;
  padding: 3rem 2rem;
  border-radius: 1rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.register-header h1 {
  color: #1f2937;
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.register-header p {
  color: #6b7280;
  margin-bottom: 2rem;
}

.redirect-info {
  margin: 2rem 0;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top: 4px solid #10b981;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.redirect-info p {
  color: #374151;
  font-weight: 500;
}

.manual-link {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e5e7eb;
}

.manual-link p {
  color: #6b7280;
  font-size: 0.875rem;
}

.manual-link a {
  color: #10b981;
  text-decoration: none;
  font-weight: 600;
}

.manual-link a:hover {
  text-decoration: underline;
}
</style>
