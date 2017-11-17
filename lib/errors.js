/**
 * 模块依赖
 */

const utility = require('ibird-utils');

/**
 * 异常处理模块
 * @param {Object} err - 异常对象
 * @param {Object} opts - 配置项
 * @returns {Object}
 */
module.exports = (err, opts) => {
    const result = {
        errmsg: utility.errors(err),
        errcode: 500,
        errstack: err.stack
    };
    // 自定义异常处理器
    if (opts && typeof opts.errorHandler === 'function') {
        const data = opts.errorHandler.call(null, err);
        if (data && typeof data === 'object') {
            Object.assign(result, data);
        } else {
            result.errmsg = data;
        }
    }
    return result;
}