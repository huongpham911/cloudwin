<template>
  <div class="about-page">
    <div class="hero-section">
      <div class="container">
        <h1 class="hero-title">Về WinCloud</h1>
        <p class="hero-subtitle">
          Chúng tôi cung cấp giải pháp Windows RDP trên cloud hàng đầu Việt Nam
        </p>
      </div>
    </div>

    <div class="content-section">
      <div class="container">
        <div class="content-grid">
          <div class="content-card">
            <div class="card-icon">🎯</div>
            <h3>Sứ mệnh</h3>
            <p>
              Làm cho việc triển khai và quản lý Windows Server trở nên dễ dàng,
              nhanh chóng và tiết kiệm chi phí cho mọi doanh nghiệp.
            </p>
          </div>

          <div class="content-card">
            <div class="card-icon">👁️</div>
            <h3>Tầm nhìn</h3>
            <p>
              Trở thành nền tảng cloud computing hàng đầu Việt Nam, mang đến
              trải nghiệm tốt nhất cho người dùng.
            </p>
          </div>

          <div class="content-card">
            <div class="card-icon">⭐</div>
            <h3>Giá trị cốt lõi</h3>
            <p>
              Đơn giản hóa công nghệ, tối ưu chi phí, và mang lại giá trị thực
              sự cho khách hàng.
            </p>
          </div>
        </div>

        <div class="stats-section">
          <h2 class="section-title">Thống kê ấn tượng</h2>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-number">1000+</div>
              <div class="stat-label">Khách hàng tin tưởng</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">99.9%</div>
              <div class="stat-label">Thời gian hoạt động</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">24/7</div>
              <div class="stat-label">Hỗ trợ kỹ thuật</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">5000+</div>
              <div class="stat-label">Server đã triển khai</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Component logic here
</script>

<style scoped>
.about-page {
  min-height: calc(100vh - 70px);
}

.hero-section {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  padding: 4rem 0;
  text-align: center;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.hero-title {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.hero-subtitle {
  font-size: 1.25rem;
  opacity: 0.9;
  max-width: 600px;
  margin: 0 auto;
}

.content-section {
  padding: 4rem 0;
  background: white;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 4rem;
}

.content-card {
  background: #f8fafc;
  padding: 2rem;
  border-radius: 1rem;
  text-align: center;
  transition: transform 0.3s ease;
}

.content-card:hover {
  transform: translateY(-5px);
}

.card-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.content-card h3 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1rem;
}

.content-card p {
  color: #6b7280;
  line-height: 1.6;
}

.stats-section {
  text-align: center;
}

.section-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 3rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
}

.stat-item {
  background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
  padding: 2rem;
  border-radius: 1rem;
  border: 1px solid #e0f2fe;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 700;
  color: #3b82f6;
  margin-bottom: 0.5rem;
}

.stat-label {
  color: #6b7280;
  font-weight: 500;
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .content-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
}
</style>
