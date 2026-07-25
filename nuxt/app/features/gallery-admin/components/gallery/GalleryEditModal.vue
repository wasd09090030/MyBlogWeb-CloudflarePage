<template>
  <UModal
    :open="show"
    @update:open="onUpdateShow"
    :title="isEdit ? '编辑图片' : '添加图片'"
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #body>
      <UForm :state="galleryForm">
        <UFormField label="图片URL" name="imageUrl" required>
          <UInput
            :model-value="galleryForm.imageUrl"
            @update:model-value="onUpdateImageUrl"
            placeholder="https://example.com/image.jpg"
          />
        </UFormField>

        <UFormField label="序号" name="sortOrder">
          <UInputNumber
            :model-value="galleryForm.sortOrder"
            @update:model-value="onUpdateSortOrder"
            :min="1"
            :precision="0"
            placeholder="留空则自动追加到末尾"
            class="w-full"
          />
        </UFormField>

        <div v-if="galleryForm.imageUrl" class="mb-4">
          <UFormField label="预览" name="preview">
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
          </UFormField>
        </div>

        <UFormField label="类型" name="tag">
          <div class="flex items-center gap-3">
            <span class="text-sm text-gray-500">艺术作品</span>
            <USwitch
              :model-value="galleryForm.tag"
              @update:model-value="onUpdateTag"
              true-value="game"
              false-value="artwork"
            />
            <span class="text-sm text-gray-500">游戏截屏</span>
          </div>
        </UFormField>

        <UFormField v-if="isEdit" label="创建时间" name="createdAt">
          <div class="w-full">
            <UInput
              :model-value="galleryForm.createdAt ? new Date(galleryForm.createdAt).toISOString().slice(0, 16) : ''"
              type="datetime-local"
              @update:model-value="(v) => onUpdateCreatedAt(v ? new Date(v).toISOString() : null)"
            />
            <p class="text-xs text-gray-400 mt-1">主要用于控制游戏截屏的月份分组，修改后在前端会重新归入对应月份</p>
          </div>
        </UFormField>

        <UFormField name="isActive">
          <UCheckbox
            :model-value="galleryForm.isActive"
            @update:model-value="onUpdateActive"
          >
            在前端显示此图片
          </UCheckbox>
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" color="neutral" @click="onCancel">取消</UButton>
        <UButton color="primary" :loading="isSaving" @click="onSave">
          {{ isEdit ? '更新' : '创建' }}
        </UButton>
      </div>
    </template>
  </UModal>
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
