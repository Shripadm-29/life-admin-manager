import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Reset testing library cleanup
afterEach(() => {
    cleanup();
});
