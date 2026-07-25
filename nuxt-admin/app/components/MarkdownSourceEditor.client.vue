<script setup lang="ts">
import { EditorState } from '@codemirror/state'
import { keymap, EditorView, lineNumbers } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab, redo, undo } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const host = ref<HTMLElement>()
let editor: EditorView | undefined

function replaceSelection(text: string, selectionStart = text.length, selectionEnd = selectionStart) {
  if (!editor) return
  const selection = editor.state.selection.main
  editor.dispatch({
    changes: { from: selection.from, to: selection.to, insert: text },
    selection: { anchor: selection.from + selectionStart, head: selection.from + selectionEnd }
  })
  editor.focus()
}

function wrapSelection(before: string, after: string, placeholder: string) {
  if (!editor) return
  const selection = editor.state.selection.main
  const selected = editor.state.sliceDoc(selection.from, selection.to)
  const content = selected || placeholder
  const text = `${before}${content}${after}`
  const start = before.length
  replaceSelection(text, start, start + content.length)
}

function toggleLinePrefix(prefix: string) {
  if (!editor) return
  const selection = editor.state.selection.main
  const startLine = editor.state.doc.lineAt(selection.from)
  const endLine = editor.state.doc.lineAt(selection.to)
  const lines = Array.from({ length: endLine.number - startLine.number + 1 }, (_, index) => editor!.state.doc.line(startLine.number + index))
  const remove = lines.every(line => line.text.startsWith(prefix))
  const changes = lines.map(line => remove
    ? { from: line.from, to: line.from + prefix.length, insert: '' }
    : { from: line.from, insert: prefix })
  editor.dispatch({ changes, selection: { anchor: selection.from, head: selection.to } })
  editor.focus()
}

function insertBlock(text: string, caretOffset?: number) {
  if (!editor) return
  const selection = editor.state.selection.main
  const before = selection.from > 0 && editor.state.sliceDoc(selection.from - 1, selection.from) !== '\n' ? '\n\n' : '\n'
  const after = selection.to < editor.state.doc.length && editor.state.sliceDoc(selection.to, selection.to + 1) !== '\n' ? '\n\n' : '\n'
  const block = `${before}${text}${after}`
  replaceSelection(block, before.length + (caretOffset ?? text.length))
}

function update(value: string) {
  if (!editor || value === editor.state.doc.toString()) return
  editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } })
}

defineExpose({ replaceSelection, wrapSelection, toggleLinePrefix, insertBlock, undo: () => editor && undo(editor), redo: () => editor && redo(editor), focus: () => editor?.focus() })

watch(() => props.modelValue, update)

onMounted(() => {
  if (!host.value) return
  editor = new EditorView({
    state: EditorState.create({
      doc: props.modelValue,
      extensions: [lineNumbers(), history(), markdown(), keymap.of([
        { key: 'Mod-b', run: () => { wrapSelection('**', '**', 'bold text'); return true } },
        { key: 'Mod-i', run: () => { wrapSelection('*', '*', 'italic text'); return true } },
        { key: 'Mod-k', run: () => { wrapSelection('[', '](https://example.com)', 'link text'); return true } },
        ...defaultKeymap,
        ...historyKeymap,
        indentWithTab
      ]), EditorView.lineWrapping, EditorView.updateListener.of((change) => {
        if (change.docChanged) emit('update:modelValue', change.state.doc.toString())
      })]
    }),
    parent: host.value
  })
})
onBeforeUnmount(() => editor?.destroy())
</script>

<template><div ref="host" class="markdown-source-editor min-h-[32rem] text-sm" /></template>

<style scoped>
.markdown-source-editor :deep(.cm-editor) { min-height: 32rem; border: 1px solid var(--ui-border); border-radius: 6px; background: var(--ui-bg); }
.markdown-source-editor :deep(.cm-scroller) { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.markdown-source-editor :deep(.cm-focused) { outline: 2px solid color-mix(in srgb, var(--ui-primary) 30%, transparent); }
</style>
