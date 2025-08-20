<script setup>
import Navbar from './components/Navbar.vue'
</script>

<template>
  <div id="app">
    <!-- Floating Background Elements -->
    <div class="floating-bg">
      <div
        class="floating-element"
        style="top: 10%; left: 10%; animation-delay: 0s"
      >
        ☁️
      </div>
      <div
        class="floating-element"
        style="top: 20%; right: 15%; animation-delay: 2s"
      >
        ⚡
      </div>
      <div
        class="floating-element"
        style="top: 60%; left: 20%; animation-delay: 4s"
      >
        🚀
      </div>
      <div
        class="floating-element"
        style="bottom: 20%; right: 10%; animation-delay: 6s"
      >
        🛡️
      </div>
      <div
        class="floating-element"
        style="top: 40%; right: 40%; animation-delay: 8s"
      >
        💫
      </div>
    </div>

    <Navbar />
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: "Inter", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: #333;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  min-height: 100vh;
  animation: gradientShift 15s ease infinite;
}

@keyframes gradientShift {
  0%, 100% {
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  }
  25% {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  }
  50% {
    background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
  }
  75% {
    background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  }
}

#app {
  min-height: 100vh;
}

.main-content {
  padding-top: 70px; /* Account for fixed navbar */
  min-height: calc(100vh - 70px);
}

/* Global button styles */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
  cursor: pointer;
  border: none;
  font-size: 1rem;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #2563eb, #1e40af);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4);
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 2px solid #e5e7eb;
}

.btn-secondary:hover {
  background: #f9fafb;
  border-color: #3b82f6;
  color: #3b82f6;
}

/* Responsive design */
@media (max-width: 768px) {
  .main-content {
    padding-top: 70px;
  }
}

/* Floating Background Elements */
.floating-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: -1;
  overflow: hidden;
}

.floating-element {
  position: absolute;
  font-size: 2rem;
  opacity: 0.1;
  animation: float 10s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px) rotate(0deg);
    opacity: 0.1;
  }
  25% {
    transform: translateY(-20px) rotate(90deg);
    opacity: 0.2;
  }
  50% {
    transform: translateY(-40px) rotate(180deg);
    opacity: 0.3;
  }
  75% {
    transform: translateY(-20px) rotate(270deg);
    opacity: 0.2;
  }
}

/* Enhanced Button Styles */
.btn {
  position: relative;
  overflow: hidden;
}

.btn::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  transition: left 0.5s ease;
}

.btn:hover::before {
  left: 100%;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
  }
  50% {
    box-shadow: 0 4px 20px rgba(59, 130, 246, 0.6);
  }
}
</style>
