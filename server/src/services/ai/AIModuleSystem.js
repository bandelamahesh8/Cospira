import logger from '../../logger.js';
import pluginSandbox from './PluginSandbox.js';

class AIModuleSystem {
    constructor() {
        this.plugins = new Map(); // pluginId -> { metadata, instance, status }
        this.availablePlugins = [
            {
                id: 'visual-processor',
                name: 'Visual Neural Engine',
                description: 'Enables image and pattern recognition for the AI Swarm.',
                version: '1.0.2',
                author: 'Cospira Labs',
                permissions: ['CAMERA', 'STORAGE']
            },
            {
                id: 'market-analyzer',
                name: 'Financial Oracle',
                description: 'Real-time market sentiment and crypto trend analysis.',
                version: '0.9.1',
                author: 'Aether Insights',
                permissions: ['NETWORK']
            }
        ];
    }

    /**
     * Load and initialize a plugin
     */
    async loadPlugin(pluginId) {
        const metadata = this.availablePlugins.find(p => p.id === pluginId);
        if (!metadata) throw new Error(`Plugin ${pluginId} not found in marketplace.`);

        logger.info(`[AIModuleSystem] Loading plugin: ${metadata.name}...`);
        
        // In a real system, we would dynamically import/eval code here.
        // For this implementation, we simulate the instance.
        const mockInstance = {
            init: async () => logger.info(`[Plugin:${pluginId}] Initialized.`),
            execute: async (data) => `Processed ${pluginId} with score 0.95`,
            shutdown: async () => logger.info(`[Plugin:${pluginId}] Shutdown complete.`)
        };

        const sandboxedInstance = pluginSandbox.wrap(mockInstance, metadata.permissions);
        await sandboxedInstance.init();

        this.plugins.set(pluginId, {
            metadata,
            instance: sandboxedInstance,
            status: 'RUNNING',
            loadTime: new Date().toISOString()
        });

        return { success: true, plugin: metadata };
    }

    async unloadPlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (plugin) {
            await plugin.instance.shutdown();
            this.plugins.delete(pluginId);
            logger.info(`[AIModuleSystem] Unloaded plugin: ${plugin.metadata.name}`);
        }
    }

    getPlugins() {
        return Array.from(this.plugins.values()).map(p => ({
            ...p.metadata,
            status: p.status,
            loadTime: p.loadTime
        }));
    }

    getMarketplace() {
        return this.availablePlugins.map(p => ({
            ...p,
            isInstalled: this.plugins.has(p.id)
        }));
    }
}

export default new AIModuleSystem();
