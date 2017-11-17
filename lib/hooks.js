/**
 * Hook处理工具
 * @param {function[]} fns - 执行函数组
 * @param {Object} data - 传递数据
 */
module.exports = async (fns, data) => {
    if (!fns) return;
    fns = Array.isArray(fns) ? fns : [fns];
    for (const fn of fns) {
        if (typeof fn !== 'function') continue;
        await fn.call(null, data);
    }
};