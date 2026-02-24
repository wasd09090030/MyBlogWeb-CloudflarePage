<template>
  <n-modal :show="show" @update:show="onUpdateShow" preset="card" :title="isEdit ? '编辑图片' : '添加图片'" style="width: 500px;">
    <n-form :model="galleryForm">
      <n-form-item label="图片URL" required>
        <n-input :value="galleryForm.imageUrl" @update:value="onUpdateImageUrl" placeholder="https://example.com/image.jpg" />
      </n-form-item>

      <n-form-item label="序号">
        <n-input-number
          :value="galleryForm.sortOrder"
          @update:value="onUpdateSortOrder"
          :min="1"
          :precision="0"
          placeholder="留空则自动追加到末尾"
          class="w-full"
        />
      </n-form-item>

      <div v-if="galleryForm.imageUrl" class="mb-4">
        <n-form-item label="预览">
          <div class="w-full">
            <img
              :src="galleryForm.imageUrl"
              alt="预览图片"
              class="max-w-full h-48 object-contain rounded border"
              @error="onPreviewError"
              @load="onPreviewLoad"
            />
            <p v-if="!isValidPreview" class="text-yellow-500 text-sm mt-1">
              <Icon name="exclamation-circle" size="xs" />
              图片预览加载失败，请检查URL是否正确
            </p>
          </div>
        </n-form-item>
      </div>

      <n-form-item label="类型">
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-500">艺术作品</span>
          <n-switch :value="galleryForm.tag" @update:value="onUpdateTag" checked-value="game" unchecked-value="artwork">
            <template #checked>游戏截屏</template>
            <template #unchecked>艺术作品</template>
          </n-switch>
          <span class="text-sm text-gray-500">游戏截屏</span>
        </div>
      </n-form-item>

      <n-form-item v-if="isEdit" label="创建时间">
        <div class="w-full">
          <n-date-picker
            :value="galleryForm.createdAt ? new Date(galleryForm.createdAt).getTime() : null"
            type="datetime"
            clearable
            class="w-full"
            @update:value="(ts) => onUpdateCreatedAt(ts ? new Date(ts).toISOString() : null)"
          />
          <p class="text-xs text-gray-400 mt-1">主要用于控制游戏截屏的月份分组，修改后在前端会重新归入对应月份</p>
        </div>
      </n-form-item>

      <n-form-item>
        <n-checkbox :checked="galleryForm.isActive" @update:checked="onUpdateActive">
          在前端显示此图片
        </n-checkbox>
      </n-form-item>
    </n-form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <n-button @click="onCancel">取消</n-button>
        <n-button type="primary" :loading="isSaving" @click="onSave">
          {{ isEdit ? '更新' : '创建' }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
  isEdit: boolean
  isSaving: boolean
  isValidPreview: boolean
  galleryForm: { imageUrl: string; sortOrder: number | null; isActive: boolean; tag: string; createdAt: string | null }
  onUpdateShow: (v: boolean) => void
  onUpdateImageUrl: (v: string) => void
  onUpdateSortOrder: (v: number | null) => void
  onUpdateTag: (v: string) => void
  onUpdateActive: (v: boolean) => void
  onUpdateCreatedAt: (v: string | null) => void
  onPreviewError: () => void
  onPreviewLoad: () => void
  onCancel: () => void
  onSave: () => Promise<void>
}>()
</script>
