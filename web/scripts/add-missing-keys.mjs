import fs from 'node:fs/promises'
import path from 'node:path'

const LOCALES_DIR = path.resolve('src/i18n/locales')
const SUPPORTED_LOCALES = ['en', 'zh', 'zh-TW', 'fr', 'ja', 'ru', 'vi']

// 新增的翻译键
const newKeys = {
  '素材管理': {
    en: 'Asset Management',
    zh: '素材管理',
    'zh-TW': '素材管理',
    fr: 'Gestion des ressources',
    ja: 'アセット管理',
    ru: 'Управление активами',
    vi: 'Quản lý tài nguyên',
  },
  '已同步 {{count}} 个分组': {
    en: 'Synced {{count}} groups',
    zh: '已同步 {{count}} 个分组',
    'zh-TW': '已同步 {{count}} 個分組',
    fr: 'Synchronisé {{count}} groupes',
    ja: '{{count}}個のグループを同期しました',
    ru: 'Синхронизировано {{count}} групп',
    vi: 'Đã đồng bộ {{count}} nhóm',
  },
  '管理您的视频、图片和音频素材库': {
    en: 'Manage your video, image, and audio asset library',
    zh: '管理您的视频、图片和音频素材库',
    'zh-TW': '管理您的影片、圖片和音頻素材庫',
    fr: 'Gérez votre bibliothèque de ressources vidéo, image et audio',
    ja: 'ビデオ、画像、オーディオアセットライブラリを管理',
    ru: 'Управляйте своей библиотекой видео, изображений и аудио ресурсов',
    vi: 'Quản lý thư viện tài nguyên video, hình ảnh và âm thanh của bạn',
  },
  '上传素材': {
    en: 'Upload Asset',
    zh: '上传素材',
    'zh-TW': '上傳素材',
    fr: 'Télécharger un ressource',
    ja: 'アセットをアップロード',
    ru: 'Загрузить активы',
    vi: 'Tải lên tài nguyên',
  },
  '导入URL': {
    en: 'Import URL',
    zh: '导入URL',
    'zh-TW': '導入URL',
    fr: 'Importer une URL',
    ja: 'URLをインポート',
    ru: 'Импортировать URL',
    vi: 'Nhập URL',
  },
  '同步素材库': {
    en: 'Sync Asset Library',
    zh: '同步素材库',
    'zh-TW': '同步素材庫',
    fr: 'Synchroniser la bibliothèque de ressources',
    ja: 'アセットライブラリを同期',
    ru: 'Синхронизировать библиотеку активов',
    vi: 'Đồng bộ thư viện tài nguyên',
  },
  '还没有素材分组，请先同步素材库': {
    en: 'No asset groups yet. Please sync the asset library first.',
    zh: '还没有素材分组，请先同步素材库',
    'zh-TW': '還沒有素材分組，請先同步素材庫',
    fr: 'Aucun groupe de ressources. Veuillez d\'abord synchroniser la bibliothèque.',
    ja: 'アセットグループがまだありません。まずアセットライブラリを同期してください。',
    ru: 'Нет групп активов. Сначала синхронизируйте библиотеку активов.',
    vi: 'Chưa có nhóm tài nguyên. Vui lòng đồng bộ thư viện tài nguyên trước.',
  },
  '素材上传成功': {
    en: 'Asset uploaded successfully',
    zh: '素材上传成功',
    'zh-TW': '素材上傳成功',
    fr: 'Ressource téléchargée avec succès',
    ja: 'アセットが正常にアップロードされました',
    ru: 'Активы успешно загружены',
    vi: 'Tải lên tài nguyên thành công',
  },
  '上传失败: {{error}}': {
    en: 'Upload failed: {{error}}',
    zh: '上传失败: {{error}}',
    'zh-TW': '上傳失敗：{{error}}',
    fr: 'Échec du téléchargement: {{error}}',
    ja: 'アップロード失敗: {{error}}',
    ru: 'Ошибка загрузки: {{error}}',
    vi: 'Tải lên thất bại: {{error}}',
  },
  '素材导入成功': {
    en: 'Asset imported successfully',
    zh: '素材导入成功',
    'zh-TW': '素材導入成功',
    fr: 'Ressource importée avec succès',
    ja: 'アセットが正常にインポートされました',
    ru: 'Активы успешно импортированы',
    vi: 'Nhập tài nguyên thành công',
  },
  '导入失败: {{error}}': {
    en: 'Import failed: {{error}}',
    zh: '导入失败: {{error}}',
    'zh-TW': '導入失敗：{{error}}',
    fr: 'Échec de l\'importation: {{error}}',
    ja: 'インポート失敗: {{error}}',
    ru: 'Ошибка импорта: {{error}}',
    vi: 'Nhập thất bại: {{error}}',
  },
  '素材数: {{count}}': {
    en: 'Assets: {{count}}',
    zh: '素材数: {{count}}',
    'zh-TW': '素材數：{{count}}',
    fr: 'Ressources: {{count}}',
    ja: 'アセット数: {{count}}',
    ru: 'Активы: {{count}}',
    vi: 'Tài nguyên: {{count}}',
  },
  '创建于: {{date}}': {
    en: 'Created: {{date}}',
    zh: '创建于: {{date}}',
    'zh-TW': '建立於：{{date}}',
    fr: 'Créé: {{date}}',
    ja: '作成: {{date}}',
    ru: 'Создано: {{date}}',
    vi: 'Tạo: {{date}}',
  },
  '查看': {
    en: 'View',
    zh: '查看',
    'zh-TW': '查看',
    fr: 'Afficher',
    ja: '表示',
    ru: 'Просмотр',
    vi: 'Xem',
  },
  '删除': {
    en: 'Delete',
    zh: '删除',
    'zh-TW': '刪除',
    fr: 'Supprimer',
    ja: '削除',
    ru: 'Удалить',
    vi: 'Xóa',
  },
  '移除': {
    en: 'Remove',
    zh: '移除',
    'zh-TW': '移除',
    fr: 'Supprimer',
    ja: '削除',
    ru: 'Удалить',
    vi: 'Xóa',
  },
  '上传': {
    en: 'Upload',
    zh: '上传',
    'zh-TW': '上傳',
    fr: 'Télécharger',
    ja: 'アップロード',
    ru: 'Загрузить',
    vi: 'Tải lên',
  },
  '取消': {
    en: 'Cancel',
    zh: '取消',
    'zh-TW': '取消',
    fr: 'Annuler',
    ja: 'キャンセル',
    ru: 'Отменить',
    vi: 'Hủy',
  },
  '图片': {
    en: 'Image',
    zh: '图片',
    'zh-TW': '圖片',
    fr: 'Image',
    ja: '画像',
    ru: 'Изображение',
    vi: 'Hình ảnh',
  },
  '视频': {
    en: 'Video',
    zh: '视频',
    'zh-TW': '影片',
    fr: 'Vidéo',
    ja: 'ビデオ',
    ru: 'Видео',
    vi: 'Video',
  },
  '音频': {
    en: 'Audio',
    zh: '音频',
    'zh-TW': '音頻',
    fr: 'Audio',
    ja: 'オーディオ',
    ru: 'Аудио',
    vi: 'Âm thanh',
  },
  '选择素材分组': {
    en: 'Select asset group',
    zh: '选择素材分组',
    'zh-TW': '選擇素材分組',
    fr: 'Sélectionnez un groupe de ressources',
    ja: 'アセットグループを選択',
    ru: 'Выберите группу активов',
    vi: 'Chọn nhóm tài nguyên',
  },
  '请输入URL': {
    en: 'Please enter a URL',
    zh: '请输入URL',
    'zh-TW': '請輸入URL',
    fr: 'Veuillez entrer une URL',
    ja: 'URLを入力してください',
    ru: 'Пожалуйста, введите URL',
    vi: 'Vui lòng nhập URL',
  },
  '素材URL': {
    en: 'Asset URL',
    zh: '素材URL',
    'zh-TW': '素材URL',
    fr: 'URL de la ressource',
    ja: 'アセットURL',
    ru: 'URL активов',
    vi: 'URL tài nguyên',
  },
  '输入要导入的素材URL地址': {
    en: 'Enter the asset URL to import',
    zh: '输入要导入的素材URL地址',
    'zh-TW': '輸入要導入的素材URL地址',
    fr: 'Entrez l\'URL de la ressource à importer',
    ja: 'インポートするアセットのURLを入力してください',
    ru: 'Введите URL активов для импорта',
    vi: 'Nhập URL tài nguyên để nhập',
  },
  '文件类型': {
    en: 'File Type',
    zh: '文件类型',
    'zh-TW': '檔案類型',
    fr: 'Type de fichier',
    ja: 'ファイルタイプ',
    ru: 'Тип файла',
    vi: 'Loại tệp',
  },
  '所属分组': {
    en: 'Asset Group',
    zh: '所属分组',
    'zh-TW': '所屬分組',
    fr: 'Groupe de ressources',
    ja: 'アセットグループ',
    ru: 'Группа активов',
    vi: 'Nhóm tài nguyên',
  },
  '可选，不选择时将创建新分组': {
    en: 'Optional. A new group will be created if not selected.',
    zh: '可选，不选择时将创建新分组',
    'zh-TW': '可選，不選擇時將建立新分組',
    fr: 'Facultatif. Un nouveau groupe sera créé s\'il n\'est pas sélectionné.',
    ja: 'オプション。選択しない場合は新しいグループが作成されます。',
    ru: 'Необязательно. Новая группа будет создана, если не выбрана.',
    vi: 'Tùy chọn. Nhóm mới sẽ được tạo nếu không được chọn.',
  },
  '导入': {
    en: 'Import',
    zh: '导入',
    'zh-TW': '導入',
    fr: 'Importer',
    ja: 'インポート',
    ru: 'Импортировать',
    vi: 'Nhập',
  },
  '获取素材列表失败': {
    en: 'Failed to get asset list',
    zh: '获取素材列表失败',
    'zh-TW': '獲取素材列表失敗',
    fr: 'Échec de l\'obtention de la liste des ressources',
    ja: 'アセットリストの取得に失敗',
    ru: 'Ошибка при получении списка активов',
    vi: 'Không thể lấy danh sách tài nguyên',
  },
  '同步失败: {{error}}': {
    en: 'Sync failed: {{error}}',
    zh: '同步失败: {{error}}',
    'zh-TW': '同步失敗：{{error}}',
    fr: 'Échec de la synchronisation: {{error}}',
    ja: '同期失敗: {{error}}',
    ru: 'Ошибка синхронизации: {{error}}',
    vi: 'Đồng bộ thất bại: {{error}}',
  },
  '请选择分组并选择文件': {
    en: 'Please select a group and choose files',
    zh: '请选择分组并选择文件',
    'zh-TW': '請選擇分組並選擇檔案',
    fr: 'Veuillez sélectionner un groupe et choisir des fichiers',
    ja: 'グループを選択してファイルを選択してください',
    ru: 'Пожалуйста, выберите группу и выберите файлы',
    vi: 'Vui lòng chọn nhóm và chọn tệp',
  },
}

async function addMissingKeys() {
  for (const locale of SUPPORTED_LOCALES) {
    const filePath = path.join(LOCALES_DIR, `${locale}.json`)
    const content = JSON.parse(await fs.readFile(filePath, 'utf8'))

    // 添加新键
    for (const [keyEn, translations] of Object.entries(newKeys)) {
      if (!content.translation[keyEn]) {
        content.translation[keyEn] = translations[locale] || translations.en
      }
    }

    // 排序键
    const sortedTranslation = Object.keys(content.translation)
      .sort()
      .reduce((acc, key) => {
        acc[key] = content.translation[key]
        return acc
      }, {})

    content.translation = sortedTranslation

    // 写入文件
    await fs.writeFile(
      filePath,
      JSON.stringify(content, null, 2) + '\n',
      'utf8'
    )
    console.log(`✓ Updated ${locale}.json`)
  }

  console.log('✓ All locales updated successfully')
}

await addMissingKeys()
