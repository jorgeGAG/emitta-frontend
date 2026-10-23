export default {
  '/api': {
    target: 'https://api-emitta.nexorf.dev',
    secure: false,
    changeOrigin: true,
    configure: (proxy, options) => {
      proxy.on('proxyReq', (proxyReq, req, res) => {
        proxyReq.removeHeader('origin');
        proxyReq.removeHeader('referer');
      });
    }
  },
  '/actuator': {
    target: 'https://api-emitta.nexorf.dev',
    secure: false,
    changeOrigin: true
  }
};
