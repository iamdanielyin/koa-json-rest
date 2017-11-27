/**
 * 模块依赖
 */

const utility = require('ibird-utils');
const errors = require('../errors');
const hooks = require('../hooks');

/**
 * 执行删除的路由
 * @param {string} name - 元数据名称
 * @param {Object} dataAdapter - 数据适配器
 * @param {Object} opts - 配置项
 * @param {function[]} [pres] - 前置函数组
 * @param {function[]} [posts] - 后置函数组
 */
module.exports = (name, dataAdapter, opts, pres, posts) => {
    return async function removeRoute(ctx) {
        const body = ctx.request.body;
        body.cond = body.cond || utility.parse(ctx.query.cond);
        body.removeAll = body.removeAll || ctx.query.removeAll;
        ctx.request.body = body;
        try {
            const result = {};
            if (Object.keys(body.cond).length > 0 || body.removeAll) {
                await hooks(pres, { ctx, data: body });
                const _body = ctx.request.body;
                const _r = await dataAdapter.remove(name, _body.cond);
                Object.assign(result, _r.result || _r);
                await hooks(posts, { ctx, data: result });
            }
            ctx.body = { data: result };
        } catch (e) {
            ctx.body = errors(e, opts.getLocaleString('mongoose_adapter_error_remove'), opts);
        }
    };
};