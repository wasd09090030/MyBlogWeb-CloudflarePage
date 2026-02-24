<template>
  <!-- 桌面端侧边栏 -->
  <div class="desktop-sidebar d-none d-lg-block sidebar-fade-in">
    <div class="sidebar-content">
      <section class="sidebar-section category-section">
        <div class="category-grid">
          <button
            v-for="category in categories"
            :key="category.key"
            type="button"
            class="category-card"
            @click="goToCategory(category.key)"
          >
            <div class="category-main">
              <span class="category-icon">
                <Icon :name="category.icon" size="md" />
              </span>
              <p class="category-label">{{ category.label }}</p>
            </div>
            <span class="category-count">{{ category.count }} 篇</span>
          </button>
        </div>
      </section>

      <section class="sidebar-section archive-section">
        <div class="archive-list">
          <div
            v-for="month in monthArchives"
            :key="month.key"
            class="archive-item"
          >
            <div class="archive-meta">
              <p class="archive-month">{{ month.label }}</p>
            </div>
            <span class="archive-count">{{ month.count }} 篇</span>
          </div>
        </div>
      </section>
    </div>
  </div>

  <!-- 移动端浮动按钮 -->
  <div class="mobile-personal-info d-lg-none">
    <div class="personal-info-sidebar" v-show="!isCollapsed">
      <div class="sidebar-content">
        <section class="sidebar-section category-section">
          <div class="category-grid">
            <button
              v-for="category in categories"
              :key="category.key"
              type="button"
              class="category-card"
              @click="goToCategory(category.key)"
            >
              <div class="category-main">
                <span class="category-icon">
                  <Icon :name="category.icon" size="md" />
                </span>
                <p class="category-label">{{ category.label }}</p>
              </div>
              <span class="category-count">{{ category.count }} 篇</span>
            </button>
          </div>
        </section>

        <section class="sidebar-section archive-section">
          <div class="archive-list">
            <div
              v-for="month in monthArchives"
              :key="month.key"
              class="archive-item"
            >
              <div class="archive-meta">
                <p class="archive-month">{{ month.label }}</p>
              </div>
              <span class="archive-count">{{ month.count }} 篇</span>
            </div>
          </div>
        </section>
      </div>
    </div>

    <div class="toggle-button" @click="toggleCollapse">
      <Icon v-if="isHydrated" :name="isCollapsed ? 'layout-sidebar' : 'x-lg'" size="md" />
      <Icon v-else name="layout-sidebar" size="md" />
    </div>
  </div>
</template>

<script setup>
import { useArticlesFeature } from '~/features/article-list/composables/useArticlesFeature'

const router = useRouter();
const isCollapsed = ref(true);
const isHydrated = ref(false);

// 使用优化后的composable（带缓存）
const { getAllArticles, categoryStats, monthStats } = useArticlesFeature();

// 基础分类配置
const categoryConfig = [
  { key: 'study', label: '学习', icon: 'journal-text' },
  { key: 'game', label: '游戏', icon: 'controller' },
  { key: 'work', label: '个人作品', icon: 'code-square' },
  { key: 'resource', label: '资源分享', icon: 'folder2-open' }
];

// 计算属性：分类列表（响应式更新）
const categories = computed(() => {
  return categoryConfig.map(cat => ({
    ...cat,
    count: categoryStats.value?.[cat.key] || 0
  }));
});

const generateRecentMonths = (length = 6) => {
  const months = [];
  const now = new Date();

  for (let i = 0; i < length; i += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${date.getFullYear()}年${date.getMonth() + 1}月`;
    months.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label,
      year: date.getFullYear(),
      month: date.getMonth() + 1
    });
  }

  return months;
};

// 月份归档（计算属性，响应式更新）
const monthArchives = computed(() => {
  const baseMonths = generateRecentMonths();
  return baseMonths.map(month => ({
    ...month,
    count: monthStats.value?.[month.key] || 0
  }));
});

// 初始化：确保缓存已加载
const initStats = async () => {
  try {
    // 调用getAllArticles会自动使用/更新缓存
    await getAllArticles();
    console.log('SideBar: 文章统计完成（使用缓存）');
  } catch (error) {
    console.error('SideBar: 获取文章统计失败:', error);
  }
};

const goToCategory = (categoryKey) => {
  router.push({ path: '/', query: { category: categoryKey } });

  if (window.innerWidth < 992) {
    isCollapsed.value = true;
    localStorage.setItem('sidebarState', 'collapsed');
  }
};

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
  localStorage.setItem('sidebarState', isCollapsed.value ? 'collapsed' : 'expanded');
};

const handleClickOutside = (event) => {
  const sidebarContainer = document.querySelector('.mobile-personal-info');
  if (!isCollapsed.value && sidebarContainer && !sidebarContainer.contains(event.target)) {
    isCollapsed.value = true;
    localStorage.setItem('sidebarState', 'collapsed');
  }
};

onMounted(async () => {
  isHydrated.value = true;
  document.addEventListener('click', handleClickOutside);
  const savedState = localStorage.getItem('sidebarState');
  if (savedState) {
    isCollapsed.value = savedState === 'collapsed';
  }
  
  // 初始化文章统计（使用缓存）
  await initStats();
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
@import'../assets/css/components/SideBar.styles.css';
</style>
