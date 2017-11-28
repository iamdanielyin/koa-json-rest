/**
 * 模块依赖
 */

const utility = require('ibird-utils');
const errors = require('../errors');
const hooks = require('../hooks');

/**
 * 执行单个查询的路由
 * @param {string} name - 元数据名称
 * @param {Object} dataAdapter - 数据适配器
 * @param {Object} opts - 配置项
 * @param {function[]} [pres] - 前置函数组
 * @param {function[]} [posts] - 后置函数组
 */
module.exports = (name, dataAdapter, opts, pres, posts) => {
    return async function oneRoute(ctx) {
        const _query = ctx.query;
        _query.cond = utility.parse(_query.cond);
        let _project = utility.parse(_query.project);
        _project = Object.keys(_project).length > 0 ? _project : utility.str2Obj(_query.project);
        _query.project = _project;

        try {
            if (!_query.cond || Object.keys(_query.cond).length === 0) {
                ctx.body = errors(null, {
                    errmsg: opts.getLocaleString('mongoose_adapter_error_one'),
                    errstack: `'cond' is required.`
                }, opts);
                return;
            }
            const one = await dataAdapter.one(name, _query.cond, async (query) => {
                await hooks(pres, { ctx, query });
            }, _query.project);
            const result = { data: one };
            await hooks(posts, { ctx, data: result });
            ctx.body = result;
        } catch (e) {
            ctx.body = errors(e, opts.getLocaleString('mongoose_adapter_error_one'), opts);
        }
    };
};