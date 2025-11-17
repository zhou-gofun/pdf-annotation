<script setup lang="ts">
import { ref } from 'vue'
const fileUrl = ref('')
</script>

<template>
    <iframe :src="'../public/pdfjs-5.4.54-dist/web/viewer.html?file=' + fileUrl"
      style="width: 100vh; height: 800px"
    ></iframe>
  <div>asdasdasd</div>
</template>
<style scoped>
</style>
