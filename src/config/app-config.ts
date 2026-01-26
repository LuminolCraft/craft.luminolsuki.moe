// 应用配置文件
// 包含所有可配置选项
export interface AppConfig {
  // 控制双语切换按钮的显示状态（显示/隐藏）
  showLanguageToggle: boolean;
  // 控制导航栏固定/滚动显示状态
  navbarFixed: boolean;
  // 控制页脚版权信息显示状态
  showFooterCopyright: boolean;
}

// 默认配置
export const appConfig: AppConfig = {
  showLanguageToggle: true,
  navbarFixed: true,
  showFooterCopyright: true
};
