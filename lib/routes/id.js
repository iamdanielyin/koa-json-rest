/**
 * 模块依赖
 */

const errors = require('../errors');
const hooks = require('../hooks');

/**
 * 执行ID查询的路由
 * @param {string} name - 元数据名称
 * @param {Object} dataAdapter - 数据适配器
 * @param {Object} opts - 配置项
 * @param {function[]} [pres] - 前置函数组
 * @param {function[]} [posts] - 后置函数组
 */
module.exports = (name, dataAdapter, opts, pres, posts) => {
    return async function idRoute(ctx) {
        try {
            const data = await dataAdapter.id(name, ctx.params.id, async (args) => {
                await hooks(pres, { ctx, args });
            });
            const result = { data };
            await hooks(posts, { ctx, data: result });
            ctx.body = result;
        } catch (e) {
            ctx.body = errors(e, opts);
        }
    };
};