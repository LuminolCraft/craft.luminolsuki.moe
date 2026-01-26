<template>
    <Navbar />
    <div class="container">
        <div class="not-found-content" style="text-align: center; margin-top: 40%; margin-bottom: 40%;">
            <h1>404</h1>
            <p>Oops! The page you're looking for doesn't exist.</p>
        </div>
    </div>
  </template>
  

<style scoped>

</style>

<script setup lang="ts">
import Navbar from '../components/Navbar.vue'
import Footer from '../components/Footer.vue'
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>