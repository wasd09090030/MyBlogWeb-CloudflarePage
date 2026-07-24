<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    <div
      v-for="gallery in galleries"
      :key="gallery.id"
      class="gallery-card"
      :class="{
        'is-drag-over-before': sortBy === 'manual' && dragOverGallery?.id === gallery.id && dragPosition === 'before',
        'is-drag-over-after': sortBy === 'manual' && dragOverGallery?.id === gallery.id && dragPosition === 'after'
      }"
      :draggable="sortBy === 'manual'"
      @dragstart="handleDragStart($event, gallery)"
      @dragover.prevent="handleDragOver($event, gallery)"
      @drop="handleDrop($event, gallery)"
      @dragend="handleDragEnd"
    >
      <UCard :class="{ 'opacity-50': draggedGallery?.id === gallery.id }">
        <div v-if="sortBy === 'manual'" class="drag-handle absolute top-2 left-2 z-10 cursor-move opacity-60 hover:opacity-100">
          <Icon name="bars-3" size="md" class="text-white drop-shadow-lg" />
        </div>

        <div class="image-container relative group">
          <img
            :src="gallery.thumbnailUrl || gallery.imageUrl"
            :alt="`图片 ${gallery.id}`"
            class="w-full h-48 object-cover rounded-t-lg"
            @error="handleImageError"
          />

          <div class="image-overlay absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <UButton variant="ghost" color="primary" icon square size="sm" @click="editGallery(gallery)">
              <Icon name="pencil-square" size="md" class="text-white" />
            </UButton>
            <UButton variant="ghost" color="primary" icon square size="sm" @click="toggleActive(gallery)">
              <Icon :name="gallery.isActive ? 'eye' : 'eye'" size="md" class="text-white" />
            </UButton>
            <UButton variant="ghost" color="error" icon square size="sm" @click="confirmDelete(gallery)">
              <Icon name="trash" size="md" class="text-red-400" />
            </UButton>
          </div>

          <div class="absolute top-2 right-2">
            <UBadge :color="gallery.isActive ? 'success' : 'neutral'" size="sm" variant="subtle">
              {{ gallery.isActive ? '显示' : '隐藏' }}
            </UBadge>
          </div>
        </div>

        <div class="grid grid-cols-3 items-center p-3 text-xs text-gray-500">
          <span>#{{ gallery.sortOrder }}</span>
          <span class="text-center">{{ formatDimensions(gallery) }}</span>
          <span class="text-right">{{ formatDate(gallery.createdAt) }}</span>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  galleries: any[]
  sortBy: string
  draggedGallery: any
  dragOverGallery: any
  dragPosition: 'before' | 'after'
  handleDragStart: (event: DragEvent, gallery: any) => void
  handleDragOver: (event: DragEvent, gallery: any) => void
  handleDrop: (event: DragEvent, gallery: any) => Promise<void>
  handleDragEnd: () => void
  editGallery: (gallery: any) => void
  toggleActive: (gallery: any) => Promise<void>
  confirmDelete: (gallery: any) => void
  formatDimensions: (gallery: any) => string
  formatDate: (value: string) => string
  handleImageError: (event: Event) => void
}>()
</script>

<style scoped>
.gallery-card {
  transition: transform 0.2s ease;
}

.gallery-card:hover {
  transform: translateY(-4px);
}

.gallery-card.is-drag-over-before {
  box-shadow: inset 0 3px 0 rgba(59, 130, 246, 0.9);
}

.gallery-card.is-drag-over-after {
  box-shadow: inset 0 -3px 0 rgba(59, 130, 246, 0.9);
}

.drag-handle {
  transition: opacity 0.2s;
}
</style>
