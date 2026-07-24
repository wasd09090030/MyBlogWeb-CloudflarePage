import { h } from 'vue'

export function useAdminImagebedPage() {
  const toast = useToast()
  const imagebedApi = useImagebed()

  const viewMode = ref('grid')
  const currentPath = ref('')
  const searchKeyword = ref('')
  const listLoading = ref(false)
  const showConfigModal = ref(false)
  const savingConfig = ref(false)
  const showPreviewModal = ref(false)
  const previewUrl = ref('')

  const items = ref<any[]>([])
  const currentFiles = ref<any[]>([])
  const currentFolders = ref<any[]>([])
  const totalCount = ref(0)
  const currentPage = ref(1)
  const pageSize = 50
  const selectedRowKeys = ref<string[]>([])

  const uploadRef = ref<any>(null)
  const uploadedFiles = ref<any[]>([])
  const acceptTypes = 'image/jpeg,image/png,image/gif,image/webp,image/avif'

  const configFormRef = ref<any>(null)
  const configForm = ref({
    domain: '',
    apiToken: '',
    uploadFolder: ''
  })

  const isConfigured = computed(() => !!configForm.value.domain && !!configForm.value.apiToken)

  const pathSegments = computed(() => {
    return currentPath.value ? currentPath.value.split('/').filter(Boolean) : []
  })

  const loadConfig = async () => {
    try {
      const config = await imagebedApi.getConfig()
      if (config) {
        configForm.value = {
          domain: config.domain || '',
          apiToken: config.apiToken || '',
          uploadFolder: config.uploadFolder || ''
        }
      }
    } catch (error) {
      console.error('加载配置失败:', error)
    }
  }

  const saveConfig = async () => {
    if (!configForm.value.domain || !configForm.value.apiToken) {
      toast.add({ title: '请输入图床域名和API Token', color: 'warning' })
      return
    }

    savingConfig.value = true
    try {
      await imagebedApi.saveConfig(configForm.value)
      showConfigModal.value = false
      toast.add({ title: '配置已保存', color: 'success' })
      fetchFileList()
    } catch (error: any) {
      toast.add({ title: '保存配置失败: ' + error.message, color: 'error' })
    } finally {
      savingConfig.value = false
    }
  }

  const navigateTo = (path: string) => {
    currentPath.value = path
    currentPage.value = 1
    searchKeyword.value = ''
    fetchFileList()
  }

  const getPathUpTo = (index: number) => {
    return pathSegments.value.slice(0, index + 1).join('/')
  }

  const fetchFileList = async () => {
    if (!isConfigured.value) return

    listLoading.value = true
    selectedRowKeys.value = []

    try {
      const result = await imagebedApi.getFileList({
        domain: configForm.value.domain,
        apiToken: configForm.value.apiToken,
        start: (currentPage.value - 1) * pageSize,
        count: pageSize,
        search: searchKeyword.value,
        dir: currentPath.value
      })

      const files = (result.files || []).map((file: any) => ({
        name: file.name,
        displayName: file.name.split('/').pop(),
        size: imagebedApi.formatFileSize(file.size),
        type: file.type,
        time: imagebedApi.formatTimestamp(file.timestamp),
        fullUrl: file.url,
        isFolder: false
      }))

      const folders = (result.directories || []).map((dir: string) => {
        const fullPath = dir.replace(/\/$/, '')
        return {
          name: fullPath,
          displayName: fullPath.split('/').pop(),
          isFolder: true
        }
      })

      currentFiles.value = files
      currentFolders.value = folders
      items.value = [...folders, ...files]
      totalCount.value = result.totalCount || (files.length + folders.length)
    } catch (error: any) {
      console.error('List error:', error)
      toast.add({ title: `获取列表失败: ${error.message}`, color: 'error' })
    } finally {
      listLoading.value = false
    }
  }

  const handlePageChange = (page: number) => {
    currentPage.value = page
    fetchFileList()
  }

  const toggleSelection = (key: string, checked: boolean) => {
    if (checked) {
      selectedRowKeys.value.push(key)
    } else {
      selectedRowKeys.value = selectedRowKeys.value.filter((k) => k !== key)
    }
  }

  const handleCheck = (keys: string[]) => {
    selectedRowKeys.value = keys
  }

  const previewFile = (file: any) => {
    previewUrl.value = file.fullUrl
    showPreviewModal.value = true
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.add({ title: '链接已复制', color: 'success' })
    } catch {
      toast.add({ title: '复制失败', color: 'error' })
    }
  }

  const copyAllUrls = async () => {
    const urls = uploadedFiles.value.map((f) => f.url).join('\n')
    await copyToClipboard(urls)
  }

  const clearUploaded = () => {
    uploadedFiles.value = []
  }

  const setSearchKeyword = (value: string) => {
    searchKeyword.value = value
  }

  const setViewMode = (value: string) => {
    viewMode.value = value
  }

  const executeDeleteFolder = async (folderPath: string) => {
    try {
      const result = await imagebedApi.deleteFolder({
        domain: configForm.value.domain,
        apiToken: configForm.value.apiToken,
        folderPath
      })

      if (result.success) {
        toast.add({ title: '文件夹删除成功', color: 'success' })
        fetchFileList()
      } else {
        throw new Error(result.error || 'Delete failed')
      }
    } catch (error: any) {
      toast.add({ title: `删除失败: ${error.message}`, color: 'error' })
    }
  }

  const confirmDeleteFolder = (folderPath: string) => {
    executeDeleteFolder(folderPath)
  }

  const confirmBatchDelete = () => {
    if (selectedRowKeys.value.length === 0) {
      toast.add({ title: '请先选择要删除的文件', color: 'warning' })
      return
    }
    if (window.confirm(`确定要删除选中的 ${selectedRowKeys.value.length} 个文件吗？`)) {
      executeBatchDelete()
    }
  }

  const executeBatchDelete = async () => {
    listLoading.value = true
    try {
      await imagebedApi.deleteMultipleFiles({
        domain: configForm.value.domain,
        apiToken: configForm.value.apiToken,
        filePaths: selectedRowKeys.value
      })

      toast.add({ title: '删除完成', color: 'success' })
      selectedRowKeys.value = []
      fetchFileList()
    } catch (error: any) {
      toast.add({ title: `批量删除失败: ${error.message}`, color: 'error' })
    } finally {
      listLoading.value = false
    }
  }

  const executeDeleteFromList = async (row: any) => {
    try {
      const result = await imagebedApi.deleteFile({
        domain: configForm.value.domain,
        apiToken: configForm.value.apiToken,
        filePath: row.name
      })

      if (result.success) {
        toast.add({ title: '文件删除成功', color: 'success' })
        fetchFileList()
      } else {
        throw new Error(result.error || 'Delete failed')
      }
    } catch (error: any) {
      toast.add({ title: `删除失败: ${error.message}`, color: 'error' })
    }
  }

  const handlePaste = (event: ClipboardEvent) => {
    const clipboardData = event.clipboardData
    if (!clipboardData) return

    const pasteItems = clipboardData.items
    for (const item of pasteItems) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          uploadImageDirectly(file)
        }
      }
    }
  }

  const uploadImageDirectly = async (file: File) => {
    const dummyOption = {
      file: { file, name: file.name },
      onFinish: () => {},
      onError: () => {}
    }
    await handleUpload(dummyOption as any)
  }

  const handleUpload = async ({ file, onFinish, onError }: any) => {
    try {
      const result = await imagebedApi.uploadImage(file.file, {
        domain: configForm.value.domain,
        apiToken: configForm.value.apiToken,
        uploadFolder: configForm.value.uploadFolder
      })

      if (result.success) {
        uploadedFiles.value.unshift({
          name: result.fileName,
          url: result.url,
          src: result.src,
          uploadTime: new Date().toLocaleTimeString()
        })
        toast.add({ title: '上传成功', color: 'success' })
        onFinish?.()
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.add({ title: `上传失败: ${error.message}`, color: 'error' })
      onError?.()
    }
  }

  const fileColumns = [
    {
      id: 'preview',
      header: '预览',
      cell: ({ row }: any) => h('div', {
        class: 'w-10 h-10 rounded overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer',
        onClick: () => previewFile(row.original)
      }, [
        h('img', { src: row.original.fullUrl, class: 'w-full h-full object-cover' })
      ])
    },
    {
      id: 'name',
      header: '文件名',
      cell: ({ row }: any) => h('span', {
        class: 'text-blue-500 cursor-pointer hover:underline',
        onClick: () => copyToClipboard(row.original.fullUrl)
      }, row.original.displayName)
    },
    { id: 'size', header: '大小', accessorKey: 'size' },
    { id: 'time', header: '上传时间', accessorKey: 'time' },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }: any) => h('div', { class: 'flex gap-2' }, [
        h(resolveComponent('UButton'), {
          size: 'xs',
          variant: 'soft',
          onClick: () => copyToClipboard(row.original.fullUrl)
        }, () => '复制'),
        h(resolveComponent('UButton'), {
          size: 'xs',
          variant: 'ghost',
          color: 'error',
          onClick: () => {
            if (window.confirm('确定删除吗？')) {
              executeDeleteFromList(row.original)
            }
          }
        }, () => '删除')
      ])
    }
  ]

  const uploadedColumns = [
    {
      id: 'preview',
      header: '预览',
      cell: ({ row }: any) => h('img', { src: row.original.url, class: 'w-10 h-10 object-cover rounded' })
    },
    { id: 'name', header: '文件名', accessorKey: 'name' },
    {
      id: 'url',
      header: '链接',
      cell: ({ row }: any) => h('span', {
        class: 'text-blue-500 cursor-pointer',
        onClick: () => copyToClipboard(row.original.url)
      }, row.original.url)
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }: any) => h(resolveComponent('UButton'), {
        size: 'xs',
        variant: 'soft',
        onClick: () => copyToClipboard(row.original.url)
      }, () => '复制')
    }
  ]

  return {
    viewMode,
    currentPath,
    searchKeyword,
    listLoading,
    showConfigModal,
    savingConfig,
    showPreviewModal,
    previewUrl,
    items,
    currentFiles,
    currentFolders,
    totalCount,
    currentPage,
    pageSize,
    selectedRowKeys,
    uploadRef,
    uploadedFiles,
    acceptTypes,
    configFormRef,
    configForm,
    isConfigured,
    pathSegments,
    fileColumns,
    uploadedColumns,
    loadConfig,
    saveConfig,
    navigateTo,
    getPathUpTo,
    fetchFileList,
    handlePageChange,
    toggleSelection,
    handleCheck,
    previewFile,
    copyToClipboard,
    copyAllUrls,
    clearUploaded,
    setSearchKeyword,
    setViewMode,
    confirmDeleteFolder,
    confirmBatchDelete,
    executeDeleteFromList,
    handlePaste,
    handleUpload
  }
}
