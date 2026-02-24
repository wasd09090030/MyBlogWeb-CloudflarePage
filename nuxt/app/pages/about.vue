<template>
  <section class="about-page">
    <!-- Hero Section -->
    <div class="about-hero">
      <div class="hero-content">
        <div class="hero-header">
          <div
            class="hero-role-badge fade-up"
            :style="{ animationDelay: '0.1s' }"
          >
            <Icon name="code-slash" size="sm" /> {{ ownerProfile.role }}
          </div>
          
          <h1 class="hero-title">
            <span
              class="d-block text-muted fs-4 fw-normal mb-2 fade-up"
              :style="{ animationDelay: '0.2s' }"
            >
              Hi, I'm
            </span>
            <span class="fade-up" :style="{ animationDelay: '0.3s' }">
              {{ ownerProfile.name }}
            </span>
          </h1>
          
          <p class="hero-desc fade-up" :style="{ animationDelay: '0.4s' }">
            {{ ownerProfile.description }}
          </p>

          <div class="hero-tags" style="margin-top: 1.5rem; margin-bottom: 1rem; display: flex; flex-wrap: wrap; gap: 0.6rem;">
            <span
              v-for="(tag, index) in ownerProfile.tags"
              :key="tag"
              class="hero-tag fade-up"
              :style="{ animationDelay: `${0.5 + index * 0.05}s` }"
              style="padding: 0.35rem 0.85rem; background: rgba(255,255,255,0.5); border: 1px solid rgba(0,0,0,0.1); border-radius: 20px; font-size: 0.85rem; color: #666; cursor: default;"
            >
              # {{ tag }}
            </span>
          </div>
        </div>

        <div class="hero-stats-row">
          <div
            v-for="(stat, index) in heroStats"
            :key="stat.label"
            class="hero-stat fade-up"
            :style="{ animationDelay: `${0.5 + index * 0.1}s` }"
          >
            <span class="stat-value">{{ stat.value }}</span>
            <span class="stat-label">{{ stat.label }}</span>
          </div>
        </div>

        <div class="hero-actions">
          <button
            class="btn-primary fade-scale"
            @click="goToArticles"
            :style="{ animationDelay: '0.8s' }"
          >
            <Icon name="lightning-charge-fill" size="sm" :solid="true" class="me-2" />最新作品
          </button>
          <a
            class="btn-outline fade-scale"
            href="https://github.com/wasd09090030"
            target="_blank"
            rel="noopener"
            :style="{ animationDelay: '0.9s' }"
          >
            <Icon name="github" size="sm" class="me-2" />GitHub
          </a>
        </div>
      </div>

      <div class="hero-visual">
        <div class="profile-card-wrapper">
          <div
            class="profile-image-card fade-scale-rotate"
            :style="{ animationDelay: '0.3s' }"
          >
            <img
              src="https://cfimg.wasd09090030.top/file/websource/1770014436617_host_compressed.webp"
              alt="Profile"
              class="profile-img"
              width="300"
              height="300"
              loading="eager"
              decoding="async"
              fetchpriority="high"
            />
          </div>
          
          <div
            class="floating-badge badge-1 fade-in"
            :style="{ animationDelay: '0.6s' }"
          >
            <Icon name="code-square" size="sm" /> Fullstack
          </div>
          
          <div
            class="floating-badge badge-2 fade-in"
            :style="{ animationDelay: '0.7s' }"
          >
            <Icon name="controller" size="sm" /> Gamer
          </div>
        </div>
        
        <div class="visual-decoration">
          <div class="circle-1"></div>
          <div class="circle-2"></div>
        </div>
      </div>
    </div>

    <!-- Highlights Grid -->
    <div class="highlights-section" v-once>
      <div
        v-for="(card, index) in highlightCards"
        :key="card.title"
        class="highlight-card fade-up"
        :style="{ animationDelay: `${index * 0.08}s` }"
      >
        <div class="card-icon" :style="{ background: card.accent }">
          <Icon :name="card.icon" size="lg" />
        </div>
        <h3>{{ card.title }}</h3>
        <p>{{ card.description }}</p>
      </div>
    </div>

    <!-- Projects Section -->
    <section class="projects-section" v-once>
      <div class="section-header">
        <span class="section-subtitle">PORTFOLIO</span>
        <h2 class="section-title">精选作品</h2>
        <p class="section-desc">代码与创意的结合，探索技术的无限可能。</p>
      </div>

      <div class="projects-grid">
        <div
          v-for="(project, index) in projects"
          :key="project.title"
          class="project-card fade-scale"
          :class="project.accent"
          :style="{ animationDelay: `${index * 0.08}s` }"
        >
          <div class="project-status">{{ project.status }}</div>
          <div class="project-content">
            <h3 class="project-title">{{ project.title }}</h3>
            <p class="project-desc">{{ project.description }}</p>
            
            <div class="project-tech">
              <span v-for="tag in project.tags" :key="tag" class="tech-tag">{{ tag }}</span>
            </div>

            <div class="project-footer">
              <div class="project-meta">
                <span><Icon name="activity" size="sm" /> {{ project.update }}</span>
              </div>
              <NuxtLink v-if="project.link" :to="project.link" class="project-link">
                {{ project.cta }} <Icon name="arrow-right" size="sm" />
              </NuxtLink>
              <a v-else :href="project.external" target="_blank" class="project-link">
                {{ project.cta }} <Icon name="box-arrow-up-right" size="sm" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Tech Stack Section -->
    <section class="tech-section" v-once>
      <div class="section-header">
        <span class="section-subtitle">TOOLBOX</span>
        <h2 class="section-title">技术栈</h2>
        <p class="section-desc">工欲善其事，必先利其器。</p>
      </div>

      <div class="tech-grid">
        <div
          v-for="(stack, index) in techStacks"
          :key="stack.title"
          class="tech-card fade-up"
          :style="{ animationDelay: `${index * 0.08}s` }"
        >
          <div class="tech-header">
            <Icon :name="stack.icon" size="lg" />
            <h3>{{ stack.title }}</h3>
          </div>
          <div class="tech-list">
            <span v-for="item in stack.items" :key="item" class="tech-pill">
              {{ item }}
            </span>
          </div>
        </div>
      </div>
    </section>
  </section>
</template>

<script setup>
useHead({
  title: 'WyrmKk - 关于我',
  meta: [{ name: 'description', content: '开发者个人主页，展示项目与技术栈' }],
  link: [
    { rel: 'preconnect', href: 'https://cfimg.wasd09090030.top', crossorigin: '' },
    { rel: 'dns-prefetch', href: 'https://cfimg.wasd09090030.top' }
  ]
})

const router = useRouter()

const ownerProfile = {
  name: 'WyrmKk',
  alias: 'Fullstack Dev',
  role: 'Developer & Gamer',
  description: '热衷探索,最爱白嫖;常年开摆,偶尔奋起,三天写代码两天查Bug',
  tags: ['大学生','全栈', '.NET', 'Vue/Nuxt', '开源爱好者', '休闲玩家','Duelist','宝藏猎人','galgame高手','PJSK低手','赤石大王'],
  callSign: 'WyrmKk',
  location: 'Jiangsu, CN',
  statusLine: '正在构建下一个有趣的项目...'
}

const heroStats = [
  { label: 'Coding Exp', value: '3 years+' },
  { label: 'Projects', value: '10+' },
  { label: 'Blog', value: '40+' }
]

const highlightCards = [
  {
    title: '前端开发',
    description: '基于Nuxt，注重交互体验与性能优化。',
    icon: 'window-stack',
    accent: 'linear-gradient(135deg, #6366f1, #8b5cf6)'
  },
  {
    title: '后端架构',
    description: '基于 .NET 8 构建稳健、高性能的 API 服务。',
    icon: 'hdd-network',
    accent: 'linear-gradient(135deg, #3b82f6, #0ea5e9)'
  },
  {
    title: 'Deployment & DevOps',
    description: 'BT panel+Cloudflare 自动化部署与服务器运维。',
    icon: 'clouds',
    accent: 'linear-gradient(135deg, #f59e0b, #ef4444)'
  }
]

const projects = [
  {
    title: 'Blog API Core',
    description: '基于 .NET 8 + EFCore + Sqlite3 的高性能博客后端。',
    status: 'LIVE',
    update: 'Weekly Updates',
    tags: ['.NET 8', 'EF Core', 'SQLite', 'Redis'],
    cta: 'API Docs',
    external: 'https://github.com/wasd09090030/MyBlogWeb/tree/master/backend-dotnet',
    accent: 'theme-violet'
  },
  {
    title: 'Nuxt Blog Client',
    description: '现代化的博客前台，SSR 渲染，集成 Motion 动画库，提供极致流畅的阅读体验。',
    status: 'LIVE',
    update: 'Active',
    tags: ['Nuxt 3', 'Pinia', 'TypeScript', 'Motion','Bootstrap 5'],
    cta: 'Live Demo',
    link: '/',
    accent: 'theme-blue'
  },
  {
    title: 'Anime Gallery',
    description: '二次元图片画廊，支持瀑布流布局与懒加载，沉浸式图片浏览体验。',
    status: 'NEW',
    update: 'v1.0 Released',
    tags: ['Vue 3', 'Swiper', 'LazyLoad'],
    cta: 'View Gallery',
    link: '/gallery',
    accent: 'theme-orange'
  },
    {
    title: 'Unity2D Mario Game',
    description: '类似马里奥的2D平台跳跃游戏，包含三个关卡和不同的敌人设计。',
    status: 'Playable',
    update: 'Playable Demo',
    tags: ['Unity2D', 'WebGL', 'C#'],
    cta: 'Go Play',
    external: 'https://yefei-gao.itch.io/the-homecoming-adventure-of-little-orange',
    accent: 'theme-red'
  },
     {
    title: 'RAG AI Chatbot',
    description: '基于检索增强生成（RAG）技术的智能故事生成，支持上下文理解与多轮对话。',
    status: 'Development',
    update: 'Beta',
    tags: ['Python', 'LangChain', 'Vue 3'],
    cta: 'Try Now',
    external: 'http://115.190.164.243:5174/rag-story',
    accent: 'theme-green'
  },
    {
    title: 'Flutter MusicPlayer',
    description: '使用Flutter开发的简单、现代化的本地音乐播放器，专为Android 13+设备设计。',
    status: 'Release',
    update: 'V1.0',
    tags: ['Flutter', 'Dart', 'Android'],
    cta: 'Repo',
    external: 'https://github.com/wasd09090030/Flutter_musicPlayer',
    accent: 'theme-dark'
  },
  {
    title: 'Live2D Miku',
    description: '基于Electron和Live2D SDK开发的桌面宠物，支持多种互动功能以及即时的AI api对话。',
    status: 'Release',
    update: 'V1.0',
    tags: ['Electron', 'JS', 'Live2D'],
    cta: 'Repo',
    external: 'https://github.com/wasd09090030/live2Dpet_Miku',
    accent: 'theme-LightGreen'
  },
    {
    title: 'Bilibili大数据可视化面板',
    description: '一个现代化的数据可视化平台，基于 React + FastAPI + ECharts 构建，提供多种交互式图表展示和数据分析功能',
    status: 'Release',
    update: 'V1.0',
    tags: ['React', 'ECharts', 'Python'],
    cta: 'Repo',
    external: 'https://github.com/wasd09090030/BigData_EChart',
    accent: 'theme-LightPink'
  },
   {
    title: 'QT后台交易管理系统',
    description: '使用QT开发的管理系统课设，使用Sqlite3储存数据，QT内置的图表实现可视化。',
    status: 'Debug',
    update: 'Source Code',
    tags: ['QT', 'C++'],
    cta: 'Repo',
    external: 'https://github.com/wasd09090030/Qwidget-Management_System',
    accent: 'theme-LightOrange'
  }
]

const techStacks = [
  {
    title: 'Frontend',
    icon: 'code-square',
    items: ['Vue 3', 'Nuxt 3', 'TypeScript', 'Tailwind', 'Bootstrap 5', 'Vite']
  },
  {
    title: 'Backend',
    icon: 'server',
    items: ['C#', '.NET 8', 'ASP.NET Core', 'Entity Framework', 'Python', 'Node.js']
  },
  {
    title: 'Database & Tools',
    icon: 'database',
    items: ['SQLite','MySql', 'Redis', 'PostgreSQL', 'Docker', 'Git', 'Nginx']
  },
  {
    title: 'AI assistants',
    icon: 'robot',
    items: ['Deepseek API', 'Copilot', 'Codex', 'Claude Code', 'Qwen']
  },
    {
    title: 'Desktop/Mobile development',
    icon: 'phone',
    items: ['Dart','Flutter','C++', 'QT', 'Electron', 'Webview2', 'ArkTS']
  }

]

const goToArticles = () => {
  router.push({ path: '/', query: { category: 'work' } })
}
</script>

<style scoped>
@import '~/assets/css/components/AboutPage.styles.css';
</style>
