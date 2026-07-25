export type MarkdownCommand = {
  label: string
  icon: string
  type: 'wrap' | 'prefix' | 'block'
  before?: string
  after?: string
  placeholder?: string
  value?: string
  caretOffset?: number
}

export type MarkdownTemplate = { label: string, icon: string, value: string, group: 'mdc' }

export const markdownCommands: MarkdownCommand[] = [
  { label: 'Bold', icon: 'i-lucide-bold', type: 'wrap', before: '**', after: '**', placeholder: 'bold text' },
  { label: 'Italic', icon: 'i-lucide-italic', type: 'wrap', before: '*', after: '*', placeholder: 'italic text' },
  { label: 'Underline', icon: 'i-lucide-underline', type: 'wrap', before: '<u>', after: '</u>', placeholder: 'underlined text' },
  { label: 'Strikethrough', icon: 'i-lucide-strikethrough', type: 'wrap', before: '~~', after: '~~', placeholder: 'struck text' },
  { label: 'Subscript', icon: 'i-lucide-subscript', type: 'wrap', before: '<sub>', after: '</sub>', placeholder: 'subscript' },
  { label: 'Superscript', icon: 'i-lucide-superscript', type: 'wrap', before: '<sup>', after: '</sup>', placeholder: 'superscript' },
  { label: 'Inline code', icon: 'i-lucide-code', type: 'wrap', before: '`', after: '`', placeholder: 'code' },
  { label: 'Link', icon: 'i-lucide-link', type: 'wrap', before: '[', after: '](https://example.com)', placeholder: 'link text' },
  { label: 'Heading', icon: 'i-lucide-heading-2', type: 'prefix', value: '## ' },
  { label: 'Quote', icon: 'i-lucide-quote', type: 'prefix', value: '> ' },
  { label: 'Bulleted list', icon: 'i-lucide-list', type: 'prefix', value: '- ' },
  { label: 'Numbered list', icon: 'i-lucide-list-ordered', type: 'prefix', value: '1. ' },
  { label: 'Task list', icon: 'i-lucide-list-todo', type: 'prefix', value: '- [ ] ' },
  { label: 'Image', icon: 'i-lucide-image', type: 'block', value: '![Image description](https://example.com/image.jpg)' },
  { label: 'Table', icon: 'i-lucide-table', type: 'block', value: '| Column | Value |\n| --- | --- |\n| Item | Value |' },
  { label: 'Code block', icon: 'i-lucide-code-2', type: 'block', value: '```ts\n// Code\n```', caretOffset: '```ts\n'.length },
  { label: 'Mermaid diagram', icon: 'i-lucide-git-fork', type: 'block', value: '```mermaid\nflowchart LR\n  A[Start] --> B[Finish]\n```', caretOffset: '```mermaid\n'.length },
  { label: 'Math block', icon: 'i-lucide-sigma', type: 'block', value: '$$\nE = mc^2\n$$', caretOffset: 3 },
  { label: 'Divider', icon: 'i-lucide-minus', type: 'block', value: '---' }
]

export const mdcTemplates: MarkdownTemplate[] = [
  { label: 'Alert', icon: 'i-lucide-info', value: '::alert{type="info"}\n#title\nNotice\n#default\nWrite the message here.\n::', group: 'mdc' },
  { label: 'Tabs', icon: 'i-lucide-panels-top-left', value: '::tabs\n---\nlabels: ["First", "Second"]\n---\n#tab-0\nFirst tab\n#tab-1\nSecond tab\n::', group: 'mdc' },
  { label: 'Collapse', icon: 'i-lucide-panel-top-close', value: '::collapse{title="More content"}\nWrite the collapsed content here.\n::', group: 'mdc' },
  { label: 'Code playground', icon: 'i-lucide-square-code', value: '::code-playground{lang="javascript" title="Example" runnable}\nconsole.log("Hello World!")\n::', group: 'mdc' },
  { label: 'Link card', icon: 'i-lucide-link-2', value: '::link-card{url="https://example.com" text="Example link"}\n::', group: 'mdc' },
  { label: 'Image comparison', icon: 'i-lucide-columns-2', value: '::image-comparison{before="/before.jpg" after="/after.jpg" aspectRatio="16/9"}\n::', group: 'mdc' },
  { label: 'Web embed', icon: 'i-lucide-video', value: '::web-embed{url="https://example.com" aspectRatio="16/9"}\n::', group: 'mdc' },
  { label: 'Star rating', icon: 'i-lucide-star', value: '::star-rating{rating="4.5" maxStars="5" label="Rating" showScore}\n::', group: 'mdc' },
  { label: 'Steps', icon: 'i-lucide-list-checks', value: '::steps{current="1" status="process"}\n---\nsteps:\n  - title: "First step"\n  - title: "Second step"\n---\n::', group: 'mdc' },
  { label: 'GitHub card', icon: 'i-lucide-github', value: '::github-card{repo="nuxt/nuxt" branch="main"}\n::', group: 'mdc' },
  { label: 'Enhanced image', icon: 'i-lucide-image-plus', value: '::image-enhanced{src="https://example.com/image.jpg" caption="Image caption" zoomable shadow rounded}\n::', group: 'mdc' },
  { label: 'Typewriter', icon: 'i-lucide-keyboard', value: '::type-writer{text="Welcome" speed="60" cursor}\n::', group: 'mdc' },
  { label: 'Spoiler', icon: 'i-lucide-eye-off', value: '::spoiler{label="Spoiler warning" clickText="Click to reveal"}\nHidden content\n::', group: 'mdc' },
  { label: 'Related articles', icon: 'i-lucide-newspaper', value: '::related-articles{count="3"}\n::', group: 'mdc' }
]
