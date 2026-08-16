<template>
  <!-- 桌面端侧边栏 -->
  <div class="desktop-sidebar hidden lg:block sidebar-fade-in">
    <div class="sidebar-content">
      <!-- 站长卡片 -->
      <section class="sidebar-section side-author-section">
        <div class="side-author">
          <span class="side-author-ava">W</span>
          <div class="side-author-meta">
            <div class="side-author-name">WyrmKk</div>
            <div class="side-author-bio">全栈开发 · 游戏玩家 · 数字花园园丁</div>
          </div>
        </div>
        <div class="side-author-stats">
          <div><b>{{ articleCount }}</b><span>文章</span></div>
          <div><b>{{ categories.length }}</b><span>分类</span></div>
          <div><b>18</b><span>标签</span></div>
        </div>
      </section>

      <!-- 文章分类 -->
      <section class="sidebar-section category-section">
        <h4 class="side-section-title">
          <Icon name="heroicons:folder-open" size="md" />
          <span>文章分类</span>
        </h4>
        <div class="side-cat-list">
          <button
            v-for="category in categories"
            :key="category.key"
            type="button"
            class="side-cat-row"
            @click="goToCategory(category.key)"
          >
            <span class="side-cat-icon">
              <Icon :name="category.icon" size="md" />
            </span>
            <span class="side-cat-label">{{ category.label }}</span>
            <span class="side-cat-count">{{ category.count }} 篇</span>
          </button>
        </div>
      </section>

      <!-- 归档 -->
      <section class="sidebar-section archive-section">
        <h4 class="side-section-title">
          <Icon name="heroicons:calendar" size="md" />
          <span>归档</span>
        </h4>
        <div class="archive-list">
          <div v-for="month in monthArchives" :key="month.key" class="archive-item">
            <span class="archive-month">{{ month.label }}</span>
            <span class="archive-count">{{ month.count }} 篇</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { useArticlesFeature } from '~/features/article-list/composables/useArticlesFeature'

const router = useRouter();

const categoryConfig = [
  { key: 'study', label: '学习笔记', icon: 'heroicons:document-text' },
  { key: 'game', label: '游戏评测', icon: 'mdi:gamepad-variant' },
  { key: 'work', label: '个人作品', icon: 'heroicons:code-bracket-square' },
  { key: 'resource', label: '资源分享', icon: 'heroicons:folder-open' }
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

// 文章总数
const articleCount = computed(() => {
  const categoryStats = sidebarStatsData.value?.categoryStats || {};
  return Object.values(categoryStats).reduce((sum, count) => sum + (count || 0), 0);
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
};
</script>

<style scoped>
@import '../assets/css/components/SideBar.desktop.css';
@import '../assets/css/components/SideBar.mobile.css';
</style>
