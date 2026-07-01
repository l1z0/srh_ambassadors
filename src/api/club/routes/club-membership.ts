export default {
  type: 'content-api',
  routes: [
    {
      method: 'POST',
      path: '/clubs/:id/join',
      handler: 'club.join',
      config: {
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/clubs/:id/approve/:userId',
      handler: 'club.approve',
      config: {
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/clubs/:id/reject/:userId',
      handler: 'club.reject',
      config: {
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/clubs/:id/leave',
      handler: 'club.leave',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/clubs/:id/approve-proposal',
      handler: 'club.approveProposal',
      config: {
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/clubs/:id/reject-proposal',
      handler: 'club.rejectProposal',
      config: {
        policies: [],
      },
    },
  ],
};
