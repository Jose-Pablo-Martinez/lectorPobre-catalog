<!--
  @file FormularioComentario.vue
  @description Componente envoltorio en español para CommentForm (Fase 5.6).
  @satisfies RF-07, RNF-04
-->
<script setup lang="ts">
import CommentForm, { type CommentFormProps } from './CommentForm.vue';

defineProps<CommentFormProps>();
</script>

<template>
    <CommentForm v-bind="$props" />
</template>

