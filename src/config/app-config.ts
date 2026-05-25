// 应用配置文件

// 包含所有可配置选项
export interface AppConfig {
  // 控制 TocToggles 组件（主题切换+语言切换）的显示状态
  showTocToggles: boolean;
  // 控制导航栏固定/滚动显示状态
  navbarFixed: boolean;
  // 控制页脚版权信息显示状态
  showFooterCopyright: boolean;
  // 新闻分页配置
  newsPagination: {
    // 桌面端每页显示新闻数量
    desktopItemsPerPage: number;
    // 移动端每页显示新闻数量
    mobileItemsPerPage: number;
    // 分页最大显示页码数
    maxDisplayedPages: number;
  };
}

// 默认配置
export const appConfig: AppConfig = {
  showTocToggles: true,
  navbarFixed: true,
  showFooterCopyright: true,
  newsPagination: {
    desktopItemsPerPage: 6,
    mobileItemsPerPage: 2,
    maxDisplayedPages: 5
  }
};
