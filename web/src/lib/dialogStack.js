/* Tumpukan dialog terbuka: hanya yang paling atas menanggapi Esc dan Tab. */
const stack = [];

export function pushDialog(token) {
  stack.push(token);
}

export function popDialog(token) {
  const index = stack.indexOf(token);
  if (index >= 0) stack.splice(index, 1);
}

export const isTopDialog = token => stack[stack.length - 1] === token;
