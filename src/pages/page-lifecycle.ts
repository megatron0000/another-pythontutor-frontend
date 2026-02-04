export interface PageLifecycle {
  startup(): void;
  teardown(): void;
}
