/**
 * 模块依赖
 */

const utility = require('ibird-utils');
const errors = require('../errors');
const hooks = require('../hooks');

/**
 * 执行列表查询的路由
 * @param {string} name - 元数据名称
 * @param {Object} dataAdapter - 数据适配器
 * @param {Object} opts - 配置项
 * @param {function[]} [pres] - 前置函数组
 * @param {function[]} [posts] - 后置函数组
 */
module.exports = (name, dataAdapter, opts, pres, posts) => {
    return async function listRoute(ctx) {
        const _PAGE = 'PAGE';
        const _ALL = 'ALL';
        const _query = ctx.query;
        _query.page = parseInt(_query.page);
        _query.size = parseInt(_query.size);
        _query.range = _query.range ? _query.range.toUpperCase() : _PAGE;
        _query.sort = _query.sort || '_id';

        let _sort = utility.parse(_query.sort);
        _sort = Object.keys(_sort).length > 0 ? _sort : utility.str2Obj(_query.sort);

        let _project = utility.parse(_query.project);
        _project = Object.keys(_project).length > 0 ? _project : utility.str2Obj(_query.project);

        _query.sort = _sort;
        _query.project = _project;
        _query.cond = utility.parse(_query.cond);
        _query.page = !Number.isNaN(_query.page) && _query.page > 0 ? _query.page : 1;
        _query.size = !Number.isNaN(_query.size) && _query.size > 0 ? _query.size : 20;
        _query.range = [_ALL, _PAGE].indexOf(_query.range) >= 0 ? _query.range : _PAGE;

        try {
            let queryCache = {};
            const list = await dataAdapter.list(name, _query.cond, async (query) => {
                if (_PAGE === _query.range) query.skip((_query.page - 1) * _query.size).limit(_query.size);
                query.sort(_query.sort);
                await hooks(pres, { ctx, query });
                queryCache = query;
            }, _query.project);
            const totalrecords = await dataAdapter.count(name, queryCache._conditions);
            const totalpages = Math.ceil(totalrecords / _query.size);
            const result = {
                data: Object.assign(_query, {
                    list: list,
                    totalrecords: totalrecords,
                    totalpages: totalpages
                })
            };
            await hooks(posts, { ctx, data: result });
            ctx.body = result;
        } catch (e) {
            ctx.body = errors(e, opts.getLocaleString('mongoose_adapter_error_list'), opts);
        }
    };
};