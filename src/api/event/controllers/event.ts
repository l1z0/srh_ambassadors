/**
 * event controller
 */

import { factories } from '@strapi/strapi';

async function canSeeEvent(strapi, eventId, membersOnly, userId) {
  if (!membersOnly) return true;
  if (!userId) return false;

  const event = await strapi.db.query('api::event.event').findOne({
    where: { id: eventId },
    populate: { club: { populate: ['owner', 'members'] } },
  });
  const club = event?.club;
  if (!club) return false;
  if (club.owner?.id === userId) return true;
  return !!club.members?.some((member) => member.id === userId);
}

export default factories.createCoreController('api::event.event', ({ strapi }) => ({
  async create(ctx) {
    const userId = ctx.state.user?.id;
    const clubId = ctx.request.body?.data?.club;
    if (!userId) return ctx.unauthorized();
    if (!clubId) return ctx.badRequest('A club is required.');

    const club = await strapi.db.query('api::club.club').findOne({
      where: { id: clubId },
      populate: ['owner'],
    });
    if (!club) return ctx.notFound('Club not found.');
    if (!club.owner || club.owner.id !== userId) {
      return ctx.forbidden('Only the club owner can add events to this club.');
    }

    ctx.request.body.data = {
      ...ctx.request.body.data,
      host: userId,
      attendees: { connect: [{ id: userId }] },
    };

    return super.create(ctx);
  },

  async register(ctx) {
    const { id } = ctx.params;
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('You must be logged in to register for an event.');

    const event = await strapi.documents('api::event.event').findOne({
      documentId: id,
      populate: { club: { populate: ['owner', 'members'] }, attendees: true },
    });
    if (!event) return ctx.notFound('Event not found.');

    const canSee = await canSeeEvent(strapi, event.id, event.membersOnly, userId);
    if (!canSee) return ctx.notFound('Event not found.');

    if (event.attendees?.some((attendee) => attendee.id === userId)) {
      return ctx.badRequest('You are already registered for this event.');
    }

    const updated = await strapi.documents('api::event.event').update({
      documentId: id,
      data: { attendees: { connect: [{ id: userId }] } },
    });

    return { data: updated };
  },

  async unregister(ctx) {
    const { id } = ctx.params;
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('You must be logged in.');

    const event = await strapi.documents('api::event.event').findOne({
      documentId: id,
      populate: ['attendees'],
    });
    if (!event) return ctx.notFound('Event not found.');

    if (!(event.attendees as any[])?.some((a: any) => a.id === userId)) {
      return ctx.badRequest('You are not registered for this event.');
    }

    await strapi.documents('api::event.event').update({
      documentId: id,
      data: { attendees: { disconnect: [{ id: userId }] } } as any,
    });

    return ctx.send({ ok: true });
  },

  async update(ctx) {
    const { id } = ctx.params;
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized();

    const existing = await strapi.documents('api::event.event').findOne({
      documentId: id,
      populate: { club: { populate: ['owner'] } },
    });
    if (!existing) return ctx.notFound('Event not found.');
    if (!existing.club?.owner || existing.club.owner.id !== userId) {
      return ctx.forbidden('Only the club owner can edit this event.');
    }

    return super.update(ctx);
  },

  async delete(ctx) {
    const { id } = ctx.params;
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized();

    const existing = await strapi.documents('api::event.event').findOne({
      documentId: id,
      populate: { club: { populate: ['owner'] } },
    });
    if (!existing) return ctx.notFound('Event not found.');
    if (!existing.club?.owner || existing.club.owner.id !== userId) {
      return ctx.forbidden('Only the club owner can delete this event.');
    }

    return super.delete(ctx);
  },

  async find(ctx) {
    const response = await super.find(ctx);
    const userId = ctx.state.user?.id;

    const filtered = [];
    for (const event of response.data ?? []) {
      if (await canSeeEvent(strapi, event.id, event.membersOnly, userId)) {
        filtered.push(event);
      }
    }
    response.data = filtered;

    return response;
  },

  async findOne(ctx) {
    const response = await super.findOne(ctx);
    if (!response?.data) return response;

    const userId = ctx.state.user?.id;
    const allowed = await canSeeEvent(strapi, response.data.id, response.data.membersOnly, userId);
    if (!allowed) return ctx.notFound('Event not found.');

    return response;
  },
}));
