/**
 * 模块依赖
 */

const metadata = {};
const routes = {
    list: require('./routes/list'),
    one: require('./routes/one'),
    id: require('./routes/id'),
    create: require('./routes/create'),
    update: require('./routes/update'),
    remove: require('./routes/remove'),
};

/**
 * 导出fn
 */

module.exports = fn;

/**
 * 获取默认路由中间件
 * @param {function} metadataGetter - 元数据获取器
 * @param {Object} dataAdapter - 数据适配器
 * @param {Object} opts - 选项
 */
function fn(metadataGetter, dataAdapter, opts = {}) {
    if (typeof metadataGetter !== 'function') {
        throw new Error(`'metadataGetter' must be a function.`);
    }
    if (typeof dataAdapter !== 'object') {
        throw new Error(`dataAdapter' must be an object.`);
    }
    Object.assign(metadata, metadataGetter.call(null));

    if (!opts.strategy) {
        if (opts.router) {
            opts.strategy = 'ROUTER';
        } else {
            opts.strategy = 'MIDDLEWARE';
        }
    }

    if (typeof opts.getLocaleString !== 'function') {
        opts.getLocaleString = (key) => {
            const object = {
                mongoose_adapter_error_list: '查询失败，请稍后重试',
                mongoose_adapter_error_count: '查询失败，请稍后重试',
                mongoose_adapter_error_one: '查询失败，请稍后重试',
                mongoose_adapter_error_id: '查询失败，请稍后重试',
                mongoose_adapter_error_create: '新增失败',
                mongoose_adapter_error_update: '更新失败',
                mongoose_adapter_error_remove: '删除失败',
            };
            return object[key];
        };
    }

    switch (opts.strategy) {
        case 'ROUTER':
            // 路由器挂载
            if (!opts.router) {
                throw new Error(`'router' can not be empty when using ROUTER strategy.`);
            }
            return routerStrategy(metadata, dataAdapter, opts);
        case 'MIDDLEWARE':
            // 中间件过滤
            if (opts.filter && typeof opts.filter !== 'function') {
                throw new Error(`'filter' must be a function type.`);
            }
            return middlewareStrategy(metadata, dataAdapter, opts);
            break;
    }
}

/**
 * 路由器加载策略
 * @param {Object} metadata - 元数据
 * @param {function} dataAdapter - 数据适配器
 * @param {Object} opts - 选项
 */
function routerStrategy(metadata, dataAdapter, opts) {
    const { router, routePrefix } = opts;
    for (const name in metadata) {
        const obj = metadata[name];
        let originalPath = name.toLowerCase();
        if (routePrefix) {
            routePrefix = routePrefix.startsWith('/') ? routePrefix : `/${routePrefix}`;
            originalPath = `${routePrefix}/${originalPath}`;
        } else {
            originalPath = `/${originalPath}`;
        }
        for (const key in routes) {
            let path = originalPath;
            const route = routes[key];
            const { pres, posts } = getHooks(obj, key, opts);
            const middleware = route.call(null, name, dataAdapter, opts, pres, posts);

            let method = null;
            switch (key) {
                case 'list':
                    method = 'get';
                    break;
                case 'one':
                    path = `${path}/one`;
                    method = 'get';
                    break;
                case 'id':
                    path = `${path}/:id`;
                    method = 'get';
                    break;
                case 'create':
                    method = 'post';
                    break;
                case 'update':
                    method = 'put';
                    break;
                case 'remove':
                    method = 'delete';
                    break;
            }

            if (!method) {
                continue;
            }

            router[method](path, middleware);
            if (typeof opts.onRoute === 'function') {
                opts.onRoute.call(null, { name, path, method, middleware, pres, posts });
            }
        }
    }
    return async function empty(ctx, next) {
        try {
            await next();
        } catch (err) {
            throw err;
        }
    };
}

/**
 * 中间件过滤策略
 * @param {Object} metadata - 元数据
 * @param {function} dataAdapter - 数据适配器
 * @param {Object} opts - 选项
 */
function middlewareStrategy(metadata, dataAdapter, opts) {
    opts.filter = opts.filter || defaultFilter;
    const { filter } = opts;
    return async function magic(ctx, next) {
        const { name, key } = opts.filter.call(null, ctx);
        const obj = metadata[name];
        const { pres, posts } = getHooks(obj, key);
        const route = routes[key];
        const middleware = route.call(null, name, dataAdapter, opts, pres, posts);
        try {
            if (typeof middleware === 'function') {
                await middleware.call(null, ctx, next);
            } else {
                await next();
            }
        } catch (err) {
            throw err;
        }
    }
}

/**
 * 从源数据中解析出hooks
 * @param {Object} obj - 单个元数据对象
 * @param {string} key
 * @param {Object} opts
 */
function getHooks(obj, key, opts) {
    let pres = null, posts = null;
    if (key) {
        if (obj) {
            const routeHooks = obj.routeHooks;
            if (routeHooks && routeHooks[key]) {
                if (routeHooks[key].pre) {
                    pres = Array.isArray(routeHooks[key].pre) ? routeHooks[key].pre : [routeHooks[key].pre];
                }
                if (routeHooks[key].post) {
                    posts = Array.isArray(routeHooks[key].post) ? routeHooks[key].post : [routeHooks[key].post];
                }
            }
        }
        // 添加全局hook：全局hook最先被执行
        const globalHooks = opts.globalRouteHooks || {};
        if (globalHooks[key]) {
            const globalPres = globalHooks[key].pre;
            const globalPosts = globalHooks[key].post;
            if (typeof globalPres === 'function') {
                pres = Array.isArray(pres) ? pres : [];
                pres.unshift(globalPres);
            } else if (Array.isArray(globalPres) && globalPres.length > 0) {
                pres = Array.isArray(pres) ? pres : [];
                pres = globalPres.concat(pres);
            }
            if (typeof globalPosts === 'function') {
                posts = Array.isArray(posts) ? posts : [];
                posts.unshift(globalPosts);
            } else if (Array.isArray(globalPosts) && globalPosts.length > 0) {
                posts = Array.isArray(posts) ? posts : [];
                posts = globalPosts.concat(posts);
            }
        }
    }
    return { pres, posts };
}

/**
 * 内置过滤器
 * @param {Object} ctx - koa上下文对象
 */
function defaultFilter(ctx) {
    const method = ctx.req.method.toUpperCase();
    const pathname = ctx.req._parsedUrl.pathname.toLowerCase();

    let lastIndexOf = pathname.lastIndexOf('/');
    let name = lastIndexOf >= 0 ? pathname.substring(lastIndexOf + 1) : null;
    if (name === 'one') {
        const substring = pathname.substring(0, lastIndexOf);
        lastIndexOf = substring.lastIndexOf('/');
        name = lastIndexOf >= 0 ? pathname.substring(lastIndexOf + 1) : null;
    }

    let key = null;
    switch (method) {
        case 'GET':
            const reg = new RegExp(`/\/${name}\/*\w/`);
            if (reg.test(pathname)) {
                if (pathname.endsWith('/one')) {
                    key = 'one';
                } else {
                    key = 'id';
                }
            } else {
                key = 'list';
            }
            break;
        case 'POST':
            key = 'create';
            break;
        case 'PUT':
            key = 'update';
            break;
        case 'DELETE':
            key = 'remove';
            break;
    }
    return { name, key };
}