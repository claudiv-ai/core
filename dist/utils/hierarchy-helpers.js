/**
 * Hierarchy traversal and context building utilities.
 *
 * Provides DOM navigation helpers for CDML documents.
 */
/**
 * Build full hierarchy path for an element.
 */
export function buildElementPath($, element) {
    const parts = [];
    let current = element;
    while (current && current.type === 'tag') {
        parts.unshift(current.name);
        const parent = $(current).parent();
        current = parent.length > 0 && parent[0].type === 'tag'
            ? parent[0]
            : null;
    }
    return parts.join(' > ');
}
/**
 * Build recursive parent scope chain.
 */
export function buildScopeChain($, element) {
    const scopes = [];
    let current = element;
    let level = 0;
    while (current && current.type === 'tag') {
        scopes.unshift({
            element: current.name,
            attributes: current.attribs || {},
            level,
        });
        const parent = $(current).parent();
        current = parent.length > 0 && parent[0].type === 'tag'
            ? parent[0]
            : null;
        level++;
    }
    return scopes;
}
/**
 * Get sibling elements of an element.
 */
export function getSiblingElements($, element) {
    const siblings = [];
    $(element).siblings().each((_, sibling) => {
        if (sibling.type === 'tag') {
            siblings.push(sibling);
        }
    });
    return siblings;
}
/**
 * Get child element tag names.
 */
export function getChildElementNames($, element) {
    const names = [];
    $(element).children().each((_, child) => {
        if (child.type === 'tag') {
            names.push(child.name);
        }
    });
    return names;
}
/**
 * Build an FQN string from an element's position in the DOM.
 */
export function buildFQNFromPosition($, element, projectName) {
    const parts = [];
    if (projectName) {
        parts.push(projectName);
    }
    let current = element;
    const stack = [];
    while (current && current.type === 'tag') {
        const name = current.attribs?.name || current.name;
        // Skip structural tags that aren't meaningful for FQN
        if (!['body', 'html', 'head'].includes(current.name)) {
            stack.unshift(name);
        }
        const parent = $(current).parent();
        current = parent.length > 0 && parent[0].type === 'tag'
            ? parent[0]
            : null;
    }
    parts.push(...stack);
    return parts.join(':');
}
/**
 * Extract all text content from an element (including nested tags).
 */
export function extractFullContent($, element) {
    const parts = [];
    function traverse(node) {
        $(node).contents().each((_, child) => {
            if (child.type === 'text') {
                const text = $(child).text().trim();
                if (text)
                    parts.push(text);
            }
            else if (child.type === 'tag') {
                traverse(child);
            }
        });
    }
    traverse(element);
    return parts.join('\n').trim();
}
//# sourceMappingURL=hierarchy-helpers.js.map