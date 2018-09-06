/**
 * 模块依赖
 */

const utility = require('ibird-utils');
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
        const _query = ctx.query;
        try {
            let _project = utility.parse(_query.project);
            _project = Object.keys(_project).length > 0 ? _project : utility.str2Obj(_query.project);
            _query.project = _project;
            const data = await dataAdapter.id(name, ctx.query.val, async (args) => {
                await hooks(pres, { ctx, args });
            }, _query.project);
            const result = { data };
            await hooks(posts, { ctx, data: result, body: result });
            ctx.body = ctx.body || result;
        } catch (e) {
            ctx.body = errors(e, { errmsg: opts.getLocaleString('mongoose_adapter_error_id') }, opts);
        }
    };
};