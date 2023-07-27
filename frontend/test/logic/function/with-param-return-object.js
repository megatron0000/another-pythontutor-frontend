function x() {
  return {
    a: 1,

    setA(a) {
      this.a = a;
    }
  };
}

var x1 = x();
x1.setA(10);
