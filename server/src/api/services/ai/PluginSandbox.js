import logger from '../../../shared/logger.js';

class PluginSandbox {
    /**
     * Wrap a plugin instance in a proxy to intercept calls and enforce permissions
     */
    wrap(instance, permissions) {
        return new Proxy(instance, {
            get: (target, prop) => {
                const original = target[prop];
                
                if (typeof original === 'function') {
                    return async (...args) => {
                        // Permission Check
                        if (prop === 'networkRequest' && !permissions.includes('NETWORK')) {
                            throw new Error(`Permission Denied: Plugin lacks NETWORK access.`);
                        }

                        logger.info(`[PluginSandbox] Intercepted call to ${prop}`);
                        return original.apply(target, args);
                    };
                }
                
                return original;
            }
        });
    }
}

export default new PluginSandbox();
