<template>
    <div class="CustomSidebar">
      <div>打开侧边栏</div>
      <!-- <el-card 
        v-for="(card, index) in cards" 
        :key="index" 
        :header="card.title" 
        :bordered="false" 
        style="margin-bottom: 10px"
      >
        <el-button type="primary" @click="handleButtonClick(index)">
          {{ card.buttonText }}
        </el-button>
      </el-card> -->
    </div>
  </template>
  
  <script setup>
  // import { Button, Card } from 'element-ui'
  import './sidebar/index.scss'
  
  const props = defineProps({
    onClick: Function
  })
  
  const cards = [
    { title: 'Card title', buttonText: '按钮 1' },
    { title: 'Card title', buttonText: '按钮 2' },
    { title: 'Card title', buttonText: '按钮 3' },
    { title: 'Card title', buttonText: '按钮 4' },
    { title: 'Card title', buttonText: '按钮 5' }
  ]
  
  const handleButtonClick = (index) => {
    props.onClick(index)
  }
  </script>
  
  <style scoped lang="scss">
.CustomSidebar {
    right: 0;
    position: absolute;
    top: 64px;
    width: 250px;
    bottom: 0;
    z-index: 10;
    background: goldenrod;
    text-align: center;
    padding: 5px;
}
  </style>