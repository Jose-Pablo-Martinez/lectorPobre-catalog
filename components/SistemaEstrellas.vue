<!--
  @file SistemaEstrellas.vue
  @description Componente envoltorio en español para StarRating (Fase 5.6).
  @satisfies RF-06
-->
<script setup lang="ts">
import StarRating, { type StarRatingProps } from './StarRating.vue';

defineProps<StarRatingProps>();
</script>

<template>
    <StarRating v-bind="$props" />
</template>

