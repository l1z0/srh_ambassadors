const ALLOWED_FIELDS = ['username', 'email', 'avatar', 'study_programme'];

export default (plugin: any) => {
  plugin.controllers.user.update = async (ctx: any) => {
    const strapi = (global as any).strapi;
    const requesterId = ctx.state.user?.id;
    const { id } = ctx.params;
    if (!requesterId) return ctx.unauthorized();
    if (Number(id) !== requesterId) {
      return ctx.forbidden('You can only edit your own profile.');
    }

    const body = ctx.request.body ?? {};
    const data: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in body) data[field] = body[field];
    }

    if (typeof data.username === 'string') {
      const existing = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { username: data.username },
      });
      if (existing && existing.id !== requesterId) {
        return ctx.badRequest('Username already taken');
      }
    }
    if (typeof data.email === 'string') {
      const existing = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { email: data.email.toLowerCase() },
      });
      if (existing && existing.id !== requesterId) {
        return ctx.badRequest('Email already taken');
      }
      data.email = data.email.toLowerCase();
    }

    const updated = await strapi.db.query('plugin::users-permissions.user').update({
      where: { id: requesterId },
      data,
      populate: ['role', 'avatar'],
    });

    const { password, resetPasswordToken, confirmationToken, ...safe } = updated;
    ctx.send(safe);
  };

  return plugin;
};
