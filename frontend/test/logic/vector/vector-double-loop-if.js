var list = [10, 20, 30, 50, 40, 50];
var i = 0;
var j = 0;

for (i = 0; i < list.length; i++) {
  j = 0;
  while (j < list.length) {
    if (list[i] === list[j]) {
      output(list[i]);
    }
    j++;
  }
}
