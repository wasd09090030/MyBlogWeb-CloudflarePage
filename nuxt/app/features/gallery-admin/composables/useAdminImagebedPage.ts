import { h } from 'vue'

export function useAdminImagebedPage() {
  const message = useMessage()
  const dialog = useDialog()
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

  const configRules = {
    domain: { required: true, message: '请输入图床域名', trigger: 'blur' },
    apiToken: { required: true, message: '请输入API Token', trigger: 'blur' }
  }

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
    configFormRef.value?.validate(async (errors: any) => {
      if (!errors) {
        savingConfig.value = true
        try {
          await imagebedApi.saveConfig(configForm.value)
          showConfigModal.value = false
          message.success('配置已保存')
          fetchFileList()
        } catch (error: any) {
          message.error('保存配置失败: ' + error.message)
        } finally {
          savingConfig.value = false
        }
      }
    })
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
      message.error(`获取列表失败: ${error.message}`)
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
      message.success('链接已复制')
    } catch {
      message.error('复制失败')
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
        message.success('文件夹删除成功')
        fetchFileList()
      } else {
        throw new Error(result.error || 'Delete failed')
      }
    } catch (error: any) {
      message.error(`删除失败: ${error.message}`)
    }
  }

  const confirmDeleteFolder = (folderPath: string) => {
    executeDeleteFolder(folderPath)
  }

  const confirmBatchDelete = () => {
    dialog.warning({
      title: '批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.value.length} 个文件吗？`,
      positiveText: '删除',
      negativeText: '取消',
      onPositiveClick: executeBatchDelete
    })
  }

  const executeBatchDelete = async () => {
    listLoading.value = true
    try {
      await imagebedApi.deleteMultipleFiles({
        domain: configForm.value.domain,
        apiToken: configForm.value.apiToken,
        filePaths: selectedRowKeys.value
      })

      message.success('删除完成')
      selectedRowKeys.value = []
      fetchFileList()
    } catch (error: any) {
      message.error(`批量删除失败: ${error.message}`)
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
        message.success('文件删除成功')
        fetchFileList()
      } else {
        throw new Error(result.error || 'Delete failed')
      }
    } catch (error: any) {
      message.error(`删除失败: ${error.message}`)
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
        message.success('上传成功')
        onFinish?.()
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      message.error(`上传失败: ${error.message}`)
      onError?.()
    }
  }

  const fileColumns = [
    { type: 'selection' },
    {
      title: '预览',
      key: 'preview',
      width: 60,
      render: (row: any) => h('div', { class: 'w-10 h-10 rounded overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer', onClick: () => previewFile(row) }, [
        h('img', { src: row.fullUrl, class: 'w-full h-full object-cover' })
      ])
    },
    {
      title: '文件名',
      key: 'name',
      ellipsis: { tooltip: true },
      render: (row: any) => h('span', {
        class: 'text-blue-500 cursor-pointer hover:underline',
        title: row.name,
        onClick: () => copyToClipboard(row.fullUrl)
      }, row.displayName)
    },
    { title: '大小', key: 'size', width: 100 },
    { title: '上传时间', key: 'time', width: 180 },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (row: any) => h('div', { class: 'flex gap-2' }, [
        h('n-button', { size: 'tiny', secondary: true, onClick: () => copyToClipboard(row.fullUrl) }, { default: () => '复制' }),
        h('n-popconfirm', {
          onPositiveClick: () => executeDeleteFromList(row)
        }, {
          trigger: () => h('n-button', { size: 'tiny', type: 'error', quaternary: true }, { default: () => '删除' }),
          default: () => '确定删除吗？'
        })
      ])
    }
  ]

  const uploadedColumns = [
    {
      title: '预览',
      key: 'preview',
      width: 60,
      render: (row: any) => h('img', { src: row.url, class: 'w-10 h-10 object-cover rounded' })
    },
    { title: '文件名', key: 'name', ellipsis: true },
    {
      title: '链接',
      key: 'url',
      ellipsis: true,
      render: (row: any) => h('span', { class: 'text-blue-500 cursor-pointer', onClick: () => copyToClipboard(row.url) }, row.url)
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      render: (row: any) => h('n-button', { size: 'tiny', secondary: true, onClick: () => copyToClipboard(row.url) }, { default: () => '复制' })
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
    configRules,
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
