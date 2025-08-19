<template>
    <button @click="handleClick" style="position: fixed; top: 20px; right: 20px;">
      Custom Vue Button
    </button>
  </template>
  
  <script setup lang="ts">
  const handleClick = () => {
    alert('Hello from Vue component!');
  };
  </script>
  