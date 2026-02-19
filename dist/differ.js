/**
 * CDML Differ Engine
 *
 * Compares old and new CDML content to produce a structured diff.
 * Used for change detection instead of gen/retry/undo attributes.
 *
 * Algorithm:
 * 1. Parse old + new CDML with htmlparser2 + cheerio
 * 2. Walk trees in parallel, match by (parent path + tag name + sibling index)
 * 3. Compare attributes and text content
 * 4. Produce CdmlDiffResult with CdmlElementChange tree
 */
import { parseDocument } from 'htmlparser2';
import * as cheerio from 'cheerio';
/**
 * Diff two CDML documents and return structured changes.
 */
export function diffCdml(oldContent, newContent) {
    const $old = parseToDom(oldContent);
    const $new = parseToDom(newContent);
    const oldRoot = getBodyChildren($old);
    const newRoot = getBodyChildren($new);
    const changes = diffChildren($old, $new, oldRoot, newRoot, '');
    const summary = countChanges(changes);
    return {
        hasChanges: summary.added + summary.removed + summary.modified > 0,
        changes,
        summary,
    };
}
/**
 * Extract only changed elements from a diff result (flattened).
 */
export function getChangedElements(diff) {
    const changed = [];
    function collect(changes) {
        for (const change of changes) {
            if (change.type !== 'unchanged') {
                changed.push(change);
            }
            if (change.children) {
                collect(change.children);
            }
        }
    }
    collect(diff.changes);
    return changed;
}
// ─── Internal ───────────────────────────────────────────────────
function parseToDom(content) {
    const dom = parseDocument(content, {
        lowerCaseAttributeNames: false,
        lowerCaseTags: false,
        recognizeSelfClosing: true,
    });
    return cheerio.load(dom, { xmlMode: false });
}
function getBodyChildren($) {
    const elements = [];
    // Get top-level elements (inside body or root)
    const body = $('body');
    const container = body.length > 0 ? body : $('*').first();
    container.children().each((_, child) => {
        if (child.type === 'tag') {
            elements.push(child);
        }
    });
    return elements;
}
function diffChildren($old, $new, oldChildren, newChildren, parentPath) {
    const changes = [];
    const maxLen = Math.max(oldChildren.length, newChildren.length);
    for (let i = 0; i < maxLen; i++) {
        const oldChild = oldChildren[i];
        const newChild = newChildren[i];
        if (!oldChild && newChild) {
            // Added element
            changes.push(buildAddedChange($new, newChild, parentPath));
        }
        else if (oldChild && !newChild) {
            // Removed element
            changes.push(buildRemovedChange($old, oldChild, parentPath));
        }
        else if (oldChild && newChild) {
            // Both exist — compare
            if (oldChild.name !== newChild.name) {
                // Different tag names at same position = remove old + add new
                changes.push(buildRemovedChange($old, oldChild, parentPath));
                changes.push(buildAddedChange($new, newChild, parentPath));
            }
            else {
                // Same tag name — check for modifications
                changes.push(diffElement($old, $new, oldChild, newChild, parentPath));
            }
        }
    }
    return changes;
}
function diffElement($old, $new, oldEl, newEl, parentPath) {
    const tagName = newEl.name;
    const path = parentPath ? `${parentPath} > ${tagName}` : tagName;
    const oldAttrs = oldEl.attribs || {};
    const newAttrs = newEl.attribs || {};
    const oldText = getDirectText($old, oldEl);
    const newText = getDirectText($new, newEl);
    // Compare attributes
    const attrsChanged = !attrsEqual(oldAttrs, newAttrs);
    // Compare text (ignore whitespace-only differences)
    const textChanged = normalizeWhitespace(oldText) !== normalizeWhitespace(newText);
    // Diff children recursively
    const oldChildElements = getChildElements($old, oldEl);
    const newChildElements = getChildElements($new, newEl);
    const childChanges = diffChildren($old, $new, oldChildElements, newChildElements, path);
    const hasChildChanges = childChanges.some((c) => c.type !== 'unchanged');
    const type = attrsChanged || textChanged || hasChildChanges ? 'modified' : 'unchanged';
    const change = {
        type,
        tagName,
        path,
    };
    if (attrsChanged || type === 'modified') {
        change.oldAttributes = oldAttrs;
        change.newAttributes = newAttrs;
    }
    if (textChanged) {
        change.oldText = oldText;
        change.newText = newText;
    }
    if (childChanges.length > 0) {
        change.children = childChanges;
    }
    return change;
}
function buildAddedChange($, el, parentPath) {
    const tagName = el.name;
    const path = parentPath ? `${parentPath} > ${tagName}` : tagName;
    const change = {
        type: 'added',
        tagName,
        path,
        newAttributes: el.attribs || {},
        newText: getDirectText($, el),
    };
    const children = getChildElements($, el);
    if (children.length > 0) {
        change.children = children.map((child) => buildAddedChange($, child, path));
    }
    return change;
}
function buildRemovedChange($, el, parentPath) {
    const tagName = el.name;
    const path = parentPath ? `${parentPath} > ${tagName}` : tagName;
    const change = {
        type: 'removed',
        tagName,
        path,
        oldAttributes: el.attribs || {},
        oldText: getDirectText($, el),
    };
    const children = getChildElements($, el);
    if (children.length > 0) {
        change.children = children.map((child) => buildRemovedChange($, child, path));
    }
    return change;
}
// ─── Helpers ────────────────────────────────────────────────────
function getDirectText($, el) {
    let text = '';
    $(el)
        .contents()
        .each((_, child) => {
        if (child.type === 'text') {
            text += child.data || '';
        }
    });
    return text.trim();
}
function getChildElements($, el) {
    const children = [];
    $(el)
        .children()
        .each((_, child) => {
        if (child.type === 'tag') {
            children.push(child);
        }
    });
    return children;
}
function attrsEqual(a, b) {
    const keysA = Object.keys(a).sort();
    const keysB = Object.keys(b).sort();
    if (keysA.length !== keysB.length)
        return false;
    for (let i = 0; i < keysA.length; i++) {
        if (keysA[i] !== keysB[i])
            return false;
        if (a[keysA[i]] !== b[keysB[i]])
            return false;
    }
    return true;
}
function normalizeWhitespace(text) {
    return text.replace(/\s+/g, ' ').trim();
}
function countChanges(changes) {
    const summary = { added: 0, removed: 0, modified: 0, unchanged: 0 };
    function walk(items) {
        for (const item of items) {
            summary[item.type]++;
            if (item.children) {
                walk(item.children);
            }
        }
    }
    walk(changes);
    return summary;
}
//# sourceMappingURL=differ.js.map