/**
 * 模块依赖
 */

const utility = require('ibird-utils');
const errors = require('../errors');
const hooks = require('../hooks');

/**
 * 执行更新的路由
 * @param {string} name - 元数据名称
 * @param {Object} dataAdapter - 数据适配器
 * @param {Object} opts - 配置项
 * @param {function[]} [pres] - 前置函数组
 * @param {function[]} [posts] - 后置函数组
 */
module.exports = (name, dataAdapter, opts, pres, posts) => {
    return async function updateRoute(ctx) {
        const body = ctx.request.body;
        body.cond = body.cond || utility.parse(ctx.query.cond);
        body.doc = body.doc || utility.parse(ctx.query.doc);
        ctx.request.body = body;
        try {
            await hooks(pres, { ctx, data: body });
            const _body = ctx.request.body;
            const result = { data: null };
            if (Object.keys(_body.cond).length > 0 || (_body.options && _body.options.multi)) {
                const data = await dataAdapter.update(name, _body.cond, _body.doc, _body.options);
                Object.assign(result, { data });
                await hooks(posts, { ctx, data: result });
            } else {
                ctx.body = errors(null, {
                    errmsg: opts.getLocaleString('mongoose_adapter_error_update'),
                    errstack: `'cond' and 'doc' is required.`
                }, opts);
                return;
            }
            ctx.body = ctx.body || result;
        } catch (e) {
            ctx.body = errors(e, opts.getLocaleString('mongoose_adapter_error_update'), opts);
        }
    };
};