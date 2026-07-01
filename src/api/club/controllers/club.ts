/**
 * club controller
 */

import { factories } from '@strapi/strapi';

const AMBASSADOR_ROLE_NAME = 'Ambassador';

export default factories.createCoreController('api::club.club', ({ strapi }) => ({
  async create(ctx) {
    if (ctx.state.user) {
      ctx.request.body.data = {
        ...ctx.request.body.data,
        owner: ctx.state.user.id,
        members: [ctx.state.user.id],
      };
    }

    return super.create(ctx);
  },

  async join(ctx) {
    const { id } = ctx.params;
    const userId = ctx.state.user?.id;
    if (!userId) {
      return ctx.unauthorized('You must be logged in to join a club.');
    }

    const club = await strapi.documents('api::club.club').findOne({
      documentId: id,
      populate: ['owner', 'members', 'pendingMembers'],
    });
    if (!club) return ctx.notFound('Club not found.');

    if (club.owner?.id === userId) {
      return ctx.badRequest('You already own this club.');
    }
    if (club.members?.some((member: any) => member.id === userId)) {
      return ctx.badRequest('You are already a member of this club.');
    }
    if (club.pendingMembers?.some((member: any) => member.id === userId)) {
      return ctx.badRequest('Your request is already pending approval.');
    }

    const updated = await strapi.documents('api::club.club').update({
      documentId: id,
      data: {
        pendingMembers: { connect: [{ id: userId }] },
      },
    });

    return { data: updated };
  },

  async leave(ctx) {
    const { id } = ctx.params;
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized('You must be logged in.');

    const club = await strapi.documents('api::club.club').findOne({
      documentId: id,
      populate: ['owner', 'members'],
    });
    if (!club) return ctx.notFound('Club not found.');

    if (club.owner?.id === userId) {
      return ctx.badRequest('Club owners cannot leave their own club.');
    }
    if (!club.members?.some((member: any) => member.id === userId)) {
      return ctx.badRequest('You are not a member of this club.');
    }

    const updated = await strapi.documents('api::club.club').update({
      documentId: id,
      data: { members: { disconnect: [{ id: userId }] } },
    });

    return { data: updated };
  },

  async approve(ctx) {
    const { id, userId } = ctx.params;
    const requesterId = ctx.state.user?.id;
    if (!requesterId) return ctx.unauthorized();

    const club = await strapi.documents('api::club.club').findOne({
      documentId: id,
      populate: ['owner'],
    });
    if (!club) return ctx.notFound('Club not found.');
    if (!club.owner || club.owner.id !== requesterId) {
      return ctx.forbidden('Only the club owner can approve membership requests.');
    }

    const updated = await strapi.documents('api::club.club').update({
      documentId: id,
      data: {
        members: { connect: [{ id: Number(userId) }] },
        pendingMembers: { disconnect: [{ id: Number(userId) }] },
      },
    });

    return { data: updated };
  },

  async reject(ctx) {
    const { id, userId } = ctx.params;
    const requesterId = ctx.state.user?.id;
    if (!requesterId) return ctx.unauthorized();

    const club = await strapi.documents('api::club.club').findOne({
      documentId: id,
      populate: ['owner'],
    });
    if (!club) return ctx.notFound('Club not found.');
    if (!club.owner || club.owner.id !== requesterId) {
      return ctx.forbidden('Only the club owner can reject membership requests.');
    }

    const updated = await strapi.documents('api::club.club').update({
      documentId: id,
      data: {
        pendingMembers: { disconnect: [{ id: Number(userId) }] },
      },
    });

    return { data: updated };
  },

  async approveProposal(ctx) {
    const { id } = ctx.params;
    if (ctx.state.user?.role?.name !== AMBASSADOR_ROLE_NAME) {
      return ctx.forbidden('Only ambassadors can approve club proposals.');
    }

    const club = await strapi.documents('api::club.club').findOne({ documentId: id });
    if (!club) return ctx.notFound('Club not found.');

    const updated = await strapi.documents('api::club.club').update({
      documentId: id,
      data: { isApproved: true },
    });

    return { data: updated };
  },

  async rejectProposal(ctx) {
    const { id } = ctx.params;
    if (ctx.state.user?.role?.name !== AMBASSADOR_ROLE_NAME) {
      return ctx.forbidden('Only ambassadors can reject club proposals.');
    }

    const club = await strapi.documents('api::club.club').findOne({ documentId: id });
    if (!club) return ctx.notFound('Club not found.');

    await strapi.documents('api::club.club').delete({ documentId: id });

    return { data: { id } };
  },
}));
