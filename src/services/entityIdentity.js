export function sameEntityId(left, right) {
  if (left === null || left === undefined || right === null || right === undefined) return false;
  return String(left) === String(right);
}

export function findByEntityId(items = [], id) {
  return items.find(item => sameEntityId(item?.id, id));
}
