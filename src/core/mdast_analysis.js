import { visit } from 'unist-util-visit';

export default function(tree) {
    const requisites = [];
    const nodes = {};
    const analyzers = [];

    function ensureRequisite(requisite) {
        if(!requisites.includes(requisite)) {
            requisites.push(requisite);
        }
    }

    function addAnalyzer(analyzer) {
        analyzers.push(analyzer);

        return this;
    }

    function addNodeAnalyzer(nodeType, callback) {
        ensureRequisite(nodeType);

        addAnalyzer(async(nodes) => {
            for (const node of nodes[nodeType]) {
                await callback(node);
            }
        });

        return this;
    }

    function addImageAnalyzer(callback) {
        ensureRequisite('image');
        ensureRequisite('imageReference');
        ensureRequisite('definition');

        addAnalyzer(async(nodes) => {
            for (const node of nodes['image']) {
                await callback({
                    node,

                    getUrl() {
                        return node.url;
                    },

                    setUrl(url) {
                        node.url = url;
                    }
                });
            }

            for (const node of nodes['imageReference']) {
                const definition = nodes['definition'].find(n => n.identifier === node.identifier);
                await callback({
                    node,
                    
                    definition,

                    getUrl() {
                        return definition.url;
                    },

                    setUrl(url) {
                        definition.url = url;
                    }
                });
            }
        });

        return this;
    }

    function addLinkAnalyzer(callback) {
        ensureRequisite('link');
        ensureRequisite('linkReference');
        ensureRequisite('definition');

        addAnalyzer(async(nodes) => {
            for (const node of nodes['link']) {
                await callback({
                    node,

                    getUrl() {
                        return node.url;
                    },

                    setUrl(url) {
                        node.url = url;
                    }
                });
            }

            for (const node of nodes['linkReference']) {
                const definition = nodes['definition'].find(n => n.identifier === node.identifier);
                await callback({
                    node,
                    
                    definition,

                    getUrl() {
                        return definition.url;
                    },

                    setUrl(url) {
                        definition.url = url;
                    }
                });
            }
        });

        return this;
    }

    function visitAll() {
        for(const requisite of requisites) {
            nodes[requisite] = [];
        }

        visit(tree, (node) => {
            for(const requisite of requisites) {
                if(node.type === requisite) {
                    nodes[requisite].push(node);
                }
            }
        });
    }

    async function doFunc() {
        visitAll();

        for(const analyzer of analyzers) {
            await analyzer(nodes);
        }

        return this;
    }

    function doSync() {
        visitAll();

        for(const analyzer of analyzers) {
            analyzer(nodes);
        }

        return this;
    }

    return {
        eachNode: addNodeAnalyzer,
        eachImage: addImageAnalyzer,
        eachLink: addLinkAnalyzer,
        do: doFunc,
        doSync
    };
}