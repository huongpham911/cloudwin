<template>
  <nav class="navbar">
    <div class="nav-container">
      <!-- Logo -->
      <router-link to="/" class="nav-logo">
        <span class="logo-icon">☁️</span>
        <span class="logo-text">WinCloud</span>
      </router-link>

      <!-- Navigation Menu -->
      <div class="nav-menu">
        <router-link to="/" class="nav-link">Trang chủ</router-link>
        <router-link to="/about" class="nav-link">Giới thiệu</router-link>
        <router-link to="/pricing" class="nav-link">Bảng giá</router-link>
        <router-link to="/contact" class="nav-link">Liên hệ</router-link>
      </div>

      <!-- Auth Buttons -->
      <div class="nav-auth">
        <router-link to="/login" class="nav-link login-link">
          Đăng nhập
        </router-link>
        <router-link to="/register" class="btn-register"> Đăng ký </router-link>
      </div>

      <!-- Mobile Menu Button -->
      <button class="mobile-menu-btn" @click="toggleMobileMenu">
        <span class="hamburger"></span>
      </button>
    </div>

    <!-- Mobile Menu -->
    <div class="mobile-menu" :class="{ active: mobileMenuOpen }">
      <router-link to="/" class="mobile-link" @click="closeMobileMenu"
        >Trang chủ</router-link
      >
      <router-link to="/about" class="mobile-link" @click="closeMobileMenu"
        >Giới thiệu</router-link
      >
      <router-link to="/pricing" class="mobile-link" @click="closeMobileMenu"
        >Bảng giá</router-link
      >
      <router-link to="/contact" class="mobile-link" @click="closeMobileMenu"
        >Liên hệ</router-link
      >
      <router-link to="/login" class="mobile-link" @click="closeMobileMenu">
        Đăng nhập
      </router-link>
      <router-link
        to="/register"
        class="mobile-link register-mobile"
        @click="closeMobileMenu"
      >
        Đăng ký
      </router-link>
    </div>
  </nav>
</template>

<script setup>
import { ref } from "vue";

const mobileMenuOpen = ref(false);

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value;
};

const closeMobileMenu = () => {
  mobileMenuOpen.value = false;
};
</script>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(229, 231, 235, 0.5);
  z-index: 1000;
  transition: all 0.3s ease;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 70px;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  font-weight: 700;
  font-size: 1.25rem;
  color: #1e40af;
  transition: color 0.3s ease;
}

.nav-logo:hover {
  color: #3b82f6;
}

.logo-icon {
  font-size: 1.5rem;
}

.logo-text {
  font-family: "Arial", sans-serif;
}

.nav-menu {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.nav-link {
  text-decoration: none;
  color: #374151;
  font-weight: 500;
  padding: 0.5rem 0;
  position: relative;
  transition: color 0.3s ease;
}

.nav-link:hover {
  color: #3b82f6;
}

.nav-link.router-link-active {
  color: #3b82f6;
}

.nav-link::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background: #3b82f6;
  transition: width 0.3s ease;
}

.nav-link:hover::after,
.nav-link.router-link-active::after {
  width: 100%;
}

.nav-auth {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.login-link {
  color: #6b7280 !important;
}

.login-link:hover {
  color: #3b82f6 !important;
}

.btn-register {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  padding: 0.5rem 1.5rem;
  border-radius: 0.5rem;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.btn-register:hover {
  background: linear-gradient(135deg, #2563eb, #1e40af);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4);
}

.mobile-menu-btn {
  display: none;
  flex-direction: column;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
}

.hamburger {
  width: 25px;
  height: 3px;
  background: #374151;
  margin: 3px 0;
  transition: 0.3s;
  border-radius: 2px;
}

.mobile-menu {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid rgba(229, 231, 235, 0.5);
  padding: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.mobile-link {
  display: block;
  padding: 0.75rem 0;
  text-decoration: none;
  color: #374151;
  font-weight: 500;
  border-bottom: 1px solid rgba(229, 231, 235, 0.3);
  transition: color 0.3s ease;
}

.mobile-link:hover {
  color: #3b82f6;
}

.register-mobile {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white !important;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  margin-top: 0.5rem;
  border: none !important;
  text-align: center;
}

@media (max-width: 768px) {
  .nav-menu,
  .nav-auth {
    display: none;
  }

  .mobile-menu-btn {
    display: flex;
  }

  .mobile-menu.active {
    display: block;
  }
}

@media (max-width: 640px) {
  .nav-container {
    padding: 0 1rem;
  }

  .logo-text {
    font-size: 1.1rem;
  }
}
</style>
