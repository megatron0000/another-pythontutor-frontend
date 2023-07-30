var list = [
  { prev: null, next: null },
  { prev: null, next: null },
  { prev: null, next: null },
  { prev: null, next: null },
  { prev: null, next: null }
];
var i = 0;

for (i = 0; i < list.length; i++) {
  if (i > 0) list[i].prev = list[i - 1];
  if (i < list.length - 1) list[i].next = list[i + 1];
}

output(list);
