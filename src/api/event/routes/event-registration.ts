export default {
  type: 'content-api',
  routes: [
    {
      method: 'POST',
      path: '/events/:id/register',
      handler: 'event.register',
      config: { policies: [] },
    },
    {
      method: 'DELETE',
      path: '/events/:id/register',
      handler: 'event.unregister',
      config: { policies: [] },
    },
  ],
};
