import {defineManifest} from '@crxjs/vite-plugin'

export default defineManifest({
  name: 'create-chrome-ext',
  description: '',
  version: '0.0.0',
  manifest_version: 3,
  icons: {
    16: 'img/logo-16.png',
    32: 'img/logo-34.png',
    48: 'img/logo-48.png',
    128: 'img/logo-128.png',
  },
  action: {
    default_popup: 'popup.html',
    default_icon: 'img/logo-48.png',
  },
  options_page: 'options.html',
  background: {
    service_worker: 'src/background/index.js',
    type: 'module',
  },
  content_scripts: [
    {
      matches: [
        'http://*.youtube.com/*',
        'https://*.youtube.com/*'
      ],
      css: ['src/content/style.css'],
      js: ['src/content/index.js'],
    },
  ],
  web_accessible_resources: [
    {
      resources: ['img/logo-16.png', 'img/logo-34.png', 'img/logo-48.png', 'img/logo-128.png', 'src/content/style.css'],
      matches: [
        'http://*.youtube.com/*',
        'https://*.youtube.com/*'
      ],
    },
  ],
  permissions: [
    "activeTab",
    "tabs",
    "storage",
    "webNavigation",
  ],
})