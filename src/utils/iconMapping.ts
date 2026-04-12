import {
  X, ChevronDown, RefreshCw, RotateCcw, User, Settings, LogOut,
  Trash2, Trash, Folder, FolderPlus, FolderOpen, Edit, History,
  Mic, ThumbsUp, ThumbsDown, Star, Quote, Bookmark, Plus,
  Download, ExternalLink, CheckCircle, XCircle, Dot,
  Brain, Cpu, Sparkles, StopCircle, ArrowLeft, Navigation,
  MessageSquare, GraduationCap, MoreHorizontal, MoreVertical, Upload,
  Search, Copy, Eye, EyeOff, ChevronRight, ChevronFirst, ChevronLast,
  FileText, Files, Image, Send, Volume2, VolumeX
} from 'lucide-react';

/**
 * 图标映射表
 * 将旧的 PNG 图标名称映射到 lucide-react 图标组件
 */
export const iconMap = {
  // 关闭/打开
  'chat-page-close': X,
  'chat-page-open': ChevronDown,
  'paper-critationclose': X,
  'slibar-closerslibar': X,

  // 刷新
  'paper-refresh': RefreshCw,
  'paper-shinyrefresh': RefreshCw,
  'chat-page-changekeyorquestion': RotateCcw,

  // 设置
  'settings-person': User,
  'settings-shinyperson': User,
  'settings-setting': Settings,
  'settings-shinysetting': Settings,
  'exit1': LogOut,

  // 删除
  'settings-delete': Trash2,
  'paper-details': Trash,

  // 文件夹
  'folderpng1': Folder,
  'slibar-createbase': FolderPlus,
  'slibar-shinycreatebase': FolderPlus,
  'slibar-openslibar': FolderOpen,
  'slibar-history': History,
  'slibar-shinyhistory': History,

  // 语音
  'chat-page-voice': Mic,

  // 点赞/点踩
  'paper-like': ThumbsUp,
  'paper-clicklike': ThumbsUp,
  'paper-dislike': ThumbsDown,
  'paper-shinydislike': ThumbsDown,
  'like1': Star,
  'dislike1': X,

  // 引用/收藏
  'paper-quote': Quote,
  'paper-shinyquote': Quote,
  'quote1': Quote,
  'paper-save': Bookmark,
  'paper-clicksave': Plus,

  // 下载/链接
  'paper-download': Download,
  'paper-shinydownload': Download,
  'paper-offitialwebsite': ExternalLink,
  'paper-shinyoffitialwebsite': ExternalLink,

  // 成功/失败
  'chat-page-success': CheckCircle,
  'chat-page-lose': XCircle,
  'point1': Dot,

  // 思考
  'think1': Brain,
  'chat-page-deep-think-1': Brain,
  'chat-page-deep-think-2': Sparkles,

  // 停止
  'chat-page-stopchat': StopCircle,

  // 导航
  'paper-last': ArrowLeft,
  'papers-navigation': Navigation,

  // 功能模式
  'qqqa1': MessageSquare,
  'deepstudy1': GraduationCap,

  // 更多
  'chat-page-more': MoreHorizontal,

  // 文件
  'chat-page-add-file': Upload,
  'slibar-files': Files,
  'slibar-shinyfiles': Files,

  // 其他
  'paper-look': Eye,
  'paper-copy': Copy,
  'paper-preview': Eye,
  'chat-page-websitepaper': ExternalLink,
  'slibar-myfiles': FileText,
  'slibar-shinymyfiles': FileText,
  'slibar-questions-answers': MessageSquare,
  'slibar-shinyquestions-answers': MessageSquare,
} as const;

export type IconName = keyof typeof iconMap;

/**
 * 获取图标组件
 */
export function getIcon(name: string): React.ComponentType<{ className?: string; width?: number; height?: number }> | null {
  // 移除路径和扩展名
  const cleanName = name
    .replace(/^.*\//, '') // 移除路径
    .replace(/@\dx\.png$/, '') // 移除 @2x.png 等后缀
    .replace(/\.png$/, '') // 移除 .png
    .replace(/\.svg$/, '') as IconName;

  return iconMap[cleanName] || null;
}
