var i = 0;

while (i < 2) {
  if (i === 1) {
    i = i + 1;
    continue;
  }
  output(i);
  i = i + 1;
}

i = 0;

while (i < 2) {
  if (i === 1) {
    i = i + 1;
    break;
  }
  output(i);
  i = i + 1;
}
