<template>
  <div class="contact-page">
    <div class="hero-section">
      <div class="container">
        <h1 class="hero-title">Liên hệ với chúng tôi</h1>
        <p class="hero-subtitle">
          Có câu hỏi? Chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7
        </p>
      </div>
    </div>

    <div class="contact-section">
      <div class="container">
        <div class="contact-grid">
          <div class="contact-info">
            <h2>Thông tin liên hệ</h2>
            <p>Hãy liên hệ với chúng tôi qua các kênh dưới đây:</p>

            <div class="contact-methods">
              <div class="contact-method">
                <div class="method-icon">📧</div>
                <div class="method-content">
                  <h4>Email</h4>
                  <p>support@wincloud.app</p>
                  <p>sales@wincloud.app</p>
                </div>
              </div>

              <div class="contact-method">
                <div class="method-icon">📞</div>
                <div class="method-content">
                  <h4>Điện thoại</h4>
                  <p>+84 (28) 1234 5678</p>
                  <p>Hotline: 1900 1234</p>
                </div>
              </div>

              <div class="contact-method">
                <div class="method-icon">📍</div>
                <div class="method-content">
                  <h4>Địa chỉ</h4>
                  <p>123 Nguyễn Huệ, Quận 1</p>
                  <p>TP.HCM, Việt Nam</p>
                </div>
              </div>

              <div class="contact-method">
                <div class="method-icon">💬</div>
                <div class="method-content">
                  <h4>Live Chat</h4>
                  <p>Hỗ trợ trực tuyến 24/7</p>
                  <button class="chat-btn">Bắt đầu chat</button>
                </div>
              </div>
            </div>

            <div class="business-hours">
              <h3>Giờ làm việc</h3>
              <ul>
                <li><strong>Thứ 2 - Thứ 6:</strong> 8:00 - 18:00</li>
                <li><strong>Thứ 7:</strong> 9:00 - 17:00</li>
                <li><strong>Chủ nhật:</strong> 10:00 - 16:00</li>
                <li><strong>Hỗ trợ kỹ thuật:</strong> 24/7</li>
              </ul>
            </div>
          </div>

          <div class="contact-form">
            <h2>Gửi tin nhắn</h2>
            <form @submit.prevent="submitForm" class="form">
              <div class="form-row">
                <div class="form-group">
                  <label for="firstName">Họ *</label>
                  <input
                    type="text"
                    id="firstName"
                    v-model="form.firstName"
                    required
                    class="form-input"
                  />
                </div>
                <div class="form-group">
                  <label for="lastName">Tên *</label>
                  <input
                    type="text"
                    id="lastName"
                    v-model="form.lastName"
                    required
                    class="form-input"
                  />
                </div>
              </div>

              <div class="form-group">
                <label for="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  v-model="form.email"
                  required
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label for="phone">Số điện thoại</label>
                <input
                  type="tel"
                  id="phone"
                  v-model="form.phone"
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label for="subject">Chủ đề *</label>
                <select
                  id="subject"
                  v-model="form.subject"
                  required
                  class="form-input"
                >
                  <option value="">Chọn chủ đề</option>
                  <option value="sales">Tư vấn bán hàng</option>
                  <option value="support">Hỗ trợ kỹ thuật</option>
                  <option value="billing">Thanh toán & Hóa đơn</option>
                  <option value="partnership">Hợp tác kinh doanh</option>
                  <option value="other">Khác</option>
                </select>
              </div>

              <div class="form-group">
                <label for="message">Tin nhắn *</label>
                <textarea
                  id="message"
                  v-model="form.message"
                  required
                  rows="5"
                  class="form-input"
                  placeholder="Mô tả chi tiết yêu cầu của bạn..."
                ></textarea>
              </div>

              <button type="submit" class="submit-btn" :disabled="loading">
                <span v-if="loading" class="loading-spinner"></span>
                {{ loading ? "Đang gửi..." : "Gửi tin nhắn" }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from "vue";

const loading = ref(false);

const form = reactive({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
});

const submitForm = async () => {
  loading.value = true;

  try {
    // Call real API endpoint
    const response = await fetch('http://localhost:5000/api/v1/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `${form.firstName} ${form.lastName}`.trim(),
        email: form.email,
        phone: form.phone || null,
        subject: form.subject,
        message: form.message,
        source: 'website_contact_form',
        recipient: 'support@wincloud.app'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Form submitted successfully:', result);
    
    alert(
      "Tin nhắn đã được gửi thành công! Chúng tôi sẽ phản hồi qua email trong vòng 24h."
    );

    // Reset form
    Object.keys(form).forEach((key) => {
      form[key] = "";
    });
    
  } catch (error) {
    console.error("Submit error:", error);
    alert("Có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại hoặc liên hệ trực tiếp qua email: support@wincloud.app");
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.contact-page {
  min-height: calc(100vh - 70px);
}

.hero-section {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
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

.contact-section {
  padding: 4rem 0;
  background: #f9fafb;
}

.contact-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
}

.contact-info h2,
.contact-form h2 {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 1rem;
}

.contact-info p {
  color: #6b7280;
  margin-bottom: 2rem;
  font-size: 1.125rem;
}

.contact-methods {
  margin-bottom: 3rem;
}

.contact-method {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.method-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.method-content h4 {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.method-content p {
  color: #6b7280;
  margin-bottom: 0.25rem;
}

.chat-btn {
  background: #3b82f6;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  margin-top: 0.5rem;
  transition: background-color 0.3s ease;
}

.chat-btn:hover {
  background: #2563eb;
}

.business-hours {
  background: white;
  padding: 2rem;
  border-radius: 0.75rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.business-hours h3 {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1rem;
}

.business-hours ul {
  list-style: none;
  padding: 0;
}

.business-hours li {
  padding: 0.5rem 0;
  color: #6b7280;
  border-bottom: 1px solid #f3f4f6;
}

.business-hours li:last-child {
  border-bottom: none;
}

.contact-form {
  background: white;
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.form-input {
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: border-color 0.3s ease;
  background: #f9fafb;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  background: white;
}

.form-input textarea {
  resize: vertical;
  min-height: 120px;
}

.submit-btn {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  padding: 1rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.submit-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  transform: translateY(-1px);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.loading-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2rem;
  }

  .contact-grid {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .contact-method {
    flex-direction: column;
    text-align: center;
  }
}
</style>
