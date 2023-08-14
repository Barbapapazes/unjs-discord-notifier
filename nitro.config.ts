export default defineNitroConfig({
  preset: 'cloudflare',

  storage: {
    cache: {
      driver: 'cloudflare-kv-binding',
      binding: 'cache',
    },
  },

  devStorage: {
    cache: {
      driver: 'fs',
      base: './.nitro/cache',
    },
  },
})
