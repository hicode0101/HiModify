import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: 'HiModify',
    description: '修改请求头和返回数据：修改 HTTP 请求/响应头，录制并 Mock 重放 API',
    minimum_chrome_version: '111',
    permissions: ['storage', 'unlimitedStorage', 'declarativeNetRequest'],
    host_permissions: ['<all_urls>'],
    action: {
      default_title: 'HiModify',
    },
  },
});
