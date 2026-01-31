<template>
    <Navbar />
    <div class="container">
        <div class="not-found-content">
            <h1>404</h1>
            <p>{{ t('404.description') }}</p>
            <a href="/" class="btn-back-home">{{ t('404.backhome') }}</a>
        </div>
    </div>
  </template>
  

<style scoped>
.container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

.not-found-content {
    text-align: center;
    padding: 40px 20px;
}

.not-found-content h1 {
    font-size: 120px;
    font-weight: 700;
    color: var(--primary-color);
    margin: 0 0 20px 0;
    text-shadow: 0 4px 20px rgba(158, 148, 216, 0.3);
}

.not-found-content p {
    font-size: 1.5em;
    color: var(--text-secondary);
    margin: 0 0 40px 0;
}

.btn-back-home {
    display: inline-block;
    padding: 12px 32px;
    background: linear-gradient(135deg, var(--primary-color), var(--button-hover));
    color: #fff;
    text-decoration: none;
    border-radius: 30px;
    font-size: 1.1em;
    font-weight: 600;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(158, 148, 216, 0.3);
    position: relative;
    overflow: hidden;
}

.btn-back-home::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    transition: left 0.5s ease;
}

.btn-back-home:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(158, 148, 216, 0.4);
}

.btn-back-home:hover::before {
    left: 100%;
}

.btn-back-home:active {
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(158, 148, 216, 0.3);
}

@media (max-width: 768px) {
    .not-found-content h1 {
        font-size: 80px;
    }

    .not-found-content p {
        font-size: 1.2em;
    }

    .btn-back-home {
        padding: 10px 24px;
        font-size: 1em;
    }
}
</style>

<script setup lang="ts">
import Navbar from '../components/Navbar.vue'
import Footer from '../components/Footer.vue'
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>