import { visit } from 'unist-util-visit';

/**
 * Exposes a fluent api for "analyzing" an MDAST tree.
 * 
 * At the moment, it supports iterating over images and links, as well as other nodes by type. The impetus for this
 * function was twofold:
 *   1. Because the unist-util-visit visit() method is synchronous, nodes need to be "collected" and then iterated over.
 *   2. Because images and links can be specified with the "reference-style" syntax, images and links needed a common
 *      interface.
 */
export default function(tree) {
    const requisites = []; // All the unique node types that will need to be aggregated.
    const nodes = {}; // Will be populated with the nodes of each requisite type.
    const analyzers = []; // Callbacks to which to give the nodes when ready.

    function ensureRequisite(requisite) {
        if(!requisites.includes(requisite)) {
            requisites.push(requisite);
        }
    }

    function addAnalyzer(analyzer) {
        analyzers.push(analyzer);

        return this;
    }

    /**
     * Adds a basic "node analyzer," which simply analyzes nodes of a given type. For example:
     * 
     * ```
     * analysis(tree)
     *   .eachNode('paragraph', p => console.log(p.text))
     *   .doSync();
     * ```
     */
    function addNodeAnalyzer(nodeType, callback) {
        ensureRequisite(nodeType);

        addAnalyzer(async(nodes) => {
            for(const node of nodes[nodeType]) {
                await callback(node);
            }
        });

        return this;
    }

    /**
     * Adds an "image analyzer," which analyzes both `image` and `imageReference` nodes and unifies them under a single
     * interface for easy URL accessing. For example:
     * 
     * ```
     * analysis(tree)
     *   .eachImage(i => console.log(i.getUrl()))
     *   .doSync();
     * ```
     * 
     * `https://google.com` will be output when `tree` is built from either of the two following Markdown snippets:
     * 
     * ```
     * ![test](https://google.com)
     * ```
     * 
     * ```
     * ![test]
     * 
     * [test]: https://google.com
     * ```
     */
    function addImageAnalyzer(callback) {
        ensureRequisite('image');
        ensureRequisite('imageReference');
        ensureRequisite('definition');

        addAnalyzer(async(nodes) => {
            for(const node of nodes['image']) {
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

            for(const node of nodes['imageReference']) {
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

    /**
     * Adds a "link analyzer," which analyzes both `link` and `linkReference` nodes and unifies them under a single
     * interface for easy URL accessing. For example:
     * 
     * ```
     * analysis(tree)
     *   .eachLink(l => console.log(l.getUrl()))
     *   .doSync();
     * ```
     * 
     * `https://google.com` will be output when `tree` is built from either of the two following Markdown snippets:
     * 
     * ```
     * [test](https://google.com)
     * ```
     * 
     * ```
     * [test]
     * 
     * [test]: https://google.com
     * ```
     */
    function addLinkAnalyzer(callback) {
        ensureRequisite('link');
        ensureRequisite('linkReference');
        ensureRequisite('definition');

        addAnalyzer(async(nodes) => {
            for(const node of nodes['link']) {
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

            for(const node of nodes['linkReference']) {
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

    /**
     * Asynchronously performs the analysis. Analyzers may safely return promises.
     */
    async function doFunc() {
        visitAll();

        for(const analyzer of analyzers) {
            await analyzer(nodes);
        }

        return this;
    }

    /**
     * Synchronously performs the analysis. Analyzers should not return promises.
     */
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