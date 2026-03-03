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

const categoryConfig = [
  { key: 'study', label: '学习', icon: 'journal-text' },
  { key: 'game', label: '游戏', icon: 'controller' },
  { key: 'work', label: '个人作品', icon: 'code-square' },
  { key: 'resource', label: '资源分享', icon: 'folder2-open' }
];

const buildSidebarStats = (articles = []) => {
  const nextCategoryStats = { study: 0, game: 0, work: 0, resource: 0 };
  const nextMonthStats = {};

  articles.forEach((article) => {
    if (article?.category && nextCategoryStats[article.category] !== undefined) {
      nextCategoryStats[article.category] = (nextCategoryStats[article.category] || 0) + 1;
    }

    if (!article?.createdAt) return;

    const date = new Date(article.createdAt);
    if (Number.isNaN(date.getTime())) return;

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    nextMonthStats[key] = (nextMonthStats[key] || 0) + 1;
  });

  return {
    categoryStats: nextCategoryStats,
    monthStats: nextMonthStats
  };
};

const { getAllArticles } = useArticlesFeature();

const { data: sidebarStatsData } = await useAsyncData(
  'sidebar-stats-ssg',
  async () => {
    const articles = await getAllArticles();
    return buildSidebarStats(Array.isArray(articles) ? articles : []);
  },
  {
    server: true,
    default: () => buildSidebarStats([])
  }
);

// 计算属性：分类列表（响应式更新）
const categories = computed(() => {
  const categoryStats = sidebarStatsData.value?.categoryStats || {};
  return categoryConfig.map(cat => ({
    ...cat,
    count: categoryStats[cat.key] || 0
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
  const monthStats = sidebarStatsData.value?.monthStats || {};
  const baseMonths = generateRecentMonths();
  return baseMonths.map(month => ({
    ...month,
    count: monthStats[month.key] || 0
  }));
});

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

onMounted(() => {
  isHydrated.value = true;
  document.addEventListener('click', handleClickOutside);
  const savedState = localStorage.getItem('sidebarState');
  if (savedState) {
    isCollapsed.value = savedState === 'collapsed';
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
@import'../assets/css/components/SideBar.styles.css';
</style>
