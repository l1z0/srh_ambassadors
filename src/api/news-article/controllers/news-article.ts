/**
 * news-article controller
 */

import { factories } from '@strapi/strapi';

async function canSeeArticle(strapi, articleId, membersOnly, userId) {
  if (!membersOnly) return true;
  if (!userId) return false;

  const article = await strapi.db.query('api::news-article.news-article').findOne({
    where: { id: articleId },
    populate: { club: { populate: ['owner', 'members'] } },
  });
  const club = article?.club;
  if (!club) return false;
  if (club.owner?.id === userId) return true;
  return !!club.members?.some((member) => member.id === userId);
}

export default factories.createCoreController('api::news-article.news-article', ({ strapi }) => ({
  async create(ctx) {
    const userId = ctx.state.user?.id;
    if (!userId) return ctx.unauthorized();

    ctx.request.body.data = {
      ...ctx.request.body.data,
      author: userId,
    };

    return super.create(ctx);
  },

  async find(ctx) {
    const response = await super.find(ctx);
    const userId = ctx.state.user?.id;

    const filtered = [];
    for (const article of response.data ?? []) {
      if (await canSeeArticle(strapi, article.id, article.membersOnly, userId)) {
        filtered.push(article);
      }
    }
    response.data = filtered;

    return response;
  },

  async findOne(ctx) {
    const response = await super.findOne(ctx);
    if (!response?.data) return response;

    const userId = ctx.state.user?.id;
    const allowed = await canSeeArticle(strapi, response.data.id, response.data.membersOnly, userId);
    if (!allowed) return ctx.notFound('Article not found.');

    return response;
  },
}));
