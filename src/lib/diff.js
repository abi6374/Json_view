/**
 * Recursive diff engine — id-aware for arrays of objects.
 *
 * Returns a DiffResult tree:
 *   {
 *     type: 'unchanged' | 'added' | 'removed' | 'changed',
 *     key: string | number,
 *     oldValue: any,
 *     newValue: any,
 *     children: DiffResult[]   // for objects and arrays
 *   }
 */

import { resolveItemId } from './schema.js';

/**
 * Main entry point.
 * @param {any} oldVal
 * @param {any} newVal
 * @param {string|number} key
 * @returns {DiffResult}
 */
export function diffValues(oldVal, newVal, key = 'root') {
  // Treat null as a defined value (not missing)
  const oldType = classifyType(oldVal);
  const newType = classifyType(newVal);

  if (oldType === 'array' && newType === 'array') {
    return diffArrays(oldVal, newVal, key);
  }

  if (oldType === 'object' && newType === 'object') {
    return diffObjects(oldVal, newVal, key);
  }

  // Primitive or mixed-type comparison
  const equal = JSON.stringify(oldVal) === JSON.stringify(newVal);
  return {
    type: equal ? 'unchanged' : (oldVal === undefined ? 'added' : newVal === undefined ? 'removed' : 'changed'),
    key,
    oldValue: oldVal,
    newValue: newVal,
    children: [],
  };
}

function diffObjects(oldObj, newObj, key) {
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  const children = [];

  for (const k of allKeys) {
    const hasOld = Object.prototype.hasOwnProperty.call(oldObj, k);
    const hasNew = Object.prototype.hasOwnProperty.call(newObj, k);

    if (!hasOld) {
      children.push({ type: 'added', key: k, oldValue: undefined, newValue: newObj[k], children: [] });
    } else if (!hasNew) {
      children.push({ type: 'removed', key: k, oldValue: oldObj[k], newValue: undefined, children: [] });
    } else {
      children.push(diffValues(oldObj[k], newObj[k], k));
    }
  }

  const allUnchanged = children.every(c => c.type === 'unchanged');
  return {
    type: allUnchanged ? 'unchanged' : 'changed',
    key,
    oldValue: oldObj,
    newValue: newObj,
    children,
  };
}

function diffArrays(oldArr, newArr, key) {
  // Check if elements are objects (eligible for id-based matching)
  const allObjects = [...oldArr, ...newArr].every(
    item => item !== null && typeof item === 'object' && !Array.isArray(item)
  );

  if (!allObjects) {
    return diffPrimitiveArrays(oldArr, newArr, key);
  }

  // Build id maps
  const oldMap = new Map();
  const newMap = new Map();

  oldArr.forEach((item, idx) => {
    const id = resolveItemId(item, idx);
    oldMap.set(id, { item, idx, id });
  });

  newArr.forEach((item, idx) => {
    const id = resolveItemId(item, idx);
    newMap.set(id, { item, idx, id });
  });

  const children = [];
  const unmatchedOld = [];
  const unmatchedNew = [];

  // 1. Exact matches
  for (const oldItem of oldMap.values()) {
    if (newMap.has(oldItem.id)) {
      const newItem = newMap.get(oldItem.id);
      children.push(diffValues(oldItem.item, newItem.item, oldItem.id));
    } else {
      unmatchedOld.push(oldItem);
    }
  }

  for (const newItem of newMap.values()) {
    if (!oldMap.has(newItem.id)) {
      unmatchedNew.push(newItem);
    }
  }

  // 2. Pair up unmatched items (index fallback) so they render side-by-side
  const maxUnmatched = Math.max(unmatchedOld.length, unmatchedNew.length);
  for (let i = 0; i < maxUnmatched; i++) {
    const oldU = unmatchedOld[i];
    const newU = unmatchedNew[i];

    if (oldU && newU) {
      children.push(diffValues(oldU.item, newU.item, newU.id));
    } else if (oldU) {
      children.push({ type: 'removed', key: oldU.id, oldValue: oldU.item, newValue: undefined, children: [] });
    } else if (newU) {
      children.push({ type: 'added', key: newU.id, oldValue: undefined, newValue: newU.item, children: [] });
    }
  }

  const allUnchanged = children.every(c => c.type === 'unchanged');
  return {
    type: allUnchanged ? 'unchanged' : 'changed',
    key,
    oldValue: oldArr,
    newValue: newArr,
    children,
  };
}

function diffPrimitiveArrays(oldArr, newArr, key) {
  // Simple element-wise comparison for primitive arrays
  const maxLen = Math.max(oldArr.length, newArr.length);
  const children = [];

  for (let i = 0; i < maxLen; i++) {
    if (i >= oldArr.length) {
      children.push({ type: 'added', key: i, oldValue: undefined, newValue: newArr[i], children: [] });
    } else if (i >= newArr.length) {
      children.push({ type: 'removed', key: i, oldValue: oldArr[i], newValue: undefined, children: [] });
    } else {
      const equal = JSON.stringify(oldArr[i]) === JSON.stringify(newArr[i]);
      children.push({
        type: equal ? 'unchanged' : 'changed',
        key: i,
        oldValue: oldArr[i],
        newValue: newArr[i],
        children: [],
      });
    }
  }

  const allUnchanged = children.every(c => c.type === 'unchanged');
  return {
    type: allUnchanged ? 'unchanged' : 'changed',
    key,
    oldValue: oldArr,
    newValue: newArr,
    children,
  };
}

function classifyType(val) {
  if (val === null || val === undefined) return 'primitive';
  if (Array.isArray(val)) return 'array';
  if (typeof val === 'object') return 'object';
  return 'primitive';
}

/**
 * Compute a top-level diff between two full data objects.
 * Returns an object keyed by top-level section name.
 */
export function diffDocuments(oldData, newData) {
  return diffValues(oldData ?? {}, newData ?? {}, 'root');
}

/**
 * Count summary stats from a DiffResult subtree.
 */
export function countDiffStats(result) {
  let added = 0, removed = 0, changed = 0, unchanged = 0;

  function walk(node) {
    if (node.children && node.children.length > 0) {
      node.children.forEach(walk);
    } else {
      if (node.type === 'added') added++;
      else if (node.type === 'removed') removed++;
      else if (node.type === 'changed') changed++;
      else unchanged++;
    }
  }

  walk(result);
  return { added, removed, changed, unchanged };
}

/**
 * Get the diff type for a specific key path in the diff tree.
 * @param {DiffResult} diffResult
 * @param {string} key - key to look for in children
 * @returns {'unchanged'|'added'|'removed'|'changed'|null}
 */
export function getDiffTypeForKey(diffResult, key) {
  if (!diffResult || !diffResult.children) return null;
  const child = diffResult.children.find(c => String(c.key) === String(key));
  return child ? child.type : null;
}

/**
 * Find a child diff node by key.
 */
export function getDiffChild(diffResult, key) {
  if (!diffResult || !diffResult.children) return null;
  return diffResult.children.find(c => String(c.key) === String(key)) ?? null;
}
