import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started',
        'concepts/concepts',
      ],
    },
    {
      type: 'category',
      label: 'REST API',
      items: [
        'api/rest-api-overview',
        'api/rest-api-authentication',
        'api/rest-api-market-data',
        'api/rest-api-backtests',
        'api/rest-api-strategies',
      ],
    },
    {
      type: 'category',
      label: 'Runtimes',
      items: [
        'runtime-contract',
        'runtimes/python-sdk',
        'runtimes/wasm-guide',
      ],
    },
    {
      type: 'category',
      label: 'Self-Hosting',
      items: [
        'self-hosting/self-hosting-overview',
        'self-hosting-architecture',
        'self-hosting-deployment',
      ],
    },
  ],
};

export default sidebars;
